// Hanya cache halaman offline publik. Jangan cache sesi, callback, API, atau data sumur.
const CACHE = "tirta-offline-v1";
self.addEventListener("install", event => { event.waitUntil(caches.open(CACHE).then(cache => cache.add("/offline.html"))); self.skipWaiting(); });
self.addEventListener("activate", event => { event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith("tirta-offline-") && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", event => {
  if (event.request.mode !== "navigate" || new URL(event.request.url).origin !== self.location.origin) return;
  event.respondWith(fetch(event.request).catch(() => caches.match("/offline.html")));
});
