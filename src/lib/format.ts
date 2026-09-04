// 表示フォーマット用の共通関数（日本円・日付など）。

// 例: 298500 -> "298,500円"（マイナスの場合は "-298,500円"）
export function formatYen(amount: number): string {
  const rounded = Math.round(amount);
  return `${rounded.toLocaleString("ja-JP")}円`;
}

// 符号付き表示（前月比などで使用）。例: +6200 -> "+6,200円"、-1000 -> "-1,000円"
export function formatYenSigned(amount: number): string {
  const rounded = Math.round(amount);
  const sign = rounded > 0 ? "+" : "";
  return `${sign}${rounded.toLocaleString("ja-JP")}円`;
}

// 符号付きパーセント表示。例: 2.1 -> "+2.1%"
export function formatPercentSigned(percent: number | null): string {
  if (percent === null) return "―";
  const sign = percent > 0 ? "+" : "";
  return `${sign}${percent.toFixed(1)}%`;
}

// 時間表示。例: 12.5 -> "12.5時間"
export function formatHours(hours: number): string {
  return `${hours.toLocaleString("ja-JP", { maximumFractionDigits: 1 })}時間`;
}

// 日数表示。例: 1.5 -> "1.5日"
export function formatDays(days: number): string {
  return `${days.toLocaleString("ja-JP", { maximumFractionDigits: 1 })}日`;
}

export function monthLabel(year: number, month: number): string {
  return `${year}年${month}月`;
}
