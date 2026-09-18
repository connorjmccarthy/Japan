/* Service worker: cache the app shell for offline use; always try the network first for data. */
const VERSION = 'v5';
const SHELL = ['./', './index.html', './styles/app.css', './src/main.js', './src/util.js', './src/ui.js', './src/store.js', './src/github.js', './src/ics.js', './src/daymap.js', './src/crypto.js',
  './src/views/overview.js', './src/views/itinerary.js', './src/views/go.js', './src/views/flights.js', './src/views/stays.js', './src/views/food.js', './src/views/budget.js', './src/views/checklist.js', './src/views/map.js', './src/views/vault.js', './src/views/decisions.js', './src/views/settings.js',
  './vendor/leaflet/leaflet.js', './vendor/leaflet/leaflet.css', './manifest.webmanifest', './icons/icon.svg', './icons/icon-192.png', './icons/icon-512.png', './data/trips.json', './data/trip.json', './data/bali.json', './data/ubud.json'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  if (url.origin !== location.origin) return; // tiles, fonts, GitHub API: straight to network
  const isData = /\/data\/[^/]+\.json$/.test(url.pathname);
  if (isData) {
    e.respondWith(fetch(e.request).then((r) => { const copy = r.clone(); caches.open(VERSION).then((c) => c.put(url.pathname, copy)); return r; }).catch(() => caches.match(url.pathname)));
    return;
  }
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then((hit) => hit || fetch(e.request).then((r) => { if (r.ok) { const copy = r.clone(); caches.open(VERSION).then((c) => c.put(e.request, copy)); } return r; })));
});
