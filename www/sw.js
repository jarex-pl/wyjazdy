// Service worker: aplikacja otwiera się też bez internetu.
// Po każdej zmianie plików aplikacji podbij numer wersji poniżej.
const VERSION = 'wyjazdy-v3';
const SHELL = [
  './', 'index.html', 'styles.css', 'manifest.webmanifest',
  'js/app.js', 'js/store.js', 'js/calc.js', 'js/data.js', 'js/config.js', 'js/native.js', 'js/version.js',
  'fonts/manrope-latin-wght-normal.woff2', 'fonts/manrope-latin-ext-wght-normal.woff2', 'vendor/capacitor.js',
  'vendor/firebase.js', 'vendor/qrcode.js',
  'icons/icon.svg', 'icons/icon-192.png', 'icons/apple-touch-icon.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Ruch Firebase i NBP zawsze przez sieć (Firestore sam ma pamięć offline).
  if (/googleapis\.com$|firebaseio\.com$|nbp\.pl$/.test(url.hostname) && !url.hostname.startsWith('fonts.')) return;

  const sameOrigin = url.origin === self.location.origin;
  const cacheable = sameOrigin || /fonts\.(googleapis|gstatic)\.com$|flagcdn\.com$/.test(url.hostname);
  if (!cacheable) return;

  // Własne pliki: najpierw sieć (świeże wersje), w razie braku sieci – pamięć.
  if (sameOrigin) {
    e.respondWith(
      fetch(req).then((res) => {
        if (res.ok) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); }
        return res;
      }).catch(() => caches.match(req, { ignoreSearch: req.mode === 'navigate' }).then((r) => r || caches.match('index.html')))
    );
    return;
  }
  // Czcionki i flagi: najpierw pamięć.
  e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => {
    const copy = res.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); return res;
  })));
});
