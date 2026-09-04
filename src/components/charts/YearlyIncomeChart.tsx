"use client";

// 年別の総支給額（年収）を棒グラフで表示する。
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { SalaryRecordRow } from "@/types/database";
import { summarizeYear } from "@/lib/salary/calc";
import { formatYen } from "@/lib/format";

export default function YearlyIncomeChart({ records }: { records: SalaryRecordRow[] }) {
  const years = Array.from(new Set(records.map((r) => r.year))).sort((a, b) => a - b);
  const data = years.map((year) => {
    const s = summarizeYear(records, year);
    return { label: `${year}年`, 年収: s.totalIncome };
  });

  if (data.length === 0) return null;

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
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
        <Bar dataKey="年収" fill="#16a34a" radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
