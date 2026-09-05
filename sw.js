importScripts('./js/version.js');
const CACHE_NAME = self.BBGM_VERSION?.cacheName || 'basketball-gm-beta-v04811';
const CORE = [
  './',
  './index.html',
  './css/styles.css',
  './css/mobile-safe-area.css',
  './css/v022.css',
  './css/v024.css',
  './css/mobile-table-usability.css',
  './css/ui-v033.css',
  './css/ui-v034.css',
  './css/ui-v035.css',
  './css/ui-v045.css',
  './css/ui-v046.css',
  './css/ui-v047.css',
  './css/ui-v048.css',
  './css/ui-v049.css',
  './js/version.js',
  './js/engine.js',
  './js/data.js',
  './js/data-quality.js',
  './js/market-ai.js',
  './js/real-free-agents-2026-27.js',
  './js/real-rosters-2026-27.generated.js',
  './js/real-rosters-manual-acb.js',
  './js/real-rosters-manual-euro.js',
  './js/real-rosters-manual-italy.js',
  './js/real-rosters-manual-extra-2026-27.js',
  './js/real-rosters-manual-more-2026-27.js',
  './js/real-rosters-manual-greece-turkey-2026-27.js',
  './js/real-rosters-manual-batch3-2026-27.js',
  './js/real-rosters-manual-bigblock-2026-27.js',
  './js/real-rosters-manual-batch4-2026-27.js',
  './js/real-rosters-manual-batch5-2026-27.js',
  './js/real-rosters-manual-batch6-2026-27.js',
  './js/real-rosters-manual-batch7-2026-27.js',
  './js/real-rosters-manual-batch8-2026-27.js',
  './js/real-rosters-manual-batch9-2026-27.js',
  './js/real-rosters-manual-batch10-2026-27.js',
  './js/real-rosters-manual-batch11-2026-27.js',
  './js/real-rosters-manual-batch12-2026-27.js',
  './js/real-rosters-manual-batch13-2026-27.js',
  './js/real-rosters-manual-batch14-2026-27.js',
  './js/real-rosters-manual-batch15-2026-27.js',
  './js/real-rosters-manual-batch16-2026-27.js',
  './js/real-rosters-manual-merge.js',
  './js/data-pack-real-2026-27.js',
  './js/real-ratings-review-acb-euroleague-2026-27.js',
  './js/app.js',
  './js/v022.js',
  './js/v024.js',
  './js/v025.js',
  './js/v026.js',
  './js/v027.js',
  './js/pwa.js',
  './manifest.webmanifest',
  './icons/app-icon-192.png',
  './icons/app-icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(CORE)));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put('./index.html', copy));
          return response;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (response && response.ok) {
          const copy = response.clone();
          event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy)));
        }
        return response;
      })
      .catch(async () => {
        const exact = await caches.match(event.request);
        if (exact) return exact;
        const cleanUrl = new URL(event.request.url);
        cleanUrl.search = '';
        return caches.match(cleanUrl.toString());
      })
  );
});
