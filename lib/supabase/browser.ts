"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// 静态站的单例浏览器客户端（anon key + localStorage 会话）。安全靠数据库 RLS 兜底。
let client: SupabaseClient | null = null;

export function supabase(): SupabaseClient {
  if (!client) {
    client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } },
    );
  }
  return client;
}
