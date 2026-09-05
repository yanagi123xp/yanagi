// 給与管理アプリ用の簡易Service Worker。
// このアプリはデータを全てブラウザのlocalStorageに保存しており、外部との通信を行わないため、
// ページ・静的アセットをキャッシュしておけば、電波が無い場所でもアプリを開いて使い続けられる。
const CACHE_NAME = "salary-app-shell-v3";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

function isCacheableRequest(request, url) {
  if (request.method !== "GET" || url.origin !== self.location.origin) return false;
  if (request.mode === "navigate") return true; // ページ遷移（各画面のHTML）
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname.startsWith("/tesseract/") || // 写真から自動入力するOCR機能に使うファイル
    url.pathname === "/manifest.webmanifest"
  );
}

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  if (!isCacheableRequest(event.request, url)) {
    return; // 対象外のリクエストはService Workerを介さず通常通り取得する
  }

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      try {
        const response = await fetch(event.request);
        cache.put(event.request, response.clone());
        return response;
      } catch {
        // オフライン時はキャッシュ済みの内容を返す
        const cached = await cache.match(event.request);
        return cached || Response.error();
      }
    })
  );
});
