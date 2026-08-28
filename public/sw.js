// Simple service worker for offline PWA support.
// Caches the app shell for offline viewing and queues writes via IndexedDB
// (handled in the app's offline-sync module).

const CACHE_NAME = "fitness-tracker-v1";
const APP_SHELL = [
  "/",
  "/dashboard",
  "/login",
  "/manifest.json",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL).catch(() => {}))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Network-first for API routes, cache-first for static assets.
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Skip non-GET and Cloudinary requests.
  if (event.request.method !== "GET") return;
  if (url.hostname === "res.cloudinary.com") return;

  // API requests: try network, fall back to cache.
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
    return;
  }

  // App shell: cache-first.
  event.respondWith(
    caches.match(event.request).then((cached) => {
      return (
        cached ||
        fetch(event.request)
          .then((response) => {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
            return response;
          })
          .catch(() => cached)
      );
    })
  );
});
