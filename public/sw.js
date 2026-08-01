const cacheName = "oyako-madori-v1";
const shell = [
  "/",
  "/guide",
  "/privacy",
  "/styles.css",
  "/common.js",
  "/home.js",
  "/manifest.webmanifest",
  "/favicon.png",
];
self.addEventListener("install", (event) =>
  event.waitUntil(caches.open(cacheName).then((cache) => cache.addAll(shell))),
);
self.addEventListener("activate", (event) =>
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== cacheName).map((key) => caches.delete(key))),
      ),
  ),
);
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (
    event.request.method !== "GET" ||
    url.origin !== location.origin ||
    url.pathname.startsWith("/api/") ||
    url.pathname === "/rooms" ||
    url.pathname.startsWith("/rooms/") ||
    url.pathname === "/compare"
  )
    return;
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone();
        void caches.open(cacheName).then((cache) => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request)),
  );
});
