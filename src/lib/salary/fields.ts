// 給与項目の定義ファイル。
//
// 「支給」「控除」「勤務情報」の各項目はすべてここに集約されている。
// 項目を追加・変更したい場合は、
//   1. supabase/migrations に新しいカラムを追加するSQLを書いて実行する
//   2. src/types/database.ts の SalaryRecordRow に同名のプロパティを追加する
//   3. このファイルの配列に1行追加する
// の3ステップだけでよい。フォーム・自動集計・履歴表示は全てこの配列を参照して動く。

import type { SalaryRecordRow } from "@/types/database";

export type NumericSalaryKey = Exclude<
  keyof SalaryRecordRow,
  "id" | "user_id" | "year" | "month" | "pay_date" | "memo" | "created_at" | "updated_at"
>;

export type SalaryFieldCategory = "income" | "deduction" | "work";

export type SalaryFieldDef = {
  key: NumericSalaryKey;
  label: string;
  category: SalaryFieldCategory;
  unit: "yen" | "hour" | "day";
};

// 【支給】項目
export const INCOME_FIELDS: SalaryFieldDef[] = [
  { key: "base_salary", label: "基本給", category: "income", unit: "yen" },
  { key: "position_allowance", label: "職務手当", category: "income", unit: "yen" },
  { key: "qualification_allowance", label: "資格手当", category: "income", unit: "yen" },
  { key: "housing_allowance", label: "住宅手当", category: "income", unit: "yen" },
  { key: "commute_allowance", label: "通勤手当", category: "income", unit: "yen" },
  { key: "overtime_pay", label: "残業代", category: "income", unit: "yen" },
  { key: "night_shift_allowance", label: "深夜手当", category: "income", unit: "yen" },
  { key: "holiday_allowance", label: "休日手当", category: "income", unit: "yen" },
  { key: "other_allowance", label: "その他手当", category: "income", unit: "yen" },
  { key: "bonus", label: "賞与", category: "income", unit: "yen" },
];

// 【控除】項目
export const DEDUCTION_FIELDS: SalaryFieldDef[] = [
  { key: "health_insurance", label: "健康保険", category: "deduction", unit: "yen" },
  { key: "pension", label: "厚生年金", category: "deduction", unit: "yen" },
  { key: "employment_insurance", label: "雇用保険", category: "deduction", unit: "yen" },
  { key: "income_tax", label: "所得税", category: "deduction", unit: "yen" },
  { key: "resident_tax", label: "住民税", category: "deduction", unit: "yen" },
  { key: "other_deduction", label: "その他控除", category: "deduction", unit: "yen" },
];

// 【勤務情報】項目（金額ではなく時間・日数）
export const WORK_FIELDS: SalaryFieldDef[] = [
  { key: "overtime_hours", label: "残業時間", category: "work", unit: "hour" },
  { key: "holiday_work_hours", label: "休日出勤時間", category: "work", unit: "hour" },
  { key: "paid_leave_days", label: "有給取得日数", category: "work", unit: "day" },
];

export const ALL_FIELDS: SalaryFieldDef[] = [
  ...INCOME_FIELDS,
  ...DEDUCTION_FIELDS,
  ...WORK_FIELDS,
];

// 新規登録フォームの初期値（すべて0円・0時間で開始する）
export function createEmptySalaryInput(): Record<NumericSalaryKey, number> {
  const result = {} as Record<NumericSalaryKey, number>;
  for (const field of ALL_FIELDS) {
    result[field.key] = 0;
  }
  return result;
}
