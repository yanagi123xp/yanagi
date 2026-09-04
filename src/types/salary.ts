// 給与データの型定義。
// このアプリはサーバーを持たず、ブラウザのlocalStorageにデータを保存するため、
// user_idなどのアカウント関連の項目は存在しない。

export type SalaryRecordRow = {
  id: string;
  year: number;
  month: number;
  pay_date: string | null;
  // 支給
  base_salary: number;
  position_allowance: number;
  qualification_allowance: number;
  housing_allowance: number;
  commute_allowance: number;
  overtime_pay: number;
  night_shift_allowance: number;
  holiday_allowance: number;
  other_allowance: number;
  bonus: number;
  // 控除
  health_insurance: number;
  pension: number;
  employment_insurance: number;
  income_tax: number;
  resident_tax: number;
  other_deduction: number;
  // 勤務情報
  overtime_hours: number;
  holiday_work_hours: number;
  paid_leave_days: number;
  memo: string | null;
  created_at: string;
  updated_at: string;
};

// 新規登録・更新時に渡す入力値（id・作成日時・更新日時はstorage側で自動採番するため除く）
export type SalaryRecordInput = Omit<SalaryRecordRow, "id" | "created_at" | "updated_at">;
