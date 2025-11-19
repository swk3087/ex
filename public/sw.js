// public/sw.js
// 서비스 워커는 오프라인 캐시 및 빠른 로딩을 제공하여 PWA 경험을 개선합니다【151759444665620†L176-L190】.
const CACHE_NAME = "naesin-v2";
const CORE_ASSETS = [
  "/",
  "/index.html",
  "/login.html",
  "/choice.html",
  "/dashboard.html",
  "/mscalc.html",
  "/css/style.css",
  "/css/app.css",
  "/js/auth.js",
  "/js/dashboard.js",
  "/js/mscalc.js",
  "/js/nav.js",
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/maskable-512.png"
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE_NAME).then((c) => c.addAll(CORE_ASSETS)));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((k) => (k === CACHE_NAME ? null : caches.delete(k))))
    )
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  // 네트워크 우선, 실패 시 캐시
  e.respondWith(
    fetch(req).catch(() => caches.match(req).then((r) => r || caches.match("/index.html")))
  );
});