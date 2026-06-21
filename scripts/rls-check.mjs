// 在真库上验证 RLS 不变量（负样本）。用法：node --env-file=.env.local scripts/rls-check.mjs
// 会建临时测试用户/课程/帖子，跑完清理。不动演示数据（用 RLS_ 前缀标记）。
import { createClient } from "@supabase/supabase-js";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const admin = createClient(URL, SERVICE, { auth: { persistSession: false, autoRefreshToken: false } });

const EMAILS = {
  student: "rls-student@haoqi.test",
  teacher: "rls-teacher@haoqi.test",
  admin: "rls-admin@haoqi.test",
};
const PWD = "Rls-Test-123456";
const emails = Object.values(EMAILS);

const results = [];
function check(name, pass, detail = "") {
  results.push({ name, pass, detail });
  console.log(`${pass ? "✓" : "✗"} ${name}${detail ? "  — " + detail : ""}`);
}

async function listUserByEmail(email) {
  const { data } = await admin.auth.admin.listUsers({ perPage: 1000 });
  return data.users.find((u) => u.email === email);
}

async function cleanup() {
  await admin.from("Post").delete().in("title", ["RLS_PUB_POST", "RLS_DRAFT_POST"]);
  await admin.from("Course").delete().eq("name", "RLS_TEST_COURSE");
  await admin.from("Term").delete().eq("name", "RLS_TEST_TERM");
  await admin.from("roster").delete().in("email", emails);
  for (const e of emails) {
    const u = await listUserByEmail(e);
    if (u) await admin.auth.admin.deleteUser(u.id);
  }
}

async function userClient(email) {
  const c = createClient(URL, ANON, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error } = await c.auth.signInWithPassword({ email, password: PWD });
  if (error) throw new Error(`signin ${email}: ${error.message}`);
  return c;
}

async function main() {
  console.log("清理旧测试数据…");
  await cleanup();

  // 1) roster（角色在这里定好）
  await admin.from("roster").insert([
    { email: EMAILS.student, display_name: "RLS学生", role: "student" },
    { email: EMAILS.teacher, display_name: "RLS老师", role: "teacher" },
    { email: EMAILS.admin, display_name: "RLS管理", role: "admin" },
  ]);

  // 2) 建 auth 用户（触发器据 roster 建 profile）
  const ids = {};
  for (const [k, email] of Object.entries(EMAILS)) {
    const { data, error } = await admin.auth.admin.createUser({ email, password: PWD, email_confirm: true });
    if (error) throw new Error(`createUser ${email}: ${error.message}`);
    ids[k] = data.user.id;
  }

  // 验证触发器建好了带正确 role 的 profile
  const { data: profs } = await admin.from("profiles").select("id, role").in("id", Object.values(ids));
  check("触发器据 roster 建 profile 且角色正确", profs?.length === 3 && profs.find((p) => p.id === ids.teacher)?.role === "teacher", `${profs?.length ?? 0}/3 profiles`);

  // 3) Term + Course + 老师任课 + 帖子（service_role 直接灌，绕过 RLS）
  const { data: term } = await admin.from("Term").insert({ name: "RLS_TEST_TERM", starts_on: "2026-01-01", ends_on: "2026-06-30", is_active: false }).select().single();
  const { data: course } = await admin.from("Course").insert({ name: "RLS_TEST_COURSE", short_name: "测", term_id: term.id, owner_id: ids.teacher }).select().single();
  await admin.from("CourseMembership").insert({ course_id: course.id, user_id: ids.teacher, role: "teacher" });
  const { data: pub } = await admin.from("Post").insert({ space_type: "course", space_id: course.id, title: "RLS_PUB_POST", body_markdown: "已发布", author_id: ids.teacher, status: "published" }).select().single();
  const { data: draft } = await admin.from("Post").insert({ space_type: "course", space_id: course.id, title: "RLS_DRAFT_POST", body_markdown: "草稿", author_id: ids.teacher, status: "draft" }).select().single();

  // 客户端
  const anonC = createClient(URL, ANON, { auth: { persistSession: false, autoRefreshToken: false } });
  const studentC = await userClient(EMAILS.student);
  const teacherC = await userClient(EMAILS.teacher);

  // ===== 负样本 =====

  // A1：未登录读不到 Post（不变量 #10）
  {
    const { data, error } = await anonC.from("Post").select("id").eq("space_id", course.id);
    check("anon 读不到任何 Post", !!error || (data?.length ?? 0) === 0, error ? `被拒(${error.code})` : `读到 ${data?.length} 条`);
  }

  // S1：学生看得到 published、看不到 draft（草稿收口）
  {
    const { data } = await studentC.from("Post").select("id, status").eq("space_id", course.id);
    const seePub = data?.some((p) => p.id === pub.id);
    const seeDraft = data?.some((p) => p.id === draft.id);
    check("学生看得到已发布帖", !!seePub);
    check("学生看不到草稿帖", !seeDraft, seeDraft ? "草稿泄露!" : "");
  }

  // S2：学生不能自提 admin（最致命单点）
  {
    const { error } = await studentC.from("profiles").update({ role: "admin" }).eq("id", ids.student);
    const { data: after } = await admin.from("profiles").select("role").eq("id", ids.student).single();
    check("学生不能把自己改成 admin", after?.role === "student", `结果 role=${after?.role}`);
  }

  // S3：学生不能发帖（无越权发帖）
  {
    const { error } = await studentC.from("Post").insert({ space_type: "course", space_id: course.id, title: "RLS_HACK", author_id: ids.student, status: "published" });
    check("学生不能发 Post", !!error, error ? `被拒(${error.code})` : "竟然插进去了!");
    if (!error) await admin.from("Post").delete().eq("title", "RLS_HACK");
  }

  // S4：学生能评论已发布帖（全员可评）
  {
    const { error } = await studentC.from("Comment").insert({ post_id: pub.id, author_id: ids.student, body: "RLS 测试评论" });
    check("学生能评论已发布帖", !error, error ? `被拒(${error.code})` : "");
  }

  // S5：学生不能评论草稿帖（评论继承父帖可见性）
  {
    const { error } = await studentC.from("Comment").insert({ post_id: draft.id, author_id: ids.student, body: "评论草稿" });
    check("学生不能评论草稿帖", !!error, error ? `被拒(${error.code})` : "竟然能评!");
  }

  // T1：老师能在本人负责课发帖
  {
    const { data, error } = await teacherC.from("Post").insert({ space_type: "course", space_id: course.id, title: "RLS_TEACHER_POST", author_id: ids.teacher, status: "published" }).select().single();
    check("老师能在本人课发 Post", !error, error ? `被拒(${error.code})` : "");
    if (data) await admin.from("Post").delete().eq("id", data.id);
  }

  // T2：老师看得到本人课的草稿
  {
    const { data } = await teacherC.from("Post").select("id").eq("id", draft.id);
    check("老师看得到本人课的草稿", (data?.length ?? 0) === 1);
  }

  console.log("\n清理测试数据…");
  await cleanup();

  const failed = results.filter((r) => !r.pass);
  console.log(`\n${results.length - failed.length}/${results.length} 通过`);
  if (failed.length) {
    console.log("失败：", failed.map((f) => f.name).join("; "));
    process.exitCode = 1;
  } else {
    console.log("✅ 全部 RLS 不变量通过");
  }
}

main().catch((e) => {
  console.error("脚本错误：", e.message);
  process.exitCode = 1;
});
