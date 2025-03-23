---
layout: null
---

// This forces a cache invalidation with a new timestamp: {{ site.time | date: '%s' }}
const CACHE_NAME = 'jonlitwack-site-v3-{{ site.time | date: "%Y%m%d%H%M%S" }}';
const OLD_CACHE_NAME = 'pixyll2';
const OLD_CACHE_NAME2 = 'jonlitwack-site-v2';

// Assets to cache
const urlsToCache = [
  '/',
  '/assets/css/main.css',
  '/assets/js/main.js'
];

// Install service worker and cache the assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.delete(OLD_CACHE_NAME).then(() => {
      console.log('Old cache deleted');
      return caches.delete(OLD_CACHE_NAME2);
    }).then(() => {
      console.log('Old cache 2 deleted');
      return caches.open(CACHE_NAME);
    }).then(cache => {
      console.log('Opened cache');
      return cache.addAll(urlsToCache);
    })
  );
});

// Clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Force clean cache on load too
caches.delete(OLD_CACHE_NAME);
caches.delete(OLD_CACHE_NAME2);

// Fetch resources from cache or network
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      if (response) {
        return response;
      }
      
      // Clone the request as it can only be used once
      const fetchRequest = event.request.clone();
      
      return fetch(fetchRequest).then(response => {
        // Check for valid response
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }
        
        // Clone the response as it can only be used once
        const responseToCache = response.clone();
        
        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, responseToCache);
        });
        
        return response;
      });
    })
  );
});
