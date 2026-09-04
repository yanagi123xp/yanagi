-- ============================================================
-- 給与管理アプリ 初期セットアップ用マイグレーション
-- Supabaseダッシュボードの「SQL Editor」に貼り付けてそのまま実行できます。
-- ============================================================

-- --------------------------------------------------------------
-- 1. profiles テーブル（ユーザーの基本情報）
-- --------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  display_name text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- 自分のプロフィールのみ参照・更新可能
create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id);

create policy "profiles_insert_own"
  on public.profiles for insert
  with check (auth.uid() = id);

-- 新規ユーザー登録時に自動でprofilesへ1行作成するトリガー
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (new.id, new.email, split_part(new.email, '@', 1));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- --------------------------------------------------------------
-- 2. salary_records テーブル（毎月の給与明細）
-- --------------------------------------------------------------
-- 【項目を追加したくなったら】
--   ALTER TABLE public.salary_records ADD COLUMN 新しい項目名 numeric(12, 0) not null default 0;
-- を実行し、src/types/database.ts と src/lib/salary/fields.ts にも同じ名前を追加してください。

create table if not exists public.salary_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,

  -- 基本情報
  year integer not null check (year between 2000 and 2100),
  month integer not null check (month between 1 and 12),
  pay_date date,

  -- 支給
  base_salary numeric(12, 0) not null default 0,             -- 基本給
  position_allowance numeric(12, 0) not null default 0,      -- 職務手当
  qualification_allowance numeric(12, 0) not null default 0, -- 資格手当
  housing_allowance numeric(12, 0) not null default 0,       -- 住宅手当
  commute_allowance numeric(12, 0) not null default 0,       -- 通勤手当
  overtime_pay numeric(12, 0) not null default 0,            -- 残業代
  night_shift_allowance numeric(12, 0) not null default 0,   -- 深夜手当
  holiday_allowance numeric(12, 0) not null default 0,       -- 休日手当
  other_allowance numeric(12, 0) not null default 0,         -- その他手当
  bonus numeric(12, 0) not null default 0,                   -- 賞与

  -- 控除
  health_insurance numeric(12, 0) not null default 0,       -- 健康保険
  pension numeric(12, 0) not null default 0,                -- 厚生年金
  employment_insurance numeric(12, 0) not null default 0,   -- 雇用保険
  income_tax numeric(12, 0) not null default 0,             -- 所得税
  resident_tax numeric(12, 0) not null default 0,           -- 住民税
  other_deduction numeric(12, 0) not null default 0,        -- その他控除

  -- 勤務情報
  overtime_hours numeric(6, 1) not null default 0,      -- 残業時間
  holiday_work_hours numeric(6, 1) not null default 0,  -- 休日出勤時間
  paid_leave_days numeric(4, 1) not null default 0,     -- 有給取得日数

  memo text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- 1ユーザー・1年・1ヶ月につき1レコードのみ（同じ月を二重登録できないようにする）
  unique (user_id, year, month)
);

alter table public.salary_records enable row level security;

-- 自分のデータのみ閲覧・登録・編集・削除できる
create policy "salary_records_select_own"
  on public.salary_records for select
  using (auth.uid() = user_id);

create policy "salary_records_insert_own"
  on public.salary_records for insert
  with check (auth.uid() = user_id);

create policy "salary_records_update_own"
  on public.salary_records for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "salary_records_delete_own"
  on public.salary_records for delete
  using (auth.uid() = user_id);

-- updated_at を更新時に自動で今の時刻にするトリガー
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists salary_records_set_updated_at on public.salary_records;
create trigger salary_records_set_updated_at
  before update on public.salary_records
  for each row execute procedure public.set_updated_at();

-- よく使う検索（自分のデータを年月順で取得）を高速化するインデックス
create index if not exists salary_records_user_year_month_idx
  on public.salary_records (user_id, year desc, month desc);
