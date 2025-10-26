const CACHE_NAME = 'esquema-pro-v1';
const PRECACHE_URLS = [
  './',
  './index.html',
  './offline.html',
  './script/app.js',
  './script/validacion_rebt.js',
  './script/exportar_memoria_pdf.js',
  './css/styles.css',
  './css/all.css',
  './css/all.min.css',
  './icon/icon-192.png',
  './icon/icon-512.png',
  './icon/icon-144.png',
  './icon/icon-256.png',
  './icon/icon-384.png',
  './icon/icon-1024.png',
  './icon/icon-192-maskable.png',
  './icon/icon-512-maskable.png',
  './images/favicon.ico'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.map(key => {
        if (key !== CACHE_NAME) return caches.delete(key);
      })
    )).then(() => self.clients.claim())
  );
});

// Strategy: Cache-first for app shell/resources, Network-first for navigations with offline fallback
self.addEventListener('fetch', event => {
  const request = event.request;

  // Only handle GET requests
  if (request.method !== 'GET') return;

  // Navigation requests -> try network first, fallback to cache, then offline page
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          // Optionally cache the new page
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
          return response;
        })
        .catch(() => caches.match('./index.html').then(r => r || caches.match('./offline.html')))
    );
    return;
  }

  // For same-origin resources, try cache first then network
  if (new URL(request.url).origin === location.origin) {
    event.respondWith(
      caches.match(request).then(cached => cached || fetch(request).then(resp => {
        // Cache fetched resource for future
        const copy = resp.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
        return resp;
      }).catch(() => {
  // If image request and offline, return a placeholder (if available)
  if (request.destination === 'image') return caches.match('./icon/icon-192.png');
      }))
    );
    return;
  }

  // Default: go to network
  event.respondWith(fetch(request).catch(() => caches.match(request)));
});

// Allow the page to trigger skipWaiting via postMessage
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});