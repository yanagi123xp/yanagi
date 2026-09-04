"use client";

// PWA対応：本番環境でのみService Workerを登録し、ホーム画面追加後もアプリらしく動作させる。
import { useEffect } from "react";

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (
      process.env.NODE_ENV === "production" &&
      typeof window !== "undefined" &&
      "serviceWorker" in navigator
    ) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // 登録に失敗してもアプリの利用自体には影響しないため、静かに無視する
      });
    }
  }, []);

  return null;
}
