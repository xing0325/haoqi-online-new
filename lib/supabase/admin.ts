import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * service-role 客户端 —— 绕过 RLS，**仅限服务端**（Server Action / Route Handler / 脚本）。
 * 绝不可 import 进任何 Client Component，否则会把 service_role key 打进浏览器 bundle。
 */
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
