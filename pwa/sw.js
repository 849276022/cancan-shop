const CACHE_NAME = 'lost-person-v11';
const urlsToCache = [
  '/',
  '/index.html',
  '/css/style.css',
  '/js/app.js?v=20260718',
  '/manifest.json'
];

// 安装时立即激活
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

// 激活时清理旧缓存并立即控制页面
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// 请求拦截
self.addEventListener('fetch', event => {
  // API 请求不走缓存，直接走网络
  if (event.request.url.includes('/api/') || event.request.url.includes('/.netlify/functions/')) {
    event.respondWith(fetch(event.request));
    return;
  }
  
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }
        return fetch(event.request).then(response => {
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache);
          });
          return response;
        });
      })
      .catch(() => {
        return caches.match('/index.html');
      })
  );
});
