// サーバーコンポーネント／Route Handlerから使うSupabaseクライアント。
// Next.jsのCookieストアと連携し、ログインセッションを読み書きする。
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/types/database";
import { getSupabaseEnv } from "./env";

export async function createClient() {
  const cookieStore = await cookies();
  const { url, anonKey } = getSupabaseEnv();

  return createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Server Component から呼ばれた場合はCookieを書き換えられないが、
          // proxy.ts側でセッションを更新しているため無視してよい。
        }
      },
    },
  });
}
