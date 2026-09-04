"use client";

// 月別「残業時間」の推移を棒グラフで表示する。
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { SalaryRecordRow } from "@/types/database";
import { sortByYearMonthAsc } from "@/lib/salary/calc";
import { formatHours } from "@/lib/format";

export default function OvertimeTrendChart({ records }: { records: SalaryRecordRow[] }) {
  const data = sortByYearMonthAsc(records)
    .slice(-12)
    .map((r) => ({
      label: `${r.month}月`,
      残業時間: r.overtime_hours,
    }));

  if (data.length === 0) return null;

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef0f3" />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} width={30} />
        <Tooltip formatter={(value) => formatHours(Number(value))} />
        <Bar dataKey="残業時間" fill="#2563eb" radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
