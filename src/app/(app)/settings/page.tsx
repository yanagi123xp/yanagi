"use client";

// 設定画面：ログインユーザー情報の表示、CSVエクスポート、ログアウト。
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useSalaryData } from "@/context/SalaryDataContext";
import Card from "@/components/Card";
import { buildSalaryCsv, downloadCsv } from "@/lib/salary/csv";

export default function SettingsPage() {
  const router = useRouter();
  const supabase = createClient();
  const { records, user } = useSalaryData();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  function handleExportCsv() {
    if (records.length === 0) {
      alert("エクスポートできる給与データがありません。");
      return;
    }
    const csv = buildSalaryCsv(records);
    const today = new Date().toISOString().slice(0, 10);
    downloadCsv(`salary_${today}.csv`, csv);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-bold text-gray-900">設定</h1>

      <Card>
        <p className="text-xs text-muted">ログイン中のアカウント</p>
        <p className="mt-1 break-all text-base font-semibold text-gray-900">
          {user?.email ?? "―"}
        </p>
      </Card>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-gray-700">データ出力</h2>
        <button
          type="button"
          onClick={handleExportCsv}
          className="w-full rounded-2xl border border-card-border bg-white px-4 py-3 text-left font-medium text-gray-900"
        >
          給与履歴をCSVでエクスポート
        </button>
      </section>

      <section>
        <button
          type="button"
          onClick={handleLogout}
          className="w-full rounded-2xl border border-negative px-4 py-3 text-center font-semibold text-negative"
        >
          ログアウト
        </button>
      </section>
    </div>
  );
}
