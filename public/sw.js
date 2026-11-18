// CounTrack service worker: keeps the capture flow usable offline.
// Bump VERSION on every deploy that changes the app shell.
const VERSION = "v1";
const CACHE = `countrack-${VERSION}`;
const SHELL = ["/", "/capture", "/queue", "/manifest.webmanifest", "/icons/icon-192.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      await cache.addAll(SHELL);
      // Also cache the JS/CSS those pages reference, so /capture works offline even if never opened.
      const assets = new Set();
      for (const path of SHELL.slice(0, 3)) {
        const html = await (await cache.match(path)).text();
        for (const m of html.matchAll(/\/_next\/static\/[^"'\s)]+/g)) assets.add(m[0]);
      }
      await Promise.allSettled([...assets].map((a) => cache.add(a)));
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;

  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/")) {
    event.respondWith(cacheFirst(req));
  } else if (req.mode === "navigate") {
    event.respondWith(networkFirst(req));
  }
});

async function cacheFirst(req) {
  const hit = await caches.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok) (await caches.open(CACHE)).put(req, res.clone());
  return res;
}

async function networkFirst(req) {
  try {
    const res = await fetch(req);
    if (res.ok) (await caches.open(CACHE)).put(req, res.clone());
    return res;
  } catch {
    return (
      (await caches.match(req, { ignoreSearch: true })) ??
      (await caches.match("/capture")) ??
      Response.error()
    );
  }
}
