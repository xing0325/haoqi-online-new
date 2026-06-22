// 重复事件真库验证：schema 约束 + 触发器冻结 + RLS 负样本。
// 用法：node --env-file=.env.local scripts/recurring-smoke.mjs
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

await lin.c.from("Calendar").delete().eq("owner_id", lin.uid).eq("name", "RECUR_SMOKE");
const { data: cal } = await lin.c
  .from("Calendar")
  .insert({ owner_id: lin.uid, name: "RECUR_SMOKE", kind: "personal", color: "#5b9be0" })
  .select()
  .single();

const dt = "2026-09-02T11:00:00.000Z"; // 周三 19:00（北京）
const dtEnd = "2026-09-02T12:00:00.000Z";
const occ1 = "2026-09-09T11:00:00.000Z";
const occ2 = "2026-09-16T11:00:00.000Z";

// 1. 建母事件（rrule）
const { data: master, error: me } = await lin.c
  .from("Event")
  .insert({ calendar_id: cal.id, title: "RECUR_MASTER", starts_at: dt, ends_at: dtEnd, created_by: lin.uid, rrule: "FREQ=WEEKLY;BYDAY=WE" })
  .select()
  .single();
ok("建重复母事件", !me && master?.rrule === "FREQ=WEEKLY;BYDAY=WE", me?.message);

// 2. override 子行（改一次：移到周四）
const { data: ov, error: oe } = await lin.c
  .from("Event")
  .insert({
    calendar_id: cal.id,
    title: "OVERRIDE",
    starts_at: "2026-09-10T11:00:00.000Z",
    ends_at: "2026-09-10T12:00:00.000Z",
    created_by: lin.uid,
    series_id: master.id,
    occurrence_start: occ1,
  })
  .select()
  .single();
ok("建 override 子行（改一次）", !oe && !!ov, oe?.message);

// 3. exception 子行（删一次：cancelled）
const { error: xe } = await lin.c.from("Event").insert({
  calendar_id: cal.id,
  title: "CANCEL",
  starts_at: occ2,
  ends_at: "2026-09-16T12:00:00.000Z",
  status: "cancelled",
  created_by: lin.uid,
  series_id: master.id,
  occurrence_start: occ2,
});
ok("建 exception(cancelled) 子行（删一次）", !xe, xe?.message);

// 4. 约束：series_id 有但 occurrence_start 空 → 拒
const { error: pe } = await lin.c
  .from("Event")
  .insert({ calendar_id: cal.id, title: "BAD", starts_at: dt, ends_at: dtEnd, created_by: lin.uid, series_id: master.id });
ok("series_id 无 occurrence_start 被约束拒", !!pe, pe ? "已拒" : "竟然成功");

// 5. 约束：rrule + series_id 同时 → 拒
const { error: ce2 } = await lin.c.from("Event").insert({
  calendar_id: cal.id,
  title: "BAD2",
  starts_at: dt,
  ends_at: dtEnd,
  created_by: lin.uid,
  rrule: "FREQ=DAILY",
  series_id: master.id,
  occurrence_start: "2026-09-23T11:00:00.000Z",
});
ok("母事件不能同时是子行 被约束拒", !!ce2, ce2 ? "已拒" : "竟然成功");

// 6. 唯一：同 (series_id, occurrence_start) 第二条 → 拒
const { error: du } = await lin.c
  .from("Event")
  .insert({ calendar_id: cal.id, title: "DUP", starts_at: dt, ends_at: dtEnd, created_by: lin.uid, series_id: master.id, occurrence_start: occ1 });
ok("同一次覆盖唯一 被拒", !!du, du ? "已拒" : "竟然成功");

// 7. 触发器：改 occurrence_start → 拒
const { error: te } = await lin.c.from("Event").update({ occurrence_start: occ2 }).eq("id", ov.id);
ok("改 occurrence_start 被触发器拒", !!te, te ? "已拒" : "竟然成功");

// 8. 系列封口（split 第一步）：改 rrule 加 UNTIL → 允许
const { error: re } = await lin.c
  .from("Event")
  .update({ rrule: "FREQ=WEEKLY;BYDAY=WE;UNTIL=20260909T110000Z", recur_until: "2026-09-09T11:00:00.000Z" })
  .eq("id", master.id);
ok("系列封口(改 rrule) 允许", !re, re?.message);

// 9. RLS：siqi 往 lin 系列加 override → 拒
const { error: hi } = await siqi.c.from("Event").insert({
  calendar_id: cal.id,
  title: "HACK",
  starts_at: dt,
  ends_at: dtEnd,
  created_by: siqi.uid,
  series_id: master.id,
  occurrence_start: "2026-09-30T11:00:00.000Z",
});
ok("跨用户给他人系列加子行被拒", !!hi, hi ? "已拒" : "竟然成功");

// 10. RLS：siqi 改 lin 母事件 → 改不到行
const { data: hu, error: hue } = await siqi.c.from("Event").update({ title: "HACKED" }).eq("id", master.id).select();
ok("跨用户改他人母事件无效", !!hue || (hu ?? []).length === 0, hue ? "已拒" : `改到 ${hu?.length ?? 0} 行`);

await lin.c.from("Calendar").delete().eq("id", cal.id);

const total = 10;
console.log(`\n${total - fails.length}/${total} 通过`);
if (fails.length) {
  console.log("失败：", fails.join("; "));
  process.exitCode = 1;
}
