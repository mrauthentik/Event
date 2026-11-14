const CACHE_NAME = "ihgc-scanner-shell-v1";
const SHELL_PATHS = ["/staff/scanner", "/staff/login", "/manifest.json"];

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key.startsWith("ihgc-scanner-shell-") && key !== CACHE_NAME).map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener("message", (event) => {
  if (event.data?.type !== "CACHE_SCANNER_SHELL") return;
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    for (const path of SHELL_PATHS) {
      try {
        const response = await fetch(path, { credentials: "include", cache: "no-store" });
        if (!response.ok || response.type === "opaque") continue;
        const html = path.startsWith("/staff/") ? await response.clone().text() : "";
        await cache.put(path, response);

        const assetPaths = [...new Set(Array.from(html.matchAll(/(?:src|href)=["']([^"']*\/_next\/static\/[^"']+)["']/g), (match) => new URL(match[1], self.location.origin).pathname))];
        await Promise.all(assetPaths.map(async (assetPath) => {
          try {
            const asset = await fetch(assetPath, { credentials: "same-origin" });
            if (asset.ok && asset.type === "basic") await cache.put(assetPath, asset);
          } catch {}
        }));
      } catch {}
    }
  })());
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(request);
      if (cached) return cached;
      const response = await fetch(request);
      if (response.ok && response.type === "basic") await cache.put(request, response.clone());
      return response;
    })());
    return;
  }

  if (request.mode === "navigate" && ["/staff/scanner", "/staff/login"].includes(url.pathname)) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      try {
        const response = await fetch(request);
        if (response.ok && response.type === "basic") await cache.put(url.pathname, response.clone());
        return response;
      } catch {
        return (await cache.match(url.pathname)) || Response.error();
      }
    })());
  }
});
