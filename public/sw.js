const VERSION = '__VERSION__';
const PRECACHE = '__PRECACHE__';

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(`${VERSION}-shell`).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => !key.startsWith(VERSION)).map((key) => caches.delete(key)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  if (url.hostname === 'api.sociobot.in') {
    event.respondWith(fetch(request));
    return;
  }
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).then((response) => {
      const copy = response.clone();
      event.waitUntil(caches.open(`${VERSION}-pages`).then((cache) => cache.put(request, copy)));
      return response;
    }).catch(async () => {
      const pages = await caches.open(`${VERSION}-pages`);
      const shell = await caches.open(`${VERSION}-shell`);
      return (await pages.match(request, { ignoreVary: true })) || (await shell.match('/index.html', { ignoreVary: true })) || (await shell.match('/offline.html', { ignoreVary: true }));
    }));
    return;
  }

  event.respondWith((async () => {
    const shell = await caches.open(`${VERSION}-shell`);
    const precached = await shell.match(request, { ignoreVary: true });
    if (precached) return precached;
    const cached = await caches.match(request, { ignoreVary: true });
    if (cached) return cached;
    const response = await fetch(request);
    if (response.ok) event.waitUntil(caches.open(`${VERSION}-assets`).then((cache) => cache.put(request, response.clone())));
    return response;
  })());
});

self.addEventListener('message', (event) => { if (event.data === 'SKIP_WAITING') self.skipWaiting(); });
