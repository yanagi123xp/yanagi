"use client";

// 設定画面：CSV/JSONエクスポート、バックアップからの復元、全データ削除。
// このアプリはブラウザのlocalStorageにのみデータを保存するため、
// 端末やブラウザを変える場合はここからバックアップ（JSON）を取っておく必要がある。
import { useRef, useState } from "react";
import { useSalaryData } from "@/context/SalaryDataContext";
import Card from "@/components/Card";
import { buildSalaryCsv, downloadCsv } from "@/lib/salary/csv";
import { clearAllRecords, exportAsJson, importFromJson } from "@/lib/storage/salaryStore";

export default function SettingsPage() {
  const { records } = useSalaryData();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<{ type: "info" | "error"; text: string } | null>(null);

  function handleExportCsv() {
    if (records.length === 0) {
      setMessage({ type: "error", text: "エクスポートできる給与データがありません。" });
      return;
    }
    const csv = buildSalaryCsv(records);
    const today = new Date().toISOString().slice(0, 10);
    downloadCsv(`salary_${today}.csv`, csv);
  }

  function handleExportJson() {
    if (records.length === 0) {
      setMessage({ type: "error", text: "バックアップできる給与データがありません。" });
      return;
    }
    const json = exportAsJson();
    const today = new Date().toISOString().slice(0, 10);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `salary_backup_${today}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function handleImportClick() {
    fileInputRef.current?.click();
  }

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // 同じファイルを連続で選び直せるようにリセット
    if (!file) return;

    const confirmed = confirm(
      "バックアップファイルを読み込みます。現在のデータは上書きされます。よろしいですか？"
    );
    if (!confirmed) return;

    const text = await file.text();
    const result = importFromJson(text);
    if ("error" in result) {
      setMessage({ type: "error", text: result.error });
    } else {
      setMessage({ type: "info", text: `${result.count}件の給与データを復元しました。` });
    }
  }

  function handleClearAll() {
    if (records.length === 0) return;
    const confirmed = confirm(
      "全ての給与データを削除します。この操作は取り消せません。事前にバックアップを取ることをおすすめします。よろしいですか？"
    );
    if (!confirmed) return;
    clearAllRecords();
    setMessage({ type: "info", text: "全ての給与データを削除しました。" });
  }

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-bold text-gray-900">設定</h1>

      <Card>
        <p className="text-xs text-muted">保存されている給与データ</p>
        <p className="mt-1 text-2xl font-bold tabular-nums text-gray-900">{records.length}件</p>
        <p className="mt-2 text-xs text-muted">
          データはこの端末のブラウザ内にのみ保存されます（他のサービスには送信されません）。
        </p>
      </Card>

      {message && (
        <p
          className={`rounded-xl px-4 py-3 text-sm ${
            message.type === "error" ? "bg-red-50 text-negative" : "bg-blue-50 text-accent"
          }`}
        >
          {message.text}
        </p>
      )}

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-700">データ出力・バックアップ</h2>
        <button
          type="button"
          onClick={handleExportCsv}
          className="w-full rounded-2xl border border-card-border bg-white px-4 py-3 text-left font-medium text-gray-900"
        >
          給与履歴をCSVでエクスポート
        </button>
        <button
          type="button"
          onClick={handleExportJson}
          className="w-full rounded-2xl border border-card-border bg-white px-4 py-3 text-left font-medium text-gray-900"
        >
          バックアップ（JSON）を保存
        </button>
        <button
          type="button"
          onClick={handleImportClick}
          className="w-full rounded-2xl border border-card-border bg-white px-4 py-3 text-left font-medium text-gray-900"
        >
          バックアップ（JSON）から復元
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json"
          onChange={handleImportFile}
          className="hidden"
        />
      </section>

      <section>
        <button
          type="button"
          onClick={handleClearAll}
          className="w-full rounded-2xl border border-negative px-4 py-3 text-center font-semibold text-negative"
        >
          全データを削除
        </button>
      </section>
    </div>
  );
}
