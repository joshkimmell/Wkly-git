const CACHE_NAME = 'wkly-v1';

// Assets to pre-cache on install
const PRECACHE_URLS = [
  '/',
  '/manifest.webmanifest',
  '/favicon.ico',
  '/icon-192.svg',
  '/icon-512.svg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Network-first strategy: try network, fall back to cache for navigation requests
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Skip in development (localhost)
  if (request.url.includes('localhost') || request.url.includes('127.0.0.1')) {
    return;
  }

  // Skip chrome extensions and unsupported schemes
  if (request.url.startsWith('chrome-extension://') || 
      request.url.startsWith('moz-extension://') ||
      request.url.startsWith('ws://') ||
      request.url.startsWith('wss://')) {
    return;
  }

  // Only handle GET requests
  if (request.method !== 'GET') return;

  // For navigation requests (HTML pages) use network-first
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('/'))
    );
    return;
  }

  // For API/function calls, always go to network (don't cache)
  if (request.url.includes('/api/') || request.url.includes('/.netlify/')) {
    return;
  }

  // For everything else: stale-while-revalidate
  event.respondWith(
    caches.open(CACHE_NAME).then((cache) =>
      cache.match(request).then((cached) => {
        const networkFetch = fetch(request).then((response) => {
          if (response.ok) cache.put(request, response.clone());
          return response;
        }).catch(() => cached || Promise.reject());
        return cached || networkFetch;
      })
    )
  );
});
