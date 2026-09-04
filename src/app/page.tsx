import { redirect } from "next/navigation";

// トップページはホーム画面へ転送する（未ログインならproxy.tsがログイン画面へ転送する）
export default function RootPage() {
  redirect("/home");
}
