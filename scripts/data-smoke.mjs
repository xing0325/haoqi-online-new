// 以学生身份跑 data.ts 的关键查询，确认真数据能按 RLS 返回。
// 用法：node --env-file=.env.local scripts/data-smoke.mjs
import { createClient } from "@supabase/supabase-js";

const c = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
});

const { error: e } = await c.auth.signInWithPassword({ email: "linyuan@haoqi.online", password: "haoqi2026" });
if (e) {
  console.error("登录失败：", e.message);
  process.exit(1);
}
console.log("✓ 学生登录成功\n");

const { data: courses } = await c.from("Course").select("id,name").order("created_at");
console.log("课程:", courses?.length, "—", courses?.map((x) => x.name).join(" / "));

const { data: term } = await c.from("Term").select("id").eq("is_active", true).maybeSingle();
const weekday = ((new Date().getDay() + 6) % 7) + 1;
const today = new Date().toISOString().slice(0, 10);
const { data: slots } = await c.from("ScheduleSlot").select("id,starts_at,course_id").eq("term_id", term.id).eq("weekday", weekday).order("starts_at");
console.log(`今天(周${weekday})时段:`, slots?.length);
const { data: changes } = await c.from("ScheduleChange").select("message").in("slot_id", (slots ?? []).map((s) => s.id)).eq("occurs_on", today).is("deleted_at", null);
console.log("今天调课:", changes?.length, changes?.[0]?.message?.slice(0, 24) ?? "");

const { data: feed, error: fe } = await c
  .from("Post")
  .select("id,space_id,title,published_at,Comment(count)")
  .eq("status", "published").eq("space_type", "course").is("deleted_at", null)
  .order("published_at", { ascending: false }).limit(8);
if (fe) console.log("feed 错误:", fe.message);
console.log("\n已发布动态:", feed?.length);
for (const p of feed ?? []) console.log(`  · ${p.title}  [评论 ${p.Comment?.[0]?.count ?? "?"}]`);
console.log("草稿是否泄露给学生:", (feed ?? []).some((p) => p.title.includes("草稿")) ? "❌ 是" : "✓ 否");

const pid = feed?.[0]?.id;
const { data: post } = await c.from("Post").select("title,author:profiles(display_name)").eq("id", pid).maybeSingle();
console.log("\n详情页作者:", post?.author?.display_name);
const { data: comments } = await c.from("Comment").select("body,author:profiles(display_name)").eq("post_id", pid).is("deleted_at", null);
console.log("评论:", comments?.length, "—", (comments ?? []).map((x) => `${x.author?.display_name}：${x.body.slice(0, 10)}`).join(" / "));
