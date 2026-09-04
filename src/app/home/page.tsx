"use client";

// ホーム画面：今月の給与サマリーと、今年の給与サマリーを表示する。
import Link from "next/link";
import { useSalaryData } from "@/context/SalaryDataContext";
import Card from "@/components/Card";
import StatCard from "@/components/StatCard";
import { formatYen, formatHours, monthLabel } from "@/lib/format";
import {
  findCurrentOrLatestRecord,
  summarize,
  summarizeYear,
} from "@/lib/salary/calc";

export default function HomePage() {
  const { records } = useSalaryData();

  const { record: current, isActualCurrentMonth } = findCurrentOrLatestRecord(records);

  if (!current) {
    return (
      <div className="flex flex-col items-center gap-4 pt-16 text-center">
        <p className="text-base text-muted">
          まだ給与データが登録されていません。
        </p>
        <Link
          href="/register"
          className="rounded-2xl bg-accent px-6 py-3 font-semibold text-white"
        >
          給与を登録する
        </Link>
      </div>
    );
  }

  const summary = summarize(current);
  const yearSummary = summarizeYear(records, current.year);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-sm font-medium text-muted">
          {isActualCurrentMonth ? "今月の給与" : `${monthLabel(current.year, current.month)}の給与（最新）`}
        </h1>
        <p className="mt-2 text-4xl font-bold tabular-nums text-gray-900">
          {formatYen(summary.net)}
        </p>
        <p className="text-xs text-muted">手取り額</p>
      </header>

      <div className="grid grid-cols-2 gap-3">
        <StatCard label="総支給額" value={formatYen(summary.income)} />
        <StatCard
          label="控除額"
          value={formatYen(summary.deduction)}
          valueClassName="text-negative"
        />
        <StatCard label="残業時間" value={formatHours(summary.overtimeHours)} />
        <StatCard label="残業代" value={formatYen(summary.overtimePay)} />
      </div>

      <section>
        <h2 className="mb-3 text-sm font-medium text-muted">
          {current.year}年の給与
        </h2>
        <Card>
          <dl className="grid grid-cols-2 gap-y-5">
            <SummaryItem label="年間総支給額" value={formatYen(yearSummary.totalIncome)} />
            <SummaryItem label="年間手取り額" value={formatYen(yearSummary.totalNet)} />
            <SummaryItem
              label="年間控除額"
              value={formatYen(yearSummary.totalDeduction)}
              valueClassName="text-negative"
            />
            <SummaryItem
              label="年間残業時間"
              value={formatHours(yearSummary.totalOvertimeHours)}
            />
          </dl>
        </Card>
      </section>

      <Link
        href="/register"
        className="block rounded-2xl bg-accent px-6 py-3 text-center font-semibold text-white active:scale-[0.98]"
      >
        今月の給与を登録・編集する
      </Link>
    </div>
  );
}

function SummaryItem({
  label,
  value,
  valueClassName = "text-gray-900",
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className={`mt-1 text-base font-bold tabular-nums ${valueClassName}`}>{value}</dd>
    </div>
  );
}
