// Offline: network-first for pages and card files, cache-first for static assets.
const CACHE = "recall-v1";
self.addEventListener("install", (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(["/", "/cards/chem.json", "/cards/geo.json", "/cards/ess.json"]).catch(() => {})));
});
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.pathname.startsWith("/~oauth") || url.pathname.startsWith("/api") || url.hostname.includes("supabase")) return;
  const isAsset = url.origin === location.origin && url.pathname.startsWith("/assets/");
  if (isAsset || url.hostname.includes("fonts.g")) {
    e.respondWith(
      caches.match(req).then(
        (hit) => hit || fetch(req).then((res) => { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); return res; }),
      ),
    );
    return;
  }
  e.respondWith(
    fetch(req)
      .then((res) => { if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); } return res; })
      .catch(() => caches.match(req).then((hit) => hit || (req.mode === "navigate" ? caches.match("/") : Response.error()))),
  );
});
