// PETIVA Service Worker - minimal static-asset cache + offline fallback
var STATIC_CACHE = 'petiva-v1-static';
var NEVER_CACHE = ['/api/', '/auth/'];

function shouldSkipCache(url) {
  return NEVER_CACHE.some(function(p) { return url.pathname.startsWith(p); });
}

self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(function(cache) {
        return cache.addAll(['/offline.html', '/icons/icon-192x192.png', '/icons/icon-512x512.png']);
      })
      .then(function() { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys
          .filter(function(k) { return k.startsWith('petiva-') && k !== STATIC_CACHE; })
          .map(function(k) { return caches.delete(k); })
      );
    }).then(function() { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function(event) {
  var request = event.request;
  var url = new URL(request.url);
  if (request.method !== 'GET') return;
  if (url.origin !== self.location.origin) return;
  if (shouldSkipCache(url)) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(function() { return caches.match('/offline.html'); })
    );
    return;
  }

  event.respondWith(
    caches.open(STATIC_CACHE).then(function(cache) {
      return cache.match(request).then(function(cached) {
        var networkFetch = fetch(request).then(function(response) {
          if (response && response.status === 200 && response.type === 'basic') {
            cache.put(request, response.clone());
          }
          return response;
        });
        return cached || networkFetch;
      });
    })
  );
});
