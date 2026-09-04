"use client";

// 給与履歴一覧画面。過去の給与を新しい順に一覧表示し、タップすると詳細/編集画面へ。
import Link from "next/link";
import { useSalaryData } from "@/context/SalaryDataContext";
import Card from "@/components/Card";
import { formatYen, monthLabel } from "@/lib/format";
import { netPay, totalDeduction, totalIncome, sortByYearMonthDesc } from "@/lib/salary/calc";

export default function HistoryPage() {
  const { records, loading, errorMessage } = useSalaryData();

  const sorted = sortByYearMonthDesc(records);

  return (
    <div>
      <h1 className="mb-6 text-lg font-bold text-gray-900">給与履歴</h1>

      {loading && <p className="text-sm text-muted">読み込み中...</p>}
      {errorMessage && <p className="text-sm text-negative">{errorMessage}</p>}

      {!loading && sorted.length === 0 && (
        <div className="flex flex-col items-center gap-4 pt-16 text-center">
          <p className="text-sm text-muted">まだ給与データがありません。</p>
          <Link
            href="/register"
            className="rounded-2xl bg-accent px-6 py-3 font-semibold text-white"
          >
            給与を登録する
          </Link>
        </div>
      )}

      <div className="space-y-3">
        {sorted.map((record) => (
          <Link key={record.id} href={`/history/${record.id}`}>
            <Card className="active:scale-[0.99]">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-gray-700">
                  {monthLabel(record.year, record.month)}
                </p>
                <span className="text-muted">›</span>
              </div>
              <p className="mt-1 text-2xl font-bold tabular-nums text-gray-900">
                {formatYen(netPay(record))}
                <span className="ml-1 text-xs font-normal text-muted">手取り</span>
              </p>
              <div className="mt-2 flex gap-4 text-xs text-muted">
                <span>総支給 {formatYen(totalIncome(record))}</span>
                <span>控除 {formatYen(totalDeduction(record))}</span>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
