// 给演示账号灌一些私人/工作日历事件（让日历非空、有可拖的东西）。
// 用法：node --env-file=.env.local scripts/seed-events.mjs
import { createClient } from "@supabase/supabase-js";
const a = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

async function uid(email) {
  const { data } = await a.auth.admin.listUsers({ perPage: 1000 });
  return data.users.find((u) => u.email === email)?.id;
}
async function ensureCals(owner) {
  const { data } = await a.from("Calendar").select("id, kind").eq("owner_id", owner);
  const m = {};
  for (const c of data ?? []) m[c.kind] = c.id;
  const ins = [];
  if (!m.personal) ins.push({ owner_id: owner, name: "私人", kind: "personal", color: "#5b9be0" });
  if (!m.work) ins.push({ owner_id: owner, name: "工作", kind: "work", color: "#ef785e" });
  if (ins.length) {
    const { data: created } = await a.from("Calendar").insert(ins).select();
    for (const c of created ?? []) m[c.kind] = c.id;
  }
  return m;
}
function at(dayOffset, h, m) {
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  d.setHours(h, m, 0, 0);
  return d.toISOString();
}

for (const email of ["chichu@haoqi.online", "linyuan@haoqi.online", "siqi@haoqi.online"]) {
  const owner = await uid(email);
  if (!owner) {
    console.log(email, "无此用户，跳过");
    continue;
  }
  const cal = await ensureCals(owner);
  await a.from("Event").delete().in("calendar_id", [cal.personal, cal.work]).like("title", "【演示】%");
  const evs = [
    { calendar_id: cal.personal, title: "【演示】写毕业旅行预算", starts_at: at(0, 16, 0), ends_at: at(0, 17, 30), kind: "timeblock" },
    { calendar_id: cal.personal, title: "【演示】陶艺课", starts_at: at(1, 19, 0), ends_at: at(1, 21, 0), kind: "event" },
    { calendar_id: cal.work, title: "【演示】成都地图项目 站会", starts_at: at(0, 11, 0), ends_at: at(0, 11, 30), kind: "event" },
    { calendar_id: cal.work, title: "【演示】剪视频", starts_at: at(-1, 14, 0), ends_at: at(-1, 16, 0), kind: "timeblock", status: "done" },
  ].map((e) => ({ ...e, status: e.status ?? "confirmed", created_by: owner }));
  const { error } = await a.from("Event").insert(evs);
  console.log(email, error ? "失败:" + error.message : `灌了 ${evs.length} 条`);
}
console.log("done");
