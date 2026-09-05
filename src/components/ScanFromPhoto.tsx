"use client";

// 給与明細の写真から、OCR（文字認識）で数値を読み取ってフォームに自動入力するボタン。
//
// 認識処理は全てこの端末のブラウザの中だけで行われ、写真がどこかのサーバーに
// 送信されることはない（tesseract.jsを使い、必要なファイルはこのアプリ自身から読み込む）。
// OCRの精度は明細書のレイアウトによって変わるため、読み取り後は必ず内容を確認すること。
import { useRef, useState } from "react";
import { parseSalaryText, type ParsedSalary } from "@/lib/ocr/parseSalaryText";

type Props = {
  onScanned: (result: ParsedSalary) => void;
};

type ScanState =
  | { status: "idle" }
  | { status: "loading"; progress: number; label: string }
  | { status: "error"; message: string };

export default function ScanFromPhoto({ onScanned }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<ScanState>({ status: "idle" });

  function handleClick() {
    inputRef.current?.click();
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // 同じ写真をもう一度選べるようにリセット
    if (!file) return;

    setState({ status: "loading", progress: 0, label: "準備中..." });

    try {
      // tesseract.jsは重いので、実際にボタンを押したときだけ読み込む
      const { createWorker } = await import("tesseract.js");

      const worker = await createWorker("jpn", 1, {
        workerPath: "/tesseract/worker.min.js",
        corePath: "/tesseract",
        langPath: "/tesseract/lang-data",
        logger: (m) => {
          if (m.status === "recognizing text") {
            setState({ status: "loading", progress: m.progress, label: "文字を読み取り中..." });
          } else {
            setState({ status: "loading", progress: 0, label: "準備中..." });
          }
        },
      });

      const { data } = await worker.recognize(file, {}, { text: true });
      await worker.terminate();

      const parsed = parseSalaryText(data.text);

      if (parsed.matchedCount === 0) {
        setState({
          status: "error",
          message: "項目を読み取れませんでした。写真の向きや明るさを変えて、もう一度お試しください。",
        });
        return;
      }

      onScanned(parsed);
      setState({ status: "idle" });
    } catch {
      setState({
        status: "error",
        message: "読み取りに失敗しました。手動で入力してください。",
      });
    }
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />
      <button
        type="button"
        onClick={handleClick}
        disabled={state.status === "loading"}
        className="w-full rounded-2xl border border-accent bg-blue-50 px-4 py-3 text-center font-semibold text-accent disabled:opacity-60"
      >
        {state.status === "loading"
          ? `${state.label}${state.progress > 0 ? ` ${Math.round(state.progress * 100)}%` : ""}`
          : "📷 給与明細の写真から自動入力"}
      </button>
      {state.status === "error" && (
        <p className="mt-2 text-sm text-negative">{state.message}</p>
      )}
      <p className="mt-2 text-xs text-muted">
        写真は端末の中だけで処理され、外部には送信されません。読み取り結果は必ず確認してください。
      </p>
    </div>
  );
}
