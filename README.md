# 給与管理アプリ

毎月の給与明細を記録し、手取り額・総支給額・控除額・残業代・年収などを確認できる、個人用の給与管理Webアプリです。
スマホ（iPhoneのSafari/Chromeなど）で使いやすいレスポンシブデザインで、ホーム画面に追加するとアプリのように使えます（PWA対応）。

## 技術構成

- Next.js（App Router） + TypeScript
- Tailwind CSS
- Supabase（認証・データベース）
- Vercel（デプロイ想定）

## セットアップ手順（初心者向け）

### 1. 依存パッケージのインストール

```bash
npm install
```

### 2. Supabaseプロジェクトを作成する

1. https://supabase.com/ にアクセスし、アカウントを作成
2. 「New Project」から新しいプロジェクトを作成（リージョンは `Northeast Asia (Tokyo)` がおすすめ）
3. プロジェクト作成後、左メニューの「SQL Editor」を開く

### 3. データベースを作成する

1. `supabase/migrations/0001_init.sql` の中身を全てコピー
2. SupabaseのSQL Editorに貼り付けて「Run」を実行

これで `profiles` テーブルと `salary_records` テーブルが作成され、RLS（行レベルセキュリティ）も有効化されます。
自分以外のユーザーは自分のデータを閲覧・編集できません。

### 4. 環境変数を設定する

1. `.env.local.example` をコピーして `.env.local` を作成

```bash
cp .env.local.example .env.local
```

2. Supabaseダッシュボードの「Project Settings」→「API」を開き、以下をコピーして `.env.local` に貼り付け

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxxxxxxxxxxxxxxxxxxx
```

`.env.local` はGit管理対象外なので、安全にAPIキーを書くことができます。

### 5. 開発サーバーを起動する

```bash
npm run dev
```

http://localhost:3000 にアクセスし、新規登録（メールアドレス＋パスワード）→ログイン→給与登録の流れを確認してください。

### 6. Supabaseのメール確認設定について

初期状態ではSupabaseは新規登録時に確認メールを送る設定になっています。
自分専用アプリとしてすぐ使いたい場合は、Supabaseダッシュボードの
「Authentication」→「Providers」→「Email」で `Confirm email` をオフにすると、
確認メールなしですぐログインできるようになります（個人利用なのでオフで問題ありません）。

## 項目を追加・編集したい場合

給与の項目（支給・控除・勤務情報）は以下の3ファイルで一元管理されています。

1. `supabase/migrations/` に新しいカラムを追加するSQLを書いて実行する
2. `src/types/database.ts` の `SalaryRecordRow` に同じ名前のプロパティを追加する
3. `src/lib/salary/fields.ts` の配列に1行追加する

これだけで、登録フォーム・自動集計・履歴表示すべてに新しい項目が反映されます。

## デプロイ（Vercel）

1. https://vercel.com/ でGitHubリポジトリをインポート
2. 「Environment Variables」に `.env.local` と同じ内容（`NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`）を設定
3. Deploy

## ディレクトリ構成の概要

```
src/
  app/
    login/            ログイン・新規登録画面
    (app)/            ログインが必要な画面（認証ガード付きレイアウト）
      home/            ホーム画面
      history/         給与履歴一覧・詳細/編集
      register/        給与新規登録
      analytics/       分析（前月比・年収予測・残業分析・グラフ）
      settings/        設定（ログアウト・CSV出力）
  components/          UI部品（カード・ボトムナビ・グラフなど）
  context/             給与データの共有Context
  lib/
    supabase/          Supabaseクライアント
    salary/            給与の項目定義・自動計算・CSV出力
  types/               Supabaseテーブルの型定義
supabase/migrations/    Supabase用のマイグレーションSQL
```
