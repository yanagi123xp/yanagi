// Next.js 16では middleware.ts は非推奨となり proxy.ts に名称変更された。
// 全リクエストの前段でSupabaseのログインセッション（Cookie）を更新し、
// 未ログインユーザーが認証必須ページへアクセスした場合はログイン画面へ転送する。
import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getSupabaseEnv } from "@/lib/supabase/env";

// ログイン不要でアクセスできるパス
const PUBLIC_PATHS = ["/login", "/auth/callback"];

export async function proxy(request: NextRequest) {
  const response = NextResponse.next({ request });

  const { url, anonKey } = getSupabaseEnv();

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // セッションの有効期限が切れていれば自動でリフレッシュされる
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isPublicPath = PUBLIC_PATHS.some((path) => pathname.startsWith(path));

  if (!user && !isPublicPath) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  if (user && pathname === "/login") {
    const homeUrl = new URL("/home", request.url);
    return NextResponse.redirect(homeUrl);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * 以下を除く全リクエストにマッチ:
     * - _next/static, _next/image (静的ファイル)
     * - favicon.ico, manifestなどのPWA関連ファイル
     */
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|icons/|sw.js).*)",
  ],
};
