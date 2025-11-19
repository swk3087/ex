// public/sw.js
const CACHE_NAME = "naesin-v1";
const CORE_ASSETS = [
  "/",              // 서버가 루트를 dashboard가 아닌 index로 서빙한다면 "/" 대신 "/index.html"로 바꾸세요
  "/index.html",
  "/choice.html",
  "/dashboard.html",
  "/mscalc.html",
  "/js/auth.js",
  "/js/dashboard.js",
  "/js/mscalc.js",
  "/manifest.json"
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
