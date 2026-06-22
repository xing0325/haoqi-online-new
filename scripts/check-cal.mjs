import { createClient } from "@supabase/supabase-js";
const a = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const { count: evs } = await a.from("Event").select("*", { count: "exact", head: true });
console.log("Event 总行数:", evs);
const { data } = await a
  .from("Event")
  .select("title, kind, status, starts_at, deleted_at, Calendar(name,kind,owner_id)")
  .order("created_at", { ascending: false })
  .limit(30);
for (const e of data ?? [])
  console.log(`${e.deleted_at ? "[已删]" : "      "} "${e.title}" ${e.kind}/${e.status} @${e.starts_at?.slice(0, 16)} cal=${e.Calendar?.name}`);
