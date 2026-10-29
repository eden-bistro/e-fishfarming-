// AquaSmart service worker: clear all existing Cache Storage entries and do not
// create new caches. This ensures stale app shells and login backgrounds cannot
// be served from a previous cached version.

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

// Network-only behavior: do not cache requests or serve stale cached responses.
self.addEventListener("fetch", () => {
  // Intentionally allow the browser's normal network handling to proceed.
});
