const CACHE_NAME = 'cbpma-pwa-v1';

const APP_ASSETS = [
  './',
  './index.html',
  './dashboard.html',
  './manifest.json',
  './logo.png',
  './3.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      await Promise.allSettled(
        APP_ASSETS.map((url) =>
          fetch(url)
            .then((res) => {
              if (res && res.ok) return cache.put(url, res);
            })
            .catch(() => null)
        )
      );
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  // Huwag i-intercept ang video byte-range streaming (kiba.mp4) at Supabase login API
  if (event.request.headers.get('range')) return;
  const url = new URL(event.request.url);
  if (url.hostname.includes('supabase.co')) return;

  // Network-First para sa HTML pages para laging updated ang links at contract records
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((networkRes) => {
          const copy = networkRes.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          return networkRes;
        })
        .catch(() => caches.match(event.request).then((res) => res || caches.match('./index.html')))
    );
    return;
  }

  // Cache-First para sa static icons, CSS, at fonts
  event.respondWith(
    caches.match(event.request).then((cachedRes) => {
      return (
        cachedRes ||
        fetch(event.request)
          .then((networkRes) => {
            if (networkRes && (networkRes.status === 200 || networkRes.type === 'opaque')) {
              const copy = networkRes.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
            }
            return networkRes;
          })
          .catch(() => null)
      );
    })
  );
});

