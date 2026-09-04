"use client";

// ブラウザ（クライアントコンポーネント）から使うSupabaseクライアント。
// ログイン状態はCookie経由でサーバー側とも共有される。
import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database";
import { getSupabaseEnv } from "./env";

export function createClient() {
  const { url, anonKey } = getSupabaseEnv();
  return createBrowserClient<Database>(url, anonKey);
}
