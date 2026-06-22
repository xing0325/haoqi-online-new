// 给 chichu 灌一条每周重复 demo 事件，验证 UI 读取+展开+渲染路径。幂等。
// 用法：node --env-file=.env.local scripts/seed-recur-demo.mjs
import { createClient } from "@supabase/supabase-js";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const c = createClient(URL, ANON, { auth: { persistSession: false } });
const { error: se } = await c.auth.signInWithPassword({ email: "chichu@haoqi.online", password: "haoqi2026" });
if (se) throw new Error(se.message);
const { data: u } = await c.auth.getUser();
const uid = u.user.id;

// 确保有私人日历
let { data: cals } = await c.from("Calendar").select("id,kind,name").eq("owner_id", uid);
let personal = (cals ?? []).find((x) => x.kind === "personal");
if (!personal) {
  const { data } = await c.from("Calendar").insert({ owner_id: uid, name: "私人", kind: "personal", color: "#5b9be0" }).select().single();
  personal = data;
}

const TITLE = "每周·团队站会（重复 demo）";
// 幂等：删旧
await c.from("Event").update({ deleted_at: new Date().toISOString() }).eq("calendar_id", personal.id).eq("title", TITLE);

// 母事件：每周（从 2026-06-03 19:00 北京 起）
const { data: ev, error: ee } = await c
  .from("Event")
  .insert({
    calendar_id: personal.id,
    title: TITLE,
    starts_at: "2026-06-03T11:00:00.000Z",
    ends_at: "2026-06-03T11:30:00.000Z",
    created_by: uid,
    rrule: "FREQ=WEEKLY",
    recur_until: null,
  })
  .select()
  .single();
if (ee) throw new Error(ee.message);
console.log("✓ 已灌每周重复 demo:", ev.id, "→ 私人日历", personal.id);
