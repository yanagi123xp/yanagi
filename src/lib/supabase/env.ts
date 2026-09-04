// Supabaseの接続情報（URL・匿名キー）を.env.localから読み込むための共通処理。
// 値が設定されていない場合は、開発者にわかりやすいエラーメッセージを出す。

export function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Supabaseの環境変数が設定されていません。.env.local に NEXT_PUBLIC_SUPABASE_URL と NEXT_PUBLIC_SUPABASE_ANON_KEY を設定してください（.env.local.example を参照）。"
    );
  }

  return { url, anonKey };
}
