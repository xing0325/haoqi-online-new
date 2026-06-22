import { createClient } from "@supabase/supabase-js";
const a = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const { count } = await a.from("Event").delete({ count: "exact" }).eq("title", "ll");
console.log("deleted 'll' junk events:", count);
