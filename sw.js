/* Thailand MMXXVI — offline cache.
   Strategy: serve from cache instantly (airplane mode works), and when online,
   re-download in the background so the NEXT open shows the latest version. */
const CACHE = 'thai-trip-v3';
const ASSETS = [
  './', './index.html', './manifest.webmanifest', './icon-180.png', './icon-512.png',
  './fonts/Archivo-400.woff2', './fonts/Archivo-500.woff2', './fonts/Archivo-600.woff2', './fonts/Archivo-700.woff2',
  './fonts/CormorantGaramond-500.woff2', './fonts/CormorantGaramond-500i.woff2', './fonts/CormorantGaramond-600.woff2',
  './fonts/EBGaramond-400.woff2', './fonts/EBGaramond-400i.woff2',
  './fonts/JetBrainsMono-400.woff2', './fonts/JetBrainsMono-600.woff2',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then(hit => {
      const fresh = fetch(e.request)
        .then(res => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then(c => c.put(e.request, copy));
          }
          return res;
        })
        .catch(() => hit); // offline -> cached copy
      return hit || fresh;
    })
  );
});
