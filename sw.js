/* PedeAí — service worker.
   index.html: network-first (uma versão nova do app aparece na hora; cache só é
   usado se estiver offline). Demais arquivos: cache-first.  */
var CACHE = "pedeai-v3-1";
var ASSETS = ["./", "./index.html", "./manifest.webmanifest", "./icon.svg", "./icon-maskable.svg"];

self.addEventListener("install", function (e) {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(ASSETS).catch(function () {}); }));
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

function isDoc(req) {
  return req.mode === "navigate" || req.destination === "document" ||
    /\/(index\.html)?(\?.*)?$/.test(new URL(req.url).pathname);
}

self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") return;
  if (isDoc(req)) {
    e.respondWith(
      fetch(req).then(function (res) {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { try { c.put("./index.html", copy); } catch (_) {} });
        return res;
      }).catch(function () {
        return caches.match("./index.html").then(function (h) { return h || caches.match("./"); });
      })
    );
    return;
  }
  e.respondWith(
    caches.match(req).then(function (hit) {
      return hit || fetch(req).then(function (res) {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { try { c.put(req, copy); } catch (_) {} });
        return res;
      }).catch(function () { return hit; });
    })
  );
});
