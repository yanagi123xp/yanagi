"use client";

// ログイン／新規登録画面。
// このアプリは「自分専用」の給与管理アプリのため、招待制のような使い方を想定し、
// メールアドレス＋パスワードのシンプルな認証のみを提供する。
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);
    setInfoMessage(null);

    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setErrorMessage(translateAuthError(error.message));
        setLoading(false);
        return;
      }
      router.push("/home");
      router.refresh();
    } else {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) {
        setErrorMessage(translateAuthError(error.message));
        setLoading(false);
        return;
      }
      setInfoMessage(
        "確認メールを送信しました（メール確認が無効な設定の場合はそのままログインできます）。届いたメールのリンクを開いてから、ログインしてください。"
      );
      setMode("login");
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex flex-col justify-center px-6 py-12 safe-top safe-bottom">
      <div className="mx-auto w-full max-w-sm">
        <div className="mb-10 text-center">
          <h1 className="text-2xl font-bold text-gray-900">給与管理</h1>
          <p className="mt-2 text-sm text-muted">
            毎月の給与を記録して、手取り・年収をかんたん管理
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              メールアドレス
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-2xl border border-card-border px-4 py-3 text-base focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              パスワード
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="6文字以上"
              className="w-full rounded-2xl border border-card-border px-4 py-3 text-base focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
            />
          </div>

          {errorMessage && (
            <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-negative">
              {errorMessage}
            </p>
          )}
          {infoMessage && (
            <p className="rounded-xl bg-blue-50 px-4 py-3 text-sm text-accent">
              {infoMessage}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-accent px-4 py-3 text-base font-semibold text-white transition active:scale-[0.98] disabled:opacity-60"
          >
            {loading ? "処理中..." : mode === "login" ? "ログイン" : "新規登録"}
          </button>
        </form>

        <button
          type="button"
          onClick={() => {
            setMode(mode === "login" ? "signup" : "login");
            setErrorMessage(null);
            setInfoMessage(null);
          }}
          className="mt-6 w-full text-center text-sm text-muted"
        >
          {mode === "login"
            ? "アカウントをお持ちでない方はこちら（新規登録）"
            : "すでにアカウントをお持ちの方はこちら（ログイン）"}
        </button>
      </div>
    </main>
  );
}

function translateAuthError(message: string): string {
  if (message.includes("Invalid login credentials")) {
    return "メールアドレスまたはパスワードが正しくありません。";
  }
  if (message.includes("User already registered")) {
    return "このメールアドレスは既に登録されています。ログインしてください。";
  }
  if (message.includes("Password should be at least")) {
    return "パスワードは6文字以上で入力してください。";
  }
  return message;
}
