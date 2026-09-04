// Supabaseのテーブル構造に対応する型定義。
// supabase-jsの createClient<Database>() に渡すことで、
// select/insert/updateの結果に型補完が効くようにする。
// テーブルにカラムを追加した場合は、この型と supabase/migrations/*.sql を両方更新すること。

export type SalaryRecordRow = {
  id: string;
  user_id: string;
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

export type SalaryRecordInsert = Omit<
  SalaryRecordRow,
  "id" | "user_id" | "created_at" | "updated_at"
> & {
  id?: string;
  user_id?: string;
};

export type ProfileRow = {
  id: string;
  email: string | null;
  display_name: string | null;
  created_at: string;
};

export type Database = {
  public: {
    Tables: {
      salary_records: {
        Row: SalaryRecordRow;
        Insert: SalaryRecordInsert;
        Update: Partial<SalaryRecordInsert>;
        Relationships: [];
      };
      profiles: {
        Row: ProfileRow;
        Insert: Partial<ProfileRow> & { id: string };
        Update: Partial<ProfileRow>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
};
