// 角丸カードの共通コンポーネント。金融アプリ風に余白を広めに取っている。
export default function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-3xl border border-card-border bg-white p-5 shadow-sm ${className}`}
    >
      {children}
    </div>
  );
}
