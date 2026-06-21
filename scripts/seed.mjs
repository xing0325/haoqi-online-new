// 灌演示数据到真库（service_role，仅本机跑）。用法：node --env-file=.env.local scripts/seed.mjs
// 幂等：先按标记清掉旧演示数据再重灌。帖子按 RLS 由老师/管理员账号发。
import { createClient } from "@supabase/supabase-js";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const admin = createClient(URL, SERVICE, { auth: { persistSession: false, autoRefreshToken: false } });

const PWD = "haoqi2026";
const PEOPLE = [
  { email: "chichu@haoqi.online", name: "郭池晓", role: "admin" },
  { email: "kiki@haoqi.online", name: "Kiki", role: "teacher" },
  { email: "linyuan@haoqi.online", name: "林元", role: "student" },
  { email: "siqi@haoqi.online", name: "思齐", role: "student" },
  { email: "yueyue@haoqi.online", name: "岳岳", role: "student" },
];
const COURSES = [
  { short: "问", name: "问题与方法", desc: "把好奇心拆成可操作的问题。" },
  { short: "城", name: "城市漫游", desc: "把城市当成一本可以走进去的书。" },
  { short: "读", name: "阅读实验室", desc: "一起读，一起把句子划线。" },
  { short: "做", name: "做事课", desc: "把想法推进成真的东西。" },
];

const today = new Date();
const iso = (d) => d.toISOString().slice(0, 10);
const weekday = ((today.getDay() + 6) % 7) + 1; // 1=周一 .. 7=周日

async function listUserByEmail(email) {
  const { data } = await admin.auth.admin.listUsers({ perPage: 1000 });
  return data.users.find((u) => u.email === email);
}

async function cleanup() {
  // 删序：Post（评论/附件 cascade）→ ScheduleChange → ScheduleSlot → Course（成员关系 cascade）→ Term → roster → auth users
  const { data: term } = await admin.from("Term").select("id").eq("name", "2026 春季").maybeSingle();
  if (term) {
    const { data: cs } = await admin.from("Course").select("id").eq("term_id", term.id);
    const ids = (cs ?? []).map((c) => c.id);
    if (ids.length) {
      await admin.from("Post").delete().in("space_id", ids); // Post.space_id 无 FK，按课程 id 手删
      const { data: slots } = await admin.from("ScheduleSlot").select("id").in("course_id", ids);
      const slotIds = (slots ?? []).map((s) => s.id);
      if (slotIds.length) await admin.from("ScheduleChange").delete().in("slot_id", slotIds);
    }
    await admin.from("ScheduleSlot").delete().eq("term_id", term.id);
    await admin.from("Course").delete().eq("term_id", term.id);
    await admin.from("Term").delete().eq("id", term.id);
  }
  await admin.from("roster").delete().in("email", PEOPLE.map((p) => p.email));
  for (const p of PEOPLE) {
    const u = await listUserByEmail(p.email);
    if (u) await admin.auth.admin.deleteUser(u.id);
  }
}

async function main() {
  console.log("清理旧演示数据…");
  await cleanup();

  // 1) roster + 用户
  await admin.from("roster").insert(PEOPLE.map((p) => ({ email: p.email, display_name: p.name, role: p.role })));
  const id = {};
  for (const p of PEOPLE) {
    const { data, error } = await admin.auth.admin.createUser({ email: p.email, password: PWD, email_confirm: true });
    if (error) throw new Error(`createUser ${p.email}: ${error.message}`);
    id[p.email] = data.user.id;
  }
  console.log(`建了 ${PEOPLE.length} 个账号`);

  // 2) Term
  const { data: term } = await admin.from("Term").insert({ name: "2026 春季", starts_on: "2026-02-24", ends_on: "2026-06-30", is_active: true }).select().single();

  // 3) Courses（owner = Kiki）
  const course = {};
  for (const c of COURSES) {
    const { data } = await admin.from("Course").insert({ name: c.name, short_name: c.short, description: c.desc, term_id: term.id, owner_id: id["kiki@haoqi.online"] }).select().single();
    course[c.short] = data.id;
  }

  // 4) 成员关系：Kiki 任教全部；学生加入全部
  const memberships = [];
  for (const c of COURSES) {
    memberships.push({ course_id: course[c.short], user_id: id["kiki@haoqi.online"], role: "teacher" });
    for (const s of ["linyuan@haoqi.online", "siqi@haoqi.online", "yueyue@haoqi.online"]) {
      memberships.push({ course_id: course[c.short], user_id: id[s], role: "member" });
    }
    memberships.push({ course_id: course[c.short], user_id: id["chichu@haoqi.online"], role: "member" });
  }
  await admin.from("CourseMembership").insert(memberships);

  // 5) 课表（一周网格）
  const slots = [
    { weekday: 1, starts_at: "09:00", ends_at: "10:30", course_id: course["问"], slot_kind: "required" },
    { weekday: 1, starts_at: "14:00", ends_at: "16:00", course_id: course["城"], slot_kind: "required" },
    { weekday: 2, starts_at: "09:00", ends_at: "10:30", course_id: course["读"], slot_kind: "required" },
    { weekday: 2, starts_at: "14:00", ends_at: "15:00", course_id: null, slot_kind: "large_elective" },
    { weekday: 3, starts_at: "09:00", ends_at: "10:30", course_id: course["问"], slot_kind: "required" },
    { weekday: 3, starts_at: "14:00", ends_at: "16:00", course_id: course["城"], slot_kind: "required" },
    { weekday: 3, starts_at: "19:30", ends_at: "20:30", course_id: null, slot_kind: "free" },
    { weekday: 4, starts_at: "14:00", ends_at: "16:00", course_id: course["做"], slot_kind: "required" },
    { weekday: 5, starts_at: "09:00", ends_at: "10:00", course_id: null, slot_kind: "small_elective" },
    { weekday: 5, starts_at: "14:00", ends_at: "16:00", course_id: course["读"], slot_kind: "required" },
  ].map((s) => ({ ...s, term_id: term.id }));
  const { data: insertedSlots } = await admin.from("ScheduleSlot").insert(slots).select();

  // 6) 今天的一条调课（若今天有「城市漫游」时段）
  const walkToday = insertedSlots.find((s) => s.weekday === weekday && s.course_id === course["城"]);
  if (walkToday) {
    await admin.from("ScheduleChange").insert({
      slot_id: walkToday.id,
      occurs_on: iso(today),
      change_type: "location",
      message: "今天 14:00 的「城市漫游」改到 2F 天台集合，记得带一件防晒的东西。",
      new_location: "2F 天台",
      published_by: id["kiki@haoqi.online"],
    });
  }

  // 7) 帖子（按 RLS 由 Kiki 发）+ 评论（学生发）
  const POSTS = [
    { course: "问", title: "今天的怪问题收集：什么是“有用”的学习？", body: "如果一个知识暂时不能兑换成任何东西，它还算有用吗？\n\n先别急着回答。下午带着一个**反例**来——一个你觉得“没用但舍不得扔”的知识。", status: "published",
      comments: [["linyuan@haoqi.online", "我带了：背圆周率。完全没用，但背的时候很爽。"], ["siqi@haoqi.online", "那“爽”算不算一种用？"]] },
    { course: "城", title: "去天台之前，先看这 6 张照片", body: "一份关于“城市缝隙”的观察作业。\n\n注意那些**不被设计**的地方：空调外机之间、楼梯转角、招牌背面。", status: "published",
      comments: [["yueyue@haoqi.online", "第三张那个缝里居然有人种了葱。"]] },
    { course: "读", title: "本周共读：第 4 章的那段下划线", body: "“我们以为自己在寻找答案，实际上是在寻找一种能陪伴问题的方式。”\n\n把你被击中的一句也贴上来。", status: "published", comments: [] },
    { course: "做", title: "做事课开工：这周一起把地图推进 30%", body: "看板已经摆好，挑一个你想认领的卡片：\n\n- 调研：“不游客”到底是什么\n- 外出：拍下第一次去也会迷路的巷子\n- 设计：地图图例第一稿", status: "published",
      comments: [["chichu@haoqi.online", "我认领图例设计。"]] },
    { course: "问", title: "[草稿] 下周方法论提纲", body: "还没写完，先占个位。", status: "draft", comments: [] },
  ];
  let pub = 0, draft = 0;
  for (const p of POSTS) {
    const { data: post } = await admin.from("Post").insert({
      space_type: "course", space_id: course[p.course], title: p.title, body_markdown: p.body, author_id: id["kiki@haoqi.online"], status: p.status,
    }).select().single();
    if (p.status === "published") pub++; else draft++;
    for (const [email, body] of p.comments) {
      await admin.from("Comment").insert({ post_id: post.id, author_id: id[email], body });
    }
  }

  console.log(`\n✅ 种子完成：${PEOPLE.length} 用户 / ${COURSES.length} 课 / ${insertedSlots.length} 时段 / ${pub} 已发布帖 + ${draft} 草稿`);
  console.log(`今天(周${weekday})${walkToday ? "有" : "无"}调课`);
  console.log("\n登录账号（邮箱+密码，密码都是 " + PWD + "）：");
  for (const p of PEOPLE) console.log(`  ${p.role.padEnd(7)} ${p.email}  （${p.name}）`);
}

main().catch((e) => {
  console.error("种子失败：", e.message);
  process.exitCode = 1;
});
