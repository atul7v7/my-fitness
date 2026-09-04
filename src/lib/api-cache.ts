/**
 * Client-side fetch cache.
 *
 * Why: every page ("use client") fetches the same reference lists
 * (/api/exercises, /api/bodyparts, /api/logentries, ...) from scratch on
 * every navigation, with no shared state between pages. This layer:
 *
 *  1. Coalesces in-flight requests: two components fetching the same URL at
 *     the same time share one network round trip.
 *  2. Caches responses in memory for a short TTL, so returning to a page
 *     does not re-download data that barely changes (exercises, body parts).
 *  3. Serves stale data instantly while revalidating in the background
 *     (stale-while-revalidate) for fast-changing data (log entries).
 *  4. Lets mutating actions (POST/PUT/DELETE) invalidate affected URLs so the
 *     next view of that resource is fresh.
 *
 * Session-scoped JWT cookies are sent by default with same-origin fetches, so
 * entries are only shared across navigations for the same logged-in user.
 */

const DEFAULT_TTL_MS = 60_000; // Reference lists: exercises, body parts, trainers.
const LIVE_TTL_MS = 5_000; // Fast-changing data: log entries, connections, trends.

interface CacheEntry {
  body: unknown;
  fetchedAt: number;
}

const cache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<Response>>();

function cacheKey(input: RequestInfo | URL, init?: RequestInit): string | null {
  if (!init || init.method === undefined || init.method === "GET") {
    return String(input);
  }
  return null;
}

function shouldStore(url: string): boolean {
  return url.startsWith("/api/");
}

function isLive(url: string): boolean {
  return (
    url.includes("/api/logentries") ||
    url.includes("/api/connections") ||
    url.includes("/api/trends") ||
    url.includes("/api/video")
  );
}

function liveTTLFor(url: string): number {
  // Calendar month queries are expensive; keep them slightly longer than the
  // default live TTL so month navigation is instant.
  if (url.includes("/api/logentries?") && url.includes("from=")) return 15_000;
  return LIVE_TTL_MS;
}

function invalidateMatches(pattern: string): void {
  for (const key of Array.from(cache.keys())) {
    if (key.startsWith(pattern)) cache.delete(key);
  }
}

/** Drop all cached entries (used on logout to protect cross-account privacy). */
function invalidateAll(): void {
  cache.clear();
  inflight.clear();
}

/** Fetch from the network and store the JSON body in the cache on success. */
function fetchAndStore(
  key: string,
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const run = (async () => {
    try {
      const res = await fetch(input, init);
      if (res.ok && shouldStore(key)) {
        try {
          const body = await res.clone().json();
          cache.set(key, { body, fetchedAt: Date.now() });
        } catch {
          // Non-JSON body — don't cache.
        }
      }
      return res;
    } finally {
      inflight.delete(key);
    }
  })();
  inflight.set(key, run);
  return run;
}

/** Build a Response-like object from a cached JSON body. */
function jsonResponse(body: unknown): Response {
  const json = JSON.stringify(body);
  return new Response(json, {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

/** Shared fetch: coalesces in-flight GETs and caches responses in memory. */
export async function cachedFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const key = cacheKey(input, init);
  if (!key) return fetch(input, init); // Mutations bypass the cache.

  const now = Date.now();
  const hit = cache.get(key);
  const ttl = isLive(key) ? liveTTLFor(key) : DEFAULT_TTL_MS;
  const fresh = hit !== undefined && now - hit.fetchedAt < ttl;
  const stale = hit !== undefined && !fresh;

  // Fresh copy in memory: serve it without any network round trip.
  if (fresh) return jsonResponse(hit!.body);

  // Stale copy: return it now and refresh the cache in the background,
  // unless a refresh for this URL is already running.
  if (stale) {
    if (!inflight.has(key)) {
      void fetchAndStore(key, input, init);
    }
    return jsonResponse(hit!.body);
  }

  // Cold miss: coalesce concurrent requests for the same URL.
  const pending = inflight.get(key);
  if (pending) return pending;
  return fetchAndStore(key, input, init);
}

/**
 * Read data through the shared cache.
 * Returns the cached body immediately when a stale entry exists, while
 * refreshing in the background; otherwise awaits the network.
 */
export async function getJSON<T>(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<T> {
  const res = await cachedFetch(input, init);
  return (await res.json()) as T;
}

/** Invalidate cache entries after a successful write. */
export function invalidateCache(pattern: string): void {
  invalidateMatches(pattern);
}

/**
 * Invalidate everything cached. Call after the user logs out so a different
 * account never sees the previous account's cached data.
 */
export function clearCache(): void {
  invalidateAll();
}
