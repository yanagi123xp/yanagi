// 前月比の1項目を表示する行（金額 or 時間の差分と割合を色付きで表示）。
import { formatPercentSigned } from "@/lib/format";

export default function ComparisonRow({
  label,
  currentText,
  diffText,
  percent,
}: {
  label: string;
  currentText: string;
  diffText: string;
  percent: number | null;
}) {
  const isPositive = diffText.startsWith("+");
  const isNegative = diffText.startsWith("-");
  const colorClass = isPositive ? "text-positive" : isNegative ? "text-negative" : "text-muted";

  return (
    <div className="flex items-center justify-between py-3">
      <span className="text-sm text-muted">{label}</span>
      <div className="text-right">
        <p className="font-semibold tabular-nums text-gray-900">{currentText}</p>
        <p className={`text-xs tabular-nums ${colorClass}`}>
          前月比 {diffText} ({formatPercentSigned(percent)})
        </p>
      </div>
    </div>
  );
}
