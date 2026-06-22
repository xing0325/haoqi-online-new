// 个人任务表真库验证：CRUD + RLS 负样本。用法：node --env-file=.env.local scripts/tasks-smoke.mjs
import { createClient } from "@supabase/supabase-js";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const PWD = "haoqi2026";
const fails = [];
const ok = (n, c, d = "") => {
  console.log(`${c ? "✓" : "✗"} ${n}${d ? "  — " + d : ""}`);
  if (!c) fails.push(n);
};
async function userClient(email) {
  const c = createClient(URL, ANON, { auth: { persistSession: false } });
  const { error } = await c.auth.signInWithPassword({ email, password: PWD });
  if (error) throw new Error(`signin ${email}: ${error.message}`);
  const { data } = await c.auth.getUser();
  return { c, uid: data.user.id };
}

const lin = await userClient("linyuan@haoqi.online");
const siqi = await userClient("siqi@haoqi.online");

await lin.c.from("Task").delete().eq("owner_id", lin.uid).like("title", "SMOKE_%");

const { data: t, error: ce } = await lin.c
  .from("Task")
  .insert({ owner_id: lin.uid, title: "SMOKE_写稿", due_at: new Date(Date.now() + 3600e3).toISOString() })
  .select()
  .single();
ok("建任务", !ce && !!t, ce?.message);

const { data: mine } = await lin.c.from("Task").select("id").is("deleted_at", null).eq("owner_id", lin.uid);
ok("读自己任务", (mine ?? []).some((x) => x.id === t.id));

const { error: ue } = await lin.c.from("Task").update({ status: "done" }).eq("id", t.id);
ok("标完成", !ue, ue?.message);

// 关联事件：建个日历+事件，挂到任务
const { data: cal } = await lin.c.from("Calendar").select("id").eq("owner_id", lin.uid).eq("kind", "personal").limit(1).maybeSingle();
let linked = false;
if (cal) {
  const s = new Date(Date.now() + 7200e3).toISOString();
  const { data: ev } = await lin.c
    .from("Event")
    .insert({ calendar_id: cal.id, title: "SMOKE_排期块", starts_at: s, ends_at: s, created_by: lin.uid, kind: "timeblock" })
    .select()
    .single();
  if (ev) {
    const { error } = await lin.c.from("Task").update({ scheduled_event_id: ev.id }).eq("id", t.id);
    linked = !error;
    await lin.c.from("Event").update({ deleted_at: new Date().toISOString() }).eq("id", ev.id);
  }
}
ok("任务挂到日历事件(scheduled_event_id)", linked);

// RLS 负样本
const { data: cross } = await siqi.c.from("Task").select("id").eq("id", t.id);
ok("跨用户读不到他人任务", (cross ?? []).length === 0);

const { error: xi } = await siqi.c.from("Task").insert({ owner_id: lin.uid, title: "HACK" });
ok("跨用户冒充 owner 建任务被拒", !!xi, xi ? "已拒" : "竟然成功");

const { data: xu } = await siqi.c.from("Task").update({ title: "HACKED" }).eq("id", t.id).select();
ok("跨用户改他人任务无效", (xu ?? []).length === 0);

await lin.c.from("Task").delete().eq("id", t.id);
const total = 7;
console.log(`\n${total - fails.length}/${total} 通过`);
if (fails.length) {
  console.log("失败：", fails.join("; "));
  process.exitCode = 1;
}
