// Quran Memorizer PWA Service Worker
const CACHE_NAME = 'quran-memorizer-v1';
const API_CACHE = 'quran-api-v1';

// Core assets to precache on install
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/favicon.svg',
  '/pwa-icon.svg',
  '/pwa-192x192.png',
  '/pwa-512x512.png',
  '/apple-touch-icon.png',
  '/maskable-icon-512x512.png'
];

// Install: precache shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn('Precache partial warning:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// Activate: clean up outdated caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME && key !== API_CACHE) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// If mistakenly loaded on localhost or dev port, unregister immediately
const isDevHost = 
  self.location.hostname === 'localhost' || 
  self.location.hostname === '127.0.0.1' || 
  self.location.port === '5173';

if (isDevHost) {
  self.addEventListener('install', () => {
    self.skipWaiting();
  });
  self.addEventListener('activate', (event) => {
    event.waitUntil(
      self.registration.unregister().then(() => {
        return self.clients.matchAll();
      }).then((clients) => {
        clients.forEach((client) => client.navigate(client.url));
      })
    );
  });
}

// Fetch: smart caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests, localhost/dev server, and Vite internal HMR modules
  if (
    isDevHost ||
    request.method !== 'GET' ||
    url.hostname === 'localhost' ||
    url.hostname === '127.0.0.1' ||
    url.port === '5173' ||
    url.pathname.startsWith('/@') ||
    url.pathname.includes('node_modules') ||
    url.pathname.includes('vite')
  ) {
    return;
  }

  // 1. Audio stream requests (cdn.islamic.network): pass directly through to network to support Range requests
  if (url.hostname.includes('islamic.network') || url.pathname.endsWith('.mp3')) {
    return;
  }

  // 2. Al Quran Cloud API: Network-first with cache fallback (so previously opened Surahs work offline)
  if (url.hostname.includes('alquran.cloud')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(API_CACHE).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => {
          return caches.match(request);
        })
    );
    return;
  }

  // 3. Google Fonts: Cache-first
  if (url.hostname.includes('fonts.googleapis.com') || url.hostname.includes('fonts.gstatic.com')) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  // 4. App Shell & Vite Assets: Stale-While-Revalidate / Cache-first for navigation
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => {
          return caches.match('/index.html') || caches.match('/');
        })
    );
    return;
  }

  // General assets (JS, CSS, images)
  event.respondWith(
    caches.match(request).then((cached) => {
      const fetchPromise = fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return networkResponse;
        })
        .catch(() => cached);

      return cached || fetchPromise;
    })
  );
});

// Support manual update triggers
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
