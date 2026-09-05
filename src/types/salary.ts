// 給与データの型定義。
// このアプリはサーバーを持たず、ブラウザのlocalStorageにデータを保存するため、
// user_idなどのアカウント関連の項目は存在しない。

// 会社ごとに独自の手当・控除（例: 待機手当、寮費など）を登録できるようにするための
// 自由項目。名前と金額のペアを好きなだけ追加できる。
export type CustomLineItem = {
  label: string;
  amount: number;
};

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
  // 支給（自由項目：待機手当、資格ごとの手当など会社独自のもの）
  custom_income_items: CustomLineItem[];
  // 控除
  health_insurance: number;
  care_insurance: number;
  pension: number;
  employment_insurance: number;
  income_tax: number;
  resident_tax: number;
  other_deduction: number;
  // 控除（自由項目：寮費、駐車場代など会社独自のもの）
  custom_deduction_items: CustomLineItem[];
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
