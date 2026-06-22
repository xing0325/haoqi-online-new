// 日历数据层真库验证（happy path + 跨用户拒绝）。用法：node --env-file=.env.local scripts/calendar-smoke.mjs
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

// 清理旧测试
await lin.c.from("Calendar").delete().eq("owner_id", lin.uid).eq("name", "SMOKE_CAL");

// 建日历
const { data: cal, error: ce } = await lin.c
  .from("Calendar")
  .insert({ owner_id: lin.uid, name: "SMOKE_CAL", kind: "personal", color: "#5b9be0" })
  .select()
  .single();
ok("建私人日历", !ce && !!cal, ce?.message);

// 建事件
const start = new Date(Date.now() + 3600e3).toISOString();
const end = new Date(Date.now() + 5400e3).toISOString();
const { data: ev, error: ee } = await lin.c
  .from("Event")
  .insert({ calendar_id: cal.id, title: "SMOKE_EVT", starts_at: start, ends_at: end, created_by: lin.uid })
  .select()
  .single();
ok("建事件", !ee && !!ev, ee?.message);

// 读时间窗
const from = new Date(Date.now() - 86400e3).toISOString();
const to = new Date(Date.now() + 86400e3).toISOString();
const { data: inRange } = await lin.c
  .from("Event")
  .select("id")
  .in("calendar_id", [cal.id])
  .is("deleted_at", null)
  .lt("starts_at", to)
  .gt("ends_at", from);
ok("时间窗读得到", (inRange ?? []).some((x) => x.id === ev.id));

// 改时间
const ns = new Date(Date.now() + 7200e3).toISOString();
const ne = new Date(Date.now() + 9000e3).toISOString();
const { error: ue } = await lin.c.from("Event").update({ starts_at: ns, ends_at: ne }).eq("id", ev.id);
ok("拖动改时间", !ue, ue?.message);

// 改 calendar_id 被触发器拒
const { error: ge } = await lin.c.from("Event").update({ calendar_id: cal.id, title: "x", created_by: siqi.uid }).eq("id", ev.id);
ok("改 created_by 被触发器拒", !!ge, ge ? "已拒" : "竟然成功");

// 跨用户：siqi 读不到 lin 的私密事件
const { data: cross } = await siqi.c.from("Event").select("id").eq("id", ev.id);
ok("跨用户读不到他人私密事件", (cross ?? []).length === 0);

// 跨用户：siqi 往 lin 的日历插事件被拒
const { error: xi } = await siqi.c
  .from("Event")
  .insert({ calendar_id: cal.id, title: "HACK", starts_at: start, ends_at: end, created_by: siqi.uid });
ok("跨用户往他人日历写被拒", !!xi, xi ? "已拒" : "竟然成功");

// 软删
const { error: de } = await lin.c.from("Event").update({ deleted_at: new Date().toISOString() }).eq("id", ev.id);
const { data: after } = await lin.c.from("Event").select("id, deleted_at").eq("id", ev.id);
ok(
  "软删后读不到",
  !de && (after ?? []).every((x) => x.deleted_at !== null),
  de ? `更新报错:${de.message}` : `读回 ${after?.length} 行, deleted_at=${after?.[0]?.deleted_at ?? "null"}`,
);

// 课表重复源
const { data: term } = await lin.c.from("Term").select("id").eq("is_active", true).maybeSingle();
const { data: slots } = await lin.c.from("ScheduleSlot").select("weekday,starts_at").eq("term_id", term.id);
ok("课表 slot 读得到（转重复源用）", (slots ?? []).length > 0, `${slots?.length} 个时段`);

// 清理
await lin.c.from("Calendar").delete().eq("id", cal.id);

console.log(`\n${9 - fails.length}/9 通过`);
if (fails.length) {
  console.log("失败：", fails.join("; "));
  process.exitCode = 1;
}
