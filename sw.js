const CACHE_NAME = 'dragonwave-v3';
const urlsToCache = [
  './',
  './index.html',
  './management.html',
  './drgon.css',
  './landing.css',
  './dragon.js',
  './js/RaceManager.js',
  './js/api.js',
  './js/ui-utils.js',
  './js/admin-ui.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        // Safe addAll that doesn't fail the whole cache if one asset is missing
        return Promise.allSettled(
          urlsToCache.map(url => cache.add(url).catch(e => console.warn('Failed to cache:', url)))
        );
      })
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  // Don't cache API calls
  if (event.request.url.includes('/api/')) return;

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        return response || fetch(event.request).catch(() => caches.match('./index.html'));
      })
  );
});
