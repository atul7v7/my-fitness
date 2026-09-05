// Service worker for My Fitness Tracker.
// Strategy:
//   - Install: precache the app shell + icons so the app opens offline.
//   - Navigations (HTML pages): network-first with a cache fallback so the
//     user always gets the newest build when online but the page still opens
//     offline from cache.
//   - Static assets (/_next/, /icons/, fonts...): stale-while-revalidate —
//     cache-first, refresh from network in the background.
//   - /api/ requests: network-first with cache fallback (offline reads).
//     Writes are queued by the app's offline-sync module, not here.
//   - Cloudinary media is never intercepted.

const VERSION = "v2";
const CACHE_NAME = `fitness-tracker-${VERSION}`;
const RUNTIME_CACHE = `${CACHE_NAME}-runtime`;

const PRECACHE = [
  "/",
  "/dashboard",
  "/login",
  "/register",
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-192-maskable.png",
  "/icons/icon-512-maskable.png",
  "/icons/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k !== CACHE_NAME && k !== RUNTIME_CACHE)
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

// Stale-while-revalidate: answer from cache instantly, refresh in the background.
async function staleWhileRevalidate(request) {
  const cached = await caches.match(request, { cacheName: RUNTIME_CACHE });
  const network = fetch(request)
    .then((response) => {
      if (response && response.ok) {
        const clone = response.clone();
        caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, clone));
      }
      return response;
    })
    .catch(() => undefined);
  return cached || network;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle same-origin GETs.
  if (request.method !== "GET") return;
  if (url.origin !== self.location.origin) return;

  // API: network-first, cache fallback for offline reads.
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() => caches.match(request, { cacheName: RUNTIME_CACHE }))
    );
    return;
  }

  // HTML navigations: network-first (fresh build), cached page as fallback.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() =>
          caches
            .match(request, { cacheName: RUNTIME_CACHE })
            .then((cached) => cached || caches.match("/dashboard", { cacheName: RUNTIME_CACHE }))
            .then((fallback) => fallback || caches.match("/dashboard", { cacheName: CACHE_NAME }))
        )
    );
    return;
  }

  // Static assets: stale-while-revalidate.
  event.respondWith(staleWhileRevalidate(request));
});
