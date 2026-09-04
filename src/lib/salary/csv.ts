// 給与履歴をCSV文字列に変換し、ファイルとしてダウンロードさせるための処理。
import type { SalaryRecordRow } from "@/types/salary";
import { totalDeduction, totalIncome, netPay, sortByYearMonthAsc } from "./calc";

const CSV_HEADERS = ["年", "月", "総支給", "手取り", "控除", "残業時間", "残業代"];

export function buildSalaryCsv(records: SalaryRecordRow[]): string {
  const sorted = sortByYearMonthAsc(records);

  const rows = sorted.map((r) => [
    r.year,
    r.month,
    totalIncome(r),
    netPay(r),
    totalDeduction(r),
    r.overtime_hours,
    r.overtime_pay,
  ]);

  const lines = [CSV_HEADERS, ...rows].map((row) => row.join(","));

  // ExcelでもBOM付きにすると文字化けしない
  const bom = "﻿";
  return bom + lines.join("\r\n");
}

export function downloadCsv(filename: string, csvContent: string) {
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
