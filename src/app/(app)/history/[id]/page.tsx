"use client";

// 給与詳細・編集画面。履歴一覧からタップして開く。
import { useParams } from "next/navigation";
import Link from "next/link";
import { useSalaryData } from "@/context/SalaryDataContext";
import SalaryForm from "@/components/SalaryForm";
import { monthLabel } from "@/lib/format";

export default function SalaryDetailPage() {
  const params = useParams<{ id: string }>();
  const { records, loading } = useSalaryData();

  const record = records.find((r) => r.id === params.id);

  if (loading) {
    return <p className="pt-10 text-center text-sm text-muted">読み込み中...</p>;
  }

  if (!record) {
    return (
      <div className="flex flex-col items-center gap-4 pt-16 text-center">
        <p className="text-sm text-muted">データが見つかりませんでした。</p>
        <Link href="/history" className="text-sm text-accent">
          履歴一覧に戻る
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-6 text-lg font-bold text-gray-900">
        {monthLabel(record.year, record.month)}の給与
      </h1>
      <SalaryForm initialRecord={record} />
    </div>
  );
}
