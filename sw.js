const CACHE = 'photos-v36';
const ASSETS = ['./', 'index.html', 'i18n.js', 'getting_started.html', 'style.css', 'app.js', 'manifest.webmanifest', 'vendor/mwc.js', 'fonts/gsf-latin.woff2', 'fonts/gsf-vietnamese.woff2', 'fonts/symbols-subset.woff2', 'fonts/lora-latin-italic.woff2', 'fonts/lora-vietnamese-italic.woff2', 'fonts/montserrat-latin-italic.woff2', 'fonts/montserrat-vietnamese-italic.woff2', 'fonts/open-sans-latin-italic.woff2', 'fonts/open-sans-vietnamese-italic.woff2', 'fonts/playfair-display-latin-italic.woff2', 'fonts/playfair-display-vietnamese-italic.woff2', 'fonts/roboto-latin-italic.woff2', 'fonts/roboto-mono-latin-italic.woff2', 'fonts/roboto-mono-vietnamese-italic.woff2', 'fonts/roboto-vietnamese-italic.woff2', 'fonts/dancing-script-latin.woff2', 'fonts/dancing-script-vietnamese.woff2', 'fonts/lora-latin.woff2', 'fonts/lora-vietnamese.woff2', 'fonts/montserrat-latin.woff2', 'fonts/montserrat-vietnamese.woff2', 'fonts/open-sans-latin.woff2', 'fonts/open-sans-vietnamese.woff2', 'fonts/playfair-display-latin.woff2', 'fonts/playfair-display-vietnamese.woff2', 'fonts/roboto-latin.woff2', 'fonts/roboto-mono-latin.woff2', 'fonts/roboto-mono-vietnamese.woff2', 'fonts/roboto-vietnamese.woff2', 'images/error.png', 'images/error-dark.png', 'images/media-player.png', 'icons/icon-192.png', 'icons/icon-512.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS.map(u => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request, { cache: 'no-cache' }).then(r => { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); return r; })
      .catch(() => caches.match(e.request).then(r => r || caches.match('index.html')))
  );
});
