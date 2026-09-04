"use client";

// 給与データを取得するための共通フック。
// localStorageを直接読み書きする salaryStore を useSyncExternalStore で購読しているため、
// どこかの画面でデータを保存・削除すると、他の画面も自動的に最新の状態に更新される
// （SupabaseのようなContextでのProvider・refresh呼び出しは不要）。
import { useSyncExternalStore } from "react";
import { getServerSnapshot, getSnapshot, subscribe } from "@/lib/storage/salaryStore";

export function useSalaryData() {
  const records = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return { records };
}
