// 給与の自動計算ロジック（総支給・総控除・手取り・年間集計・前月比・年収予測・残業分析）。
import type { SalaryRecordRow } from "@/types/salary";
import { DEDUCTION_FIELDS, INCOME_FIELDS } from "./fields";

// ---- 基本計算 ----

// 総支給額 = すべての支給項目の合計（会社独自の自由項目を含む）
export function totalIncome(record: SalaryRecordRow): number {
  const fixed = INCOME_FIELDS.reduce((sum, field) => sum + (record[field.key] ?? 0), 0);
  const custom = (record.custom_income_items ?? []).reduce((sum, item) => sum + item.amount, 0);
  return fixed + custom;
}

// 総控除額 = すべての控除項目の合計（会社独自の自由項目を含む）
export function totalDeduction(record: SalaryRecordRow): number {
  const fixed = DEDUCTION_FIELDS.reduce((sum, field) => sum + (record[field.key] ?? 0), 0);
  const custom = (record.custom_deduction_items ?? []).reduce((sum, item) => sum + item.amount, 0);
  return fixed + custom;
}

// 手取り額 = 総支給額 − 総控除額
export function netPay(record: SalaryRecordRow): number {
  return totalIncome(record) - totalDeduction(record);
}

export type SalarySummary = {
  income: number;
  deduction: number;
  net: number;
  overtimePay: number;
  overtimeHours: number;
};

export function summarize(record: SalaryRecordRow): SalarySummary {
  return {
    income: totalIncome(record),
    deduction: totalDeduction(record),
    net: netPay(record),
    overtimePay: record.overtime_pay ?? 0,
    overtimeHours: record.overtime_hours ?? 0,
  };
}

// ---- 年間集計 ----

export type YearlySummary = {
  year: number;
  totalIncome: number;
  totalNet: number;
  totalDeduction: number;
  totalBonus: number;
  totalOvertimeHours: number;
  recordCount: number;
};

export function summarizeYear(records: SalaryRecordRow[], year: number): YearlySummary {
  const yearRecords = records.filter((r) => r.year === year);
  return {
    year,
    totalIncome: yearRecords.reduce((sum, r) => sum + totalIncome(r), 0),
    totalNet: yearRecords.reduce((sum, r) => sum + netPay(r), 0),
    totalDeduction: yearRecords.reduce((sum, r) => sum + totalDeduction(r), 0),
    totalBonus: yearRecords.reduce((sum, r) => sum + (r.bonus ?? 0), 0),
    totalOvertimeHours: yearRecords.reduce((sum, r) => sum + (r.overtime_hours ?? 0), 0),
    recordCount: yearRecords.length,
  };
}

// ---- 前月比 ----

export type MonthOverMonth = {
  diff: number;
  percent: number | null; // 前月が0円の場合はnull（%表示不可）
};

export function compareToPrevious(current: number, previous: number | undefined): MonthOverMonth {
  if (previous === undefined) {
    return { diff: 0, percent: null };
  }
  const diff = current - previous;
  const percent = previous === 0 ? null : (diff / previous) * 100;
  return { diff, percent };
}

// 年月順（古い→新しい）にソートした上で、指定レコードの「直前の月」を取得する
export function findPreviousRecord(
  sortedRecords: SalaryRecordRow[],
  targetIndex: number
): SalaryRecordRow | undefined {
  return sortedRecords[targetIndex - 1];
}

// ---- 年収予測 ----

export type ForecastResult = {
  monthsRecorded: number;
  currentYearIncome: number;
  averageMonthlyIncome: number;
  forecastedAnnualIncome: number;
};

// 単純平均による予測：今年の月別総支給の平均 × 12ヶ月（賞与も支給額に含まれているためそのまま合算される）
export function forecastAnnualIncome(records: SalaryRecordRow[], year: number): ForecastResult {
  const yearRecords = records.filter((r) => r.year === year);
  const monthsRecorded = yearRecords.length;
  const currentYearIncome = yearRecords.reduce((sum, r) => sum + totalIncome(r), 0);

  if (monthsRecorded === 0) {
    return {
      monthsRecorded: 0,
      currentYearIncome: 0,
      averageMonthlyIncome: 0,
      forecastedAnnualIncome: 0,
    };
  }

  const averageMonthlyIncome = currentYearIncome / monthsRecorded;
  return {
    monthsRecorded,
    currentYearIncome,
    averageMonthlyIncome,
    forecastedAnnualIncome: averageMonthlyIncome * 12,
  };
}

// ---- 残業分析 ----

export type OvertimeAnalysis = {
  thisMonthHours: number;
  thisMonthPay: number;
  hourlyRate: number | null; // 残業代 ÷ 残業時間（時間が0なら計算不可）
  yearlyHours: number;
  averageMonthlyHours: number;
};

export function analyzeOvertime(records: SalaryRecordRow[], year: number, current?: SalaryRecordRow): OvertimeAnalysis {
  const yearRecords = records.filter((r) => r.year === year);
  const yearlyHours = yearRecords.reduce((sum, r) => sum + (r.overtime_hours ?? 0), 0);
  const averageMonthlyHours = yearRecords.length > 0 ? yearlyHours / yearRecords.length : 0;

  const thisMonthHours = current?.overtime_hours ?? 0;
  const thisMonthPay = current?.overtime_pay ?? 0;
  const hourlyRate = thisMonthHours > 0 ? thisMonthPay / thisMonthHours : null;

  return {
    thisMonthHours,
    thisMonthPay,
    hourlyRate,
    yearlyHours,
    averageMonthlyHours,
  };
}

// ---- 「今月」の判定 ----

export type CurrentRecordResult = {
  record: SalaryRecordRow | undefined;
  isActualCurrentMonth: boolean;
};

// 実際のカレンダー上の「今月」のレコードがあればそれを返す。
// なければ、直近で登録されている最新の月のレコードを代わりに返す（未登録なら空表示にするため）。
export function findCurrentOrLatestRecord(
  records: SalaryRecordRow[],
  now: Date = new Date()
): CurrentRecordResult {
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const exact = records.find((r) => r.year === year && r.month === month);
  if (exact) {
    return { record: exact, isActualCurrentMonth: true };
  }

  const sortedDesc = sortByYearMonthDesc(records);
  return { record: sortedDesc[0], isActualCurrentMonth: false };
}

// 年月順（昇順）にソートする共通ヘルパー
export function sortByYearMonthAsc(records: SalaryRecordRow[]): SalaryRecordRow[] {
  return [...records].sort((a, b) => a.year - b.year || a.month - b.month);
}

export function sortByYearMonthDesc(records: SalaryRecordRow[]): SalaryRecordRow[] {
  return [...records].sort((a, b) => b.year - a.year || b.month - a.month);
}
