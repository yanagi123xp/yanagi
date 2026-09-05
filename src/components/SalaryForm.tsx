"use client";

// 給与登録・編集フォーム。新規登録画面(register)と履歴の編集画面の両方から使う共通部品。
import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveRecord, deleteRecord } from "@/lib/storage/salaryStore";
import {
  ALL_FIELDS,
  DEDUCTION_FIELDS,
  INCOME_FIELDS,
  WORK_FIELDS,
  createEmptySalaryInput,
  type NumericSalaryKey,
} from "@/lib/salary/fields";
import type { CustomLineItem, SalaryRecordRow } from "@/types/salary";
import { formatYen } from "@/lib/format";
import ScanFromPhoto from "@/components/ScanFromPhoto";
import type { ParsedSalary } from "@/lib/ocr/parseSalaryText";

type Props = {
  initialRecord?: SalaryRecordRow;
};

// フォーム編集中だけ使う、自由項目の1行分のデータ（Reactの一覧表示用に一時的なidを持たせる）
type EditableItem = { id: string; label: string; amount: number };

function toEditableItems(items: CustomLineItem[] | undefined): EditableItem[] {
  return (items ?? []).map((item) => ({ id: crypto.randomUUID(), ...item }));
}

const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);

export default function SalaryForm({ initialRecord }: Props) {
  const router = useRouter();
  const isEdit = Boolean(initialRecord);

  const now = new Date();
  const [year, setYear] = useState(initialRecord?.year ?? now.getFullYear());
  const [month, setMonth] = useState(initialRecord?.month ?? now.getMonth() + 1);
  const [payDate, setPayDate] = useState(initialRecord?.pay_date ?? "");
  const [memo, setMemo] = useState(initialRecord?.memo ?? "");
  const [values, setValues] = useState<Record<NumericSalaryKey, number>>(() => {
    if (!initialRecord) return createEmptySalaryInput();
    const v = createEmptySalaryInput();
    for (const field of ALL_FIELDS) {
      v[field.key] = initialRecord[field.key] ?? 0;
    }
    return v;
  });
  const [customIncomeItems, setCustomIncomeItems] = useState<EditableItem[]>(() =>
    toEditableItems(initialRecord?.custom_income_items)
  );
  const [customDeductionItems, setCustomDeductionItems] = useState<EditableItem[]>(() =>
    toEditableItems(initialRecord?.custom_deduction_items)
  );

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [scanMessage, setScanMessage] = useState<string | null>(null);

  function updateValue(key: NumericSalaryKey, raw: string) {
    const num = raw === "" ? 0 : Number(raw);
    setValues((prev) => ({ ...prev, [key]: Number.isFinite(num) ? num : 0 }));
  }

  function handleScanned(result: ParsedSalary) {
    setValues((prev) => ({ ...prev, ...result.values }));
    if (result.year !== null) setYear(result.year);
    if (result.month !== null) setMonth(result.month);
    if (result.payDate !== null) setPayDate(result.payDate);
    // アプリが項目名を知らなかったものは、自由項目として追加する
    if (result.customIncomeItems.length > 0) {
      setCustomIncomeItems((prev) => [...prev, ...toEditableItems(result.customIncomeItems)]);
    }
    if (result.customDeductionItems.length > 0) {
      setCustomDeductionItems((prev) => [
        ...prev,
        ...toEditableItems(result.customDeductionItems),
      ]);
    }
    setScanMessage(
      `${result.matchedCount}個の項目を読み取りました。内容を確認してから登録してください。`
    );
  }

  // 入力中の値からリアルタイムでプレビュー計算する
  const previewIncome =
    INCOME_FIELDS.reduce((sum, f) => sum + (values[f.key] || 0), 0) +
    customIncomeItems.reduce((sum, item) => sum + (item.amount || 0), 0);
  const previewDeduction =
    DEDUCTION_FIELDS.reduce((sum, f) => sum + (values[f.key] || 0), 0) +
    customDeductionItems.reduce((sum, item) => sum + (item.amount || 0), 0);
  const previewNet = previewIncome - previewDeduction;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage(null);

    // 項目名が空の自由項目は保存しない
    const toLineItems = (items: EditableItem[]): CustomLineItem[] =>
      items
        .filter((item) => item.label.trim() !== "")
        .map((item) => ({ label: item.label.trim(), amount: item.amount }));

    const payload = {
      year,
      month,
      pay_date: payDate || null,
      memo: memo || null,
      ...values,
      custom_income_items: toLineItems(customIncomeItems),
      custom_deduction_items: toLineItems(customDeductionItems),
    };

    const { error } = saveRecord(payload, initialRecord?.id);

    if (error) {
      setErrorMessage(error);
      return;
    }

    router.push("/history");
  }

  function handleDelete() {
    if (!initialRecord) return;
    if (!confirm(`${year}年${month}月の給与データを削除します。よろしいですか？`)) return;

    deleteRecord(initialRecord.id);
    router.push("/history");
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 pb-10">
      <section>
        <ScanFromPhoto onScanned={handleScanned} />
        {scanMessage && (
          <p className="mt-2 rounded-xl bg-blue-50 px-4 py-3 text-sm text-accent">
            {scanMessage}
          </p>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-gray-700">基本情報</h2>
        <div className="grid grid-cols-2 gap-3">
          <LabeledInput label="年">
            <input
              type="number"
              required
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="input"
            />
          </LabeledInput>
          <LabeledInput label="月">
            <select
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className="input"
            >
              {MONTHS.map((m) => (
                <option key={m} value={m}>
                  {m}月
                </option>
              ))}
            </select>
          </LabeledInput>
          <div className="col-span-2">
            <LabeledInput label="支給日">
              <input
                type="date"
                value={payDate ?? ""}
                onChange={(e) => setPayDate(e.target.value)}
                className="input"
              />
            </LabeledInput>
          </div>
        </div>
      </section>

      <FieldGroup title="支給" fields={INCOME_FIELDS} values={values} onChange={updateValue} />
      <CustomItemsEditor
        title="支給（その他の項目）"
        items={customIncomeItems}
        onChange={setCustomIncomeItems}
        placeholder="例）待機手当"
      />

      <FieldGroup title="控除" fields={DEDUCTION_FIELDS} values={values} onChange={updateValue} />
      <CustomItemsEditor
        title="控除（その他の項目）"
        items={customDeductionItems}
        onChange={setCustomDeductionItems}
        placeholder="例）寮費"
      />

      <FieldGroup title="勤務情報" fields={WORK_FIELDS} values={values} onChange={updateValue} />

      <section>
        <h2 className="mb-3 text-sm font-semibold text-gray-700">メモ（任意）</h2>
        <textarea
          value={memo ?? ""}
          onChange={(e) => setMemo(e.target.value)}
          rows={3}
          className="input resize-none"
          placeholder="例）交通費の精算あり など"
        />
      </section>

      <section className="rounded-3xl border border-card-border bg-gray-50 p-5">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted">総支給額</span>
          <span className="font-semibold tabular-nums">{formatYen(previewIncome)}</span>
        </div>
        <div className="mt-2 flex items-center justify-between text-sm">
          <span className="text-muted">総控除額</span>
          <span className="font-semibold tabular-nums text-negative">
            {formatYen(previewDeduction)}
          </span>
        </div>
        <div className="mt-3 flex items-center justify-between border-t border-card-border pt-3">
          <span className="text-sm font-medium">手取り額</span>
          <span className="text-xl font-bold tabular-nums">{formatYen(previewNet)}</span>
        </div>
      </section>

      {errorMessage && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-negative">{errorMessage}</p>
      )}

      <div className="space-y-3">
        <button
          type="submit"
          className="w-full rounded-2xl bg-accent px-4 py-3 text-base font-semibold text-white active:scale-[0.98]"
        >
          {isEdit ? "更新する" : "登録する"}
        </button>

        {isEdit && (
          <button
            type="button"
            onClick={handleDelete}
            className="w-full rounded-2xl border border-negative px-4 py-3 text-base font-semibold text-negative"
          >
            この月のデータを削除する
          </button>
        )}
      </div>
    </form>
  );
}

// 「基本給」のように決まった名前を持たない、会社独自の手当・控除を
// 自由に追加できる編集欄（項目名＋金額のペアをいくつでも追加できる）。
function CustomItemsEditor({
  title,
  items,
  onChange,
  placeholder,
}: {
  title: string;
  items: EditableItem[];
  onChange: (items: EditableItem[]) => void;
  placeholder: string;
}) {
  function updateItem(id: string, patch: Partial<Pick<EditableItem, "label" | "amount">>) {
    onChange(items.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  function removeItem(id: string) {
    onChange(items.filter((item) => item.id !== id));
  }

  function addItem() {
    onChange([...items, { id: crypto.randomUUID(), label: "", amount: 0 }]);
  }

  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold text-gray-700">{title}</h2>
      {items.length > 0 && (
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.id} className="flex items-center gap-2">
              <input
                type="text"
                value={item.label}
                onChange={(e) => updateItem(item.id, { label: e.target.value })}
                placeholder={placeholder}
                className="input flex-[3]"
              />
              <input
                type="number"
                inputMode="decimal"
                value={item.amount === 0 ? "" : item.amount}
                onChange={(e) => {
                  const num = Number(e.target.value);
                  updateItem(item.id, { amount: Number.isFinite(num) ? num : 0 });
                }}
                placeholder="0"
                className="input flex-[2]"
              />
              <button
                type="button"
                onClick={() => removeItem(item.id)}
                aria-label="この項目を削除"
                className="shrink-0 rounded-xl border border-card-border px-3 py-3 text-muted"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
      <button
        type="button"
        onClick={addItem}
        className="mt-3 w-full rounded-2xl border border-dashed border-card-border px-4 py-3 text-sm font-medium text-accent"
      >
        + 項目を追加
      </button>
    </section>
  );
}

function FieldGroup({
  title,
  fields,
  values,
  onChange,
}: {
  title: string;
  fields: typeof INCOME_FIELDS;
  values: Record<NumericSalaryKey, number>;
  onChange: (key: NumericSalaryKey, raw: string) => void;
}) {
  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold text-gray-700">{title}</h2>
      <div className="space-y-3">
        {fields.map((field) => (
          <LabeledInput key={field.key} label={field.label}>
            <div className="flex items-center">
              <input
                type="number"
                inputMode="decimal"
                value={values[field.key] === 0 ? "" : values[field.key]}
                onChange={(e) => onChange(field.key, e.target.value)}
                placeholder="0"
                className="input"
              />
              <span className="ml-2 shrink-0 text-sm text-muted">
                {field.unit === "yen" ? "円" : field.unit === "hour" ? "時間" : "日"}
              </span>
            </div>
          </LabeledInput>
        ))}
      </div>
    </section>
  );
}

function LabeledInput({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-muted">{label}</span>
      {children}
    </label>
  );
}
