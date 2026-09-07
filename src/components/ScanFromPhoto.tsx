"use client";

// 給与明細の写真から、OCR（文字認識）で数値を読み取ってフォームに自動入力するボタン。
//
// 認識処理は全てこの端末のブラウザの中だけで行われ、写真がどこかのサーバーに
// 送信されることはない（tesseract.jsを使い、必要なファイルはこのアプリ自身から読み込む）。
// OCRの精度は明細書のレイアウトによって変わるため、読み取り後は必ず内容を確認すること。
import { useRef, useState } from "react";
import { parseSalaryText, type ParsedSalary } from "@/lib/ocr/parseSalaryText";

// スクリーンショットなど文字が小さい画像は、そのままだと文字認識の精度が落ちやすい。
// 画像が小さい場合はあらかじめ拡大してから認識にかけることで精度を底上げする。
const MIN_WIDTH_FOR_OCR = 1800;
const MAX_UPSCALE = 4;

async function upscaleIfSmall(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(MAX_UPSCALE, Math.max(1, MIN_WIDTH_FOR_OCR / bitmap.width));

  if (scale <= 1) {
    bitmap.close();
    return file;
  }

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    return file;
  }
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  return blob ?? file;
}

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

    setState({ status: "loading", progress: 0, label: "画像を準備中..." });

    try {
      // 画像が小さい（スクリーンショットなど）場合は先に拡大しておく
      const imageForOcr = await upscaleIfSmall(file);

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

      const { data } = await worker.recognize(imageForOcr, {}, { text: true });
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
