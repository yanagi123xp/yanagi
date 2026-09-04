// ホーム画面などで使う「見出し＋数値」の小さめカード。
import Card from "./Card";

export default function StatCard({
  label,
  value,
  valueClassName = "text-gray-900",
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <Card className="p-4">
      <p className="text-xs text-muted">{label}</p>
      <p className={`mt-1 text-lg font-bold tabular-nums ${valueClassName}`}>{value}</p>
    </Card>
  );
}
