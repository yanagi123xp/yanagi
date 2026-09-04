"use client";

// 月別「手取り額」「総支給額」の推移を折れ線グラフで表示する。
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { SalaryRecordRow } from "@/types/database";
import { netPay, sortByYearMonthAsc, totalIncome } from "@/lib/salary/calc";
import { formatYen } from "@/lib/format";

export default function MonthlyTrendChart({ records }: { records: SalaryRecordRow[] }) {
  const data = sortByYearMonthAsc(records)
    .slice(-12)
    .map((r) => ({
      label: `${r.month}月`,
      手取り: netPay(r),
      総支給: totalIncome(r),
    }));

  if (data.length === 0) return null;

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef0f3" />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} />
        <YAxis
          tick={{ fontSize: 11, fill: "#6b7280" }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => `${Math.round(v / 10000)}万`}
          width={40}
        />
        <Tooltip formatter={(value) => formatYen(Number(value))} />
        <Line type="monotone" dataKey="総支給" stroke="#93c5fd" strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="手取り" stroke="#2563eb" strokeWidth={2.5} dot={{ r: 2 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}
