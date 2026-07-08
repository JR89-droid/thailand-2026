/* Thailand MMXXVI — offline cache.
   Serve from cache instantly (airplane mode works); when online, re-download
   in the background. If the page itself changed, tell open tabs so they can
   show a "new edition ready" banner instead of silently staying stale. */
const CACHE = 'thai-trip-v4';
const ASSETS = [
  './', './index.html', './manifest.webmanifest', './icon-180.png', './icon-512.png',
  './fonts/Archivo-400.woff2', './fonts/Archivo-500.woff2', './fonts/Archivo-600.woff2', './fonts/Archivo-700.woff2',
  './fonts/CormorantGaramond-500.woff2', './fonts/CormorantGaramond-500i.woff2', './fonts/CormorantGaramond-600.woff2',
  './fonts/EBGaramond-400.woff2', './fonts/EBGaramond-400i.woff2',
  './fonts/JetBrainsMono-400.woff2', './fonts/JetBrainsMono-600.woff2',
  './img/grand-palace.webp', './img/wat-arun.webp', './img/wat-pho.webp', './img/chatuchak.webp',
  './img/yaowarat.webp', './img/chao-phraya.webp', './img/lumphini.webp', './img/tuktuk-street.webp',
  './img/doi-suthep.webp', './img/chedi-luang.webp', './img/tha-phae-gate.webp', './img/sunday-market.webp',
  './img/elephant-sanctuary.webp', './img/sticky-waterfalls.webp', './img/wat-phra-singh.webp', './img/cnx-oldcity.webp',
  './img/big-buddha.webp', './img/phuket-oldtown.webp', './img/patong-beach.webp', './img/karon-viewpoint.webp',
  './img/promthep-cape.webp', './img/phang-nga-bay.webp', './img/phi-phi.webp', './img/longtail-boats.webp',
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
  // edition checks must reach the network, never the cache
  if (e.request.url.indexOf('nocache=') > -1) {
    e.respondWith(fetch(e.request).catch(() => caches.match('./index.html', { ignoreSearch: true })));
    return;
  }
  const isPage = e.request.mode === 'navigate' || /\/(index\.html)?(\?.*)?$/.test(e.request.url);
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then(hit => {
      const fresh = fetch(e.request)
        .then(async res => {
          if (res && res.ok) {
            const copy = res.clone();
            if (isPage && hit) {
              // page changed upstream? -> notify open tabs
              try {
                const [oldTxt, newTxt] = await Promise.all([hit.clone().text(), res.clone().text()]);
                if (oldTxt !== newTxt) {
                  const clients = await self.clients.matchAll({ type: 'window' });
                  clients.forEach(c => c.postMessage('tt-updated'));
                }
              } catch (err) {}
            }
            caches.open(CACHE).then(c => c.put(e.request, copy));
          }
          return res;
        })
        .catch(() => hit); // offline -> cached copy
      return hit || fresh;
    })
  );
});
