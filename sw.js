// Tăng số phiên bản mỗi khi cập nhật file để điện thoại tải bản mới
const CACHE = 'healthy-v10';
const ASSETS = [
  './',
  'index.html',
  'css/style.css?v=10',
  'js/plan-data.js?v=10',
  'js/app.js?v=10',
  'js/figures.js?v=10',
  'js/plan.js?v=10',
  'js/market.js?v=10',
  'js/sync.js?v=10',
  'manifest.json',
  'icons/icon.svg',
  'icons/icon-192.png',
  'icons/icon-512.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Ưu tiên mạng (bỏ qua cache HTTP của trình duyệt), mất mạng thì dùng bản đã lưu.
// Chỉ xử lý file của chính app — không đụng tới request gửi Google Sheets.
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== self.location.origin) return;
  e.respondWith(
    fetch(e.request.url, { cache: 'no-cache' })
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy));
        }
        return res;
      })
      .catch(() => caches.match(e.request).then((r) => r || caches.match('index.html')))
  );
});
