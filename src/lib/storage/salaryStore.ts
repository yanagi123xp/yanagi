// 給与データの保存先。
//
// このアプリはSupabaseなどの外部サービスを使わず、ブラウザの localStorage に
// 全データを保存する（＝この端末・このブラウザだけで完結する個人用アプリ）。
// メモリ上にもキャッシュを持ち、React側は useSyncExternalStore 経由で購読する。
//
// 【注意】localStorageはブラウザ・端末ごとに独立しており、
// Safariの「サイトデータを消去」などで消えることがある。
// 設定画面の「データのバックアップ」から定期的にJSONファイルを保存しておくことを推奨する。

import type { SalaryRecordRow, SalaryRecordInput } from "@/types/salary";

const STORAGE_KEY = "yanagi_salary_records_v1";

let cache: SalaryRecordRow[] = [];
let initialized = false;
const listeners = new Set<() => void>();

function loadFromLocalStorage(): SalaryRecordRow[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function ensureInitialized() {
  if (!initialized && typeof window !== "undefined") {
    cache = loadFromLocalStorage();
    initialized = true;
  }
}

function persist() {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
}

function notify() {
  for (const listener of listeners) listener();
}

// ---- React (useSyncExternalStore) 用のインターフェース ----

export function subscribe(listener: () => void): () => void {
  ensureInitialized();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getSnapshot(): SalaryRecordRow[] {
  ensureInitialized();
  return cache;
}

// サーバー側（SSR）では常に空配列を返す。クライアントでのハイドレーション後、
// 実際のlocalStorageの内容に自動的に切り替わる。
// （毎回同じ配列インスタンスを返さないとuseSyncExternalStoreが無限ループ扱いにするため、
//   固定の配列を使い回す）
const EMPTY_RECORDS: SalaryRecordRow[] = [];
export function getServerSnapshot(): SalaryRecordRow[] {
  return EMPTY_RECORDS;
}

// ---- データ操作 ----

type SaveResult = { record?: SalaryRecordRow; error?: string };

// 新規登録（idを渡さない）・更新（idを渡す）の両方を担う
export function saveRecord(input: SalaryRecordInput, id?: string): SaveResult {
  ensureInitialized();

  const duplicate = cache.find(
    (r) => r.year === input.year && r.month === input.month && r.id !== id
  );
  if (duplicate) {
    return {
      error: `${input.year}年${input.month}月のデータは既に登録されています。履歴画面から編集してください。`,
    };
  }

  const now = new Date().toISOString();
  let saved: SalaryRecordRow;

  if (id) {
    const idx = cache.findIndex((r) => r.id === id);
    if (idx === -1) {
      return { error: "更新対象のデータが見つかりませんでした。" };
    }
    saved = { ...cache[idx], ...input, id, updated_at: now };
    cache = [...cache.slice(0, idx), saved, ...cache.slice(idx + 1)];
  } else {
    saved = { ...input, id: crypto.randomUUID(), created_at: now, updated_at: now };
    cache = [...cache, saved];
  }

  persist();
  notify();
  return { record: saved };
}

export function deleteRecord(id: string) {
  ensureInitialized();
  cache = cache.filter((r) => r.id !== id);
  persist();
  notify();
}

// ---- バックアップ / 復元 ----

export function exportAsJson(): string {
  ensureInitialized();
  return JSON.stringify(cache, null, 2);
}

// JSONファイルから復元する。壊れたファイルを読み込まないよう最低限の形チェックを行う。
export function importFromJson(jsonText: string): { count: number } | { error: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    return { error: "JSONファイルの形式が正しくありません。" };
  }

  if (!Array.isArray(parsed)) {
    return { error: "JSONファイルの形式が正しくありません（配列ではありません）。" };
  }

  const isValid = parsed.every(
    (item) =>
      item &&
      typeof item === "object" &&
      typeof item.id === "string" &&
      typeof item.year === "number" &&
      typeof item.month === "number"
  );
  if (!isValid) {
    return { error: "給与データの形式が正しくありません。" };
  }

  ensureInitialized();
  cache = parsed as SalaryRecordRow[];
  persist();
  notify();
  return { count: cache.length };
}

export function clearAllRecords() {
  ensureInitialized();
  cache = [];
  persist();
  notify();
}
