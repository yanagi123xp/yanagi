// OCR（写真からの文字認識）で得たテキストから、給与の項目と数値を抜き出す処理。
//
// 給与明細は会社によって書式が違うため、完璧な読み取りはできない。
// 「ラベル（基本給、など）を含む行から、その後ろにある数値を拾う」という
// シンプルなルールで、できる範囲を自動入力し、最終的な確認は必ず人間が行う前提にしている。
// アプリが知らない項目名（会社独自の手当など）は「自由項目」として拾い、
// 金額と項目名をそのままフォームに追加する。

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
  care_insurance: ["介護保険"],
  pension: ["厚生年金"],
  employment_insurance: ["雇用保険"],
  income_tax: ["所得税"],
  resident_tax: ["住民税"],
  other_deduction: ["その他控除"],
  overtime_hours: ["残業時間", "時間外労働時間"],
  holiday_work_hours: ["休日出勤時間", "休日労働時間"],
  paid_leave_days: ["有給取得日数", "有給消化日数", "有給日数"],
};

// 合計・総額など、内訳ではなく計算結果を表す行は自由項目として取り込まない
// （そのまま追加すると、アプリ側の自動計算と二重に足されてしまうため）
const TOTAL_LABEL_PATTERNS = ["合計", "総支給", "総額", "差引", "小計"];

// 「残業手当」の内訳として扱われることが多い項目名。
// 「残業手当」の合計が読み取れているときは、これらは二重計上になるため自由項目に含めない。
const OVERTIME_BREAKDOWN_PATTERNS = ["残業", "時給", "早・遅"];

// セクション見出しになりうる語句（数字を含まない行でセクションを切り替える）
const INCOME_SECTION_HEADERS = ["支給額", "支給"];
const DEDUCTION_SECTION_HEADERS = ["控除額", "控除"];
// これらの見出しが出たら、それ以降は自由項目として拾わない（勤怠時間や回数などのため）
const IGNORE_SECTION_HEADERS = ["勤怠", "その他", "備考", "銀行", "振込"];

export type CustomItemCandidate = { label: string; amount: number };

export type ParsedSalary = {
  values: Partial<Record<NumericSalaryKey, number>>;
  customIncomeItems: CustomItemCandidate[];
  customDeductionItems: CustomItemCandidate[];
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

// 勤怠システムは残業時間を "29:30"（29時間30分）のような表記にすることが多いため、
// その場合は10進数の時間（29.5）に変換する
function extractHoursNumber(text: string): number | null {
  const hmMatch = text.match(/([0-9]+):([0-9]{2})/);
  if (hmMatch) {
    const hours = Number(hmMatch[1]);
    const minutes = Number(hmMatch[2]);
    if (Number.isFinite(hours) && Number.isFinite(minutes)) {
      return hours + minutes / 60;
    }
  }
  return extractDecimalNumber(text);
}

export function parseSalaryText(rawText: string): ParsedSalary {
  const lines = rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const fieldByKey = new Map(ALL_FIELDS.map((field) => [field.key, field]));
  const values: Partial<Record<NumericSalaryKey, number>> = {};
  const consumedLines = new Set<number>();
  // 各行が「支給」「控除」のどちらの固定項目として読み取られたかを覚えておく。
  // 見出し（■支給額など）がOCRで読み取れなかった場合でも、
  // 確実に読み取れた固定項目（基本給・健康保険など）を手がかりにセクションを判定できるようにする。
  const lineCategory = new Map<number, "income" | "deduction">();
  let matchedCount = 0;

  // --- 1. アプリが知っている項目（基本給、健康保険 など）を探す ---
  for (const [key, synonyms] of Object.entries(SYNONYMS) as [NumericSalaryKey, string[]][]) {
    const field = fieldByKey.get(key);
    if (!field || !synonyms) continue;

    for (let i = 0; i < lines.length; i++) {
      if (consumedLines.has(i)) continue;
      // OCRは文字の間に余計な空白を入れることが多いため、空白を除いてから探す
      const noSpace = lines[i].replace(/\s+/g, "");
      const matchedSynonym = synonyms.find((s) => noSpace.includes(s));
      if (!matchedSynonym) continue;

      // ラベルの右側（同じ行）に数値がなければ、次の行を見る
      let numberSource = noSpace.slice(noSpace.indexOf(matchedSynonym) + matchedSynonym.length);
      let usedLineIndex = i;
      if (!/[0-9]/.test(numberSource) && i + 1 < lines.length) {
        numberSource = lines[i + 1].replace(/\s+/g, "");
        usedLineIndex = i + 1;
      }

      const value =
        field.unit === "yen"
          ? extractYenNumber(numberSource)
          : field.unit === "hour"
            ? extractHoursNumber(numberSource)
            : extractDecimalNumber(numberSource);
      if (value !== null) {
        values[key] = value;
        matchedCount += 1;
        consumedLines.add(i);
        consumedLines.add(usedLineIndex);
        if (field.category === "income" || field.category === "deduction") {
          lineCategory.set(i, field.category);
          lineCategory.set(usedLineIndex, field.category);
        }
      }
      break; // この項目は最初に見つかった箇所だけを採用する
    }
  }

  // --- 2. アプリが知らない項目を「自由項目」として拾う ---
  // 「■支給額」「■控除額」のような見出しでセクションを判定し、
  // 見出しの中にいる間だけ「ラベル＋金額」の行を自由項目の候補にする。
  //
  // スマホの縦長スクリーンショットなどでは、ラベルと金額が
  //   皆勤手当
  //   11,825
  // のように別々の行に分かれて読み取られることが多いため、
  // 同じ行にラベルが無い場合は直前の行をラベルとして扱う。
  const customIncomeItems: CustomItemCandidate[] = [];
  const customDeductionItems: CustomItemCandidate[] = [];
  let section: "income" | "deduction" | "none" = "none";

  const isHeaderLine = (noSpace: string) =>
    [...INCOME_SECTION_HEADERS, ...DEDUCTION_SECTION_HEADERS, ...IGNORE_SECTION_HEADERS].some(
      (h) => noSpace.includes(h)
    );

  // 数字・カンマ・小数点・コロンだけで構成された「金額そのものの行」かどうか。
  // 「4月定昇」のように数字で始まる項目名を、金額の行と誤認しないために使う。
  const isPureNumberLine = (noSpace: string) => noSpace.replace(/[0-9,.\-:]/g, "").length === 0;

  for (let i = 0; i < lines.length; i++) {
    // 見出しがうまく読み取れなかった場合に備え、確実に読み取れた固定項目があれば
    // それを手がかりにセクションを補正する（見出しより優先度の高い判定材料として扱う）
    const knownCategory = lineCategory.get(i);
    if (knownCategory) section = knownCategory;

    const noSpace = lines[i].replace(/\s+/g, "");
    const hasDigit = /[0-9]/.test(noSpace);

    if (!hasDigit) {
      // 「差引支給額」のような合計行は「支給額」を含んでしまうが見出しではないため、
      // 先に除外してからセクションの見出しかどうかを確認する
      if (TOTAL_LABEL_PATTERNS.some((t) => noSpace.includes(t))) continue;

      if (DEDUCTION_SECTION_HEADERS.some((h) => noSpace.includes(h))) {
        section = "deduction";
      } else if (INCOME_SECTION_HEADERS.some((h) => noSpace.includes(h))) {
        section = "income";
      } else if (IGNORE_SECTION_HEADERS.some((h) => noSpace.includes(h))) {
        section = "none";
      }
      continue;
    }

    if (section === "none") continue;
    if (consumedLines.has(i)) continue;

    const numberMatch = noSpace.match(/[0-9][0-9,]*/);
    if (!numberMatch || numberMatch.index === undefined) continue;

    // 「4月定昇・正月手当」のように数字で始まる項目名は、金額ではなくラベルとして扱う
    // （実際の金額は次の行にあるはずなので、ここでは何もせず次の行の処理に委ねる）
    const trailingAfterNumber = noSpace.slice(numberMatch.index + numberMatch[0].length);
    const isDigitPrefixedLabel =
      numberMatch.index === 0 && /[^0-9,.\-:]/.test(trailingAfterNumber);
    if (isDigitPrefixedLabel) continue;

    let label = noSpace.slice(0, numberMatch.index).trim();
    let labelLineIndex: number | null = null;

    if (!label && i > 0 && !consumedLines.has(i - 1)) {
      // 同じ行にラベルが無ければ、直前の行をラベルの候補にする
      const prevNoSpace = lines[i - 1].replace(/\s+/g, "");
      if (!isPureNumberLine(prevNoSpace) && !isHeaderLine(prevNoSpace)) {
        label = prevNoSpace.trim();
        labelLineIndex = i - 1;
      }
    }

    if (!label || label.length > 20) continue;
    if (TOTAL_LABEL_PATTERNS.some((t) => label.includes(t))) continue;
    // 「残業手当」が既に合計として読み取れている場合、「通常残業」「深夜残業」「時給」
    // 「早・遅」のような内訳項目は残業手当に含まれているため、別項目としては追加しない
    // （そのまま追加すると残業代が二重に計上されてしまうため）
    if (
      values.overtime_pay !== undefined &&
      OVERTIME_BREAKDOWN_PATTERNS.some((p) => label.includes(p))
    ) {
      continue;
    }

    const amount = extractYenNumber(noSpace.slice(numberMatch.index));
    // 金額が0円の項目は情報として意味が薄いため、フォームを煩雑にしないよう省略する
    if (amount === null || amount === 0) continue;

    if (section === "income") {
      customIncomeItems.push({ label, amount });
    } else {
      customDeductionItems.push({ label, amount });
    }
    consumedLines.add(i);
    if (labelLineIndex !== null) consumedLines.add(labelLineIndex);
  }

  // --- 3. 年・月・支給日の検出（例: "2026年8月分" "支給日 2026/08/25"） ---
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

  return {
    values,
    customIncomeItems,
    customDeductionItems,
    year,
    month,
    payDate,
    matchedCount: matchedCount + customIncomeItems.length + customDeductionItems.length,
  };
}
