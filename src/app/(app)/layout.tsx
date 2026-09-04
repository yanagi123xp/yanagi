import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SalaryDataProvider } from "@/context/SalaryDataContext";
import BottomNav from "@/components/BottomNav";

// ログインが必要な画面（ホーム／履歴／登録／分析／設定）共通のレイアウト。
// proxy.ts でも未ログイン時のリダイレクトを行っているが、
// サーバーコンポーネント側でも二重にチェックすることで安全性を高めている。
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <SalaryDataProvider>
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col bg-white">
        <div className="flex-1 px-4 pb-24 pt-6 safe-top">{children}</div>
        <BottomNav />
      </div>
    </SalaryDataProvider>
  );
}
