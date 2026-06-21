import { createBrowserClient } from "@supabase/ssr";

/** 浏览器 / Client Component 用的 Supabase 客户端（anon key，受 RLS 约束）。 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
