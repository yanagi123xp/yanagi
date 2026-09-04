"use client";

// 給与データをアプリ全体で共有するためのContext。
// ホーム・履歴・分析の各画面はここから同じデータを参照するので、
// 画面ごとに個別でSupabaseへ問い合わせる必要がない。
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import type { SalaryRecordRow } from "@/types/database";

type SalaryDataContextValue = {
  records: SalaryRecordRow[];
  loading: boolean;
  errorMessage: string | null;
  user: User | null;
  refresh: () => Promise<void>;
};

const SalaryDataContext = createContext<SalaryDataContextValue | null>(null);

export function SalaryDataProvider({ children }: { children: React.ReactNode }) {
  const supabase = useMemo(() => createClient(), []);
  const [records, setRecords] = useState<SalaryRecordRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);

    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser();
    setUser(currentUser);

    // RLSにより自分のデータのみが返ってくる（user_idでの絞り込みはDB側で自動的に行われる）
    const { data, error } = await supabase
      .from("salary_records")
      .select("*")
      .order("year", { ascending: false })
      .order("month", { ascending: false });

    if (error) {
      setErrorMessage(error.message);
      setRecords([]);
    } else {
      setRecords(data ?? []);
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    // 初回マウント時にデータを取得する（refresh内で非同期にsetStateされるため意図的な呼び出し）
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
  }, [refresh]);

  const value: SalaryDataContextValue = {
    records,
    loading,
    errorMessage,
    user,
    refresh,
  };

  return (
    <SalaryDataContext.Provider value={value}>{children}</SalaryDataContext.Provider>
  );
}

export function useSalaryData() {
  const ctx = useContext(SalaryDataContext);
  if (!ctx) {
    throw new Error("useSalaryDataはSalaryDataProviderの内部でのみ使用できます。");
  }
  return ctx;
}
