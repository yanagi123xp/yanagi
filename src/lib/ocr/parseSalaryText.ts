// OCR（写真からの文字認識）で得たテキストから、給与の項目と数値を抜き出す処理。
//
// 給与明細は会社によって書式が違うため、完璧な読み取りはできない。
// 「ラベル（基本給、など）を含む行から、その後ろにある数値を拾う」という
// シンプルなルールで、できる範囲を自動入力し、最終的な確認は必ず人間が行う前提にしている。

import { ALL_FIELDS, type NumericSalaryKey } from "@/lib/salary/fields";

// 項目ごとの言い換え候補（会社によって表記が違うため複数用意する）
const SYNONYMS: Partial<Record<NumericSalaryKey, string[]>> = {
  base_salary: ["基本給"],
  position_allowance: ["職務手当", "役職手当"],
  qualification_allowance: ["資格手当"],
  housing_allowance: ["住宅手当"],
  commute_allowance: ["通勤手当", "交通費"],
  overtime_pay: ["残業手当", "残業代", "時間外手当"],
  night_shift_allowance: ["深夜手当", "深夜勤務手当"],
  holiday_allowance: ["休日手当", "休日出勤手当"],
  other_allowance: ["その他手当", "諸手当"],
  bonus: ["賞与", "ボーナス"],
  health_insurance: ["健康保険"],
  pension: ["厚生年金"],
  employment_insurance: ["雇用保険"],
  income_tax: ["所得税"],
  resident_tax: ["住民税"],
  other_deduction: ["その他控除"],
  overtime_hours: ["残業時間", "時間外労働時間"],
  holiday_work_hours: ["休日出勤時間", "休日労働時間"],
  paid_leave_days: ["有給取得日数", "有給消化日数", "有給日数"],
};

export type ParsedSalary = {
  values: Partial<Record<NumericSalaryKey, number>>;
  year: number | null;
  month: number | null;
  payDate: string | null;
  matchedCount: number;
};

// 円の金額：数字以外（カンマ・OCRノイズ）を全て取り除いて整数にする
function extractYenNumber(text: string): number | null {
  const digits = text.replace(/[^0-9]/g, "");
  if (!digits) return null;
  const value = Number(digits);
  return Number.isFinite(value) ? value : null;
}

// 時間・日数：小数点付きの数値として取り出す（例: "18.5時間" -> 18.5）
function extractDecimalNumber(text: string): number | null {
  const match = text.match(/[0-9]+(?:[.,][0-9]+)?/);
  if (!match) return null;
  const value = Number(match[0].replace(",", "."));
  return Number.isFinite(value) ? value : null;
}

export function parseSalaryText(rawText: string): ParsedSalary {
  const lines = rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const fieldByKey = new Map(ALL_FIELDS.map((field) => [field.key, field]));
  const values: Partial<Record<NumericSalaryKey, number>> = {};
  let matchedCount = 0;

  for (const [key, synonyms] of Object.entries(SYNONYMS) as [NumericSalaryKey, string[]][]) {
    const field = fieldByKey.get(key);
    if (!field || !synonyms) continue;

    for (let i = 0; i < lines.length; i++) {
      // OCRは文字の間に余計な空白を入れることが多いため、空白を除いてから探す
      const noSpace = lines[i].replace(/\s+/g, "");
      const matchedSynonym = synonyms.find((s) => noSpace.includes(s));
      if (!matchedSynonym) continue;

      // ラベルの右側（同じ行）に数値がなければ、次の行を見る
      let numberSource = noSpace.slice(noSpace.indexOf(matchedSynonym) + matchedSynonym.length);
      if (!/[0-9]/.test(numberSource) && i + 1 < lines.length) {
        numberSource = lines[i + 1].replace(/\s+/g, "");
      }

      const value =
        field.unit === "yen" ? extractYenNumber(numberSource) : extractDecimalNumber(numberSource);
      if (value !== null) {
        values[key] = value;
        matchedCount += 1;
      }
      break; // この項目は最初に見つかった箇所だけを採用する
    }
  }

  // 年・月・支給日の検出（例: "2026年8月分" "支給日 2026/08/25"）
  const fullText = rawText.replace(/\s+/g, "");
  let year: number | null = null;
  let month: number | null = null;
  let payDate: string | null = null;

  const yearMonthMatch = fullText.match(/(20[0-9]{2})年([0-9]{1,2})月/);
  if (yearMonthMatch) {
    year = Number(yearMonthMatch[1]);
    month = Number(yearMonthMatch[2]);
  }

  const dateMatch = fullText.match(/(20[0-9]{2})[\/\-年]([0-9]{1,2})[\/\-月]([0-9]{1,2})/);
  if (dateMatch) {
    const y = Number(dateMatch[1]);
    const m = Number(dateMatch[2]);
    const d = Number(dateMatch[3]);
    payDate = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    if (year === null) year = y;
    if (month === null) month = m;
  }

  return { values, year, month, payDate, matchedCount };
}
