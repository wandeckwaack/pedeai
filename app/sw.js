/* PedeAí — cache somente do aplicativo. APIs e mutações sempre usam a rede.
   O cache existente permanece disponível durante quedas e atualizações. */
var CACHE = "pedeai-v3-8";
var SCOPE = new URL(self.registration.scope);
var ASSETS = ["./", "./index.html", "./manifest.webmanifest", "./icon.svg", "./icon-maskable.svg"];
var INDEX = new URL("./index.html", SCOPE).href;

function isDoc(req) {
  return req.mode === "navigate" || req.destination === "document" ||
    req.url.split("?")[0] === INDEX || req.url.split("?")[0] === SCOPE.href;
}
function cacheable(res, documentRequest) {
  return res && res.ok && !res.redirected && res.type !== "opaque" &&
    (!documentRequest || (res.headers.get("Content-Type") || "").indexOf("text/html") >= 0);
}
function cached(key) {
  return caches.open(CACHE).then(function (c) { return c.match(key); }).catch(function () { return null; });
}
function storeResponse(key, res) {
  return caches.open(CACHE).then(function (c) { return c.put(key, res.clone()); }).catch(function () {});
}
function network(req) {
  var ctrl = typeof AbortController === "function" ? new AbortController() : null, timer;
  var timeout = new Promise(function (_, reject) {
    timer = setTimeout(function () { if (ctrl) ctrl.abort(); reject(Error("offline")); }, 3500);
  });
  return Promise.race([fetch(req, { cache: "no-store", signal: ctrl ? ctrl.signal : undefined }), timeout])
    .finally(function () { clearTimeout(timer); });
}
function unavailable() {
  return new Response("Sem conexão. Abra novamente quando a rede voltar.", {
    status: 503, headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" }
  });
}

self.addEventListener("install", function (e) {
  e.waitUntil(Promise.all(ASSETS.map(function (path) {
    var url = new URL(path, SCOPE).href;
    return network(new Request(url)).then(function (res) {
      if (cacheable(res, path === "./" || path === "./index.html")) return storeResponse(url, res);
    }).catch(function () {});
  })).then(function () { return self.skipWaiting(); }));
});
self.addEventListener("activate", function (e) {
  e.waitUntil(self.clients.claim());
});
self.addEventListener("fetch", function (e) {
  var req = e.request, url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== SCOPE.origin || !url.pathname.startsWith(SCOPE.pathname) ||
      /\/(api|sync|beat|health|vault|auth)(\/|$)/i.test(url.pathname)) return;
  if (isDoc(req)) {
    e.respondWith(network(req).then(function (res) {
      if (!cacheable(res, true)) throw Error("Documento indisponível");
      return storeResponse(INDEX, res).then(function () { return res; });
    }).catch(function () {
      return cached(INDEX).then(function (hit) {
        if (cacheable(hit, true)) return hit;
        return cached(SCOPE.href).then(function (root) { return cacheable(root, true) ? root : unavailable(); });
      });
    }));
    return;
  }
  if (!/\.(js|css|svg|png|jpe?g|webp|ico|woff2?|webmanifest)$/i.test(url.pathname)) return;
  e.respondWith(cached(req).then(function (hit) {
    if (hit && hit.ok) return hit;
    return network(req).then(function (res) {
      if (!cacheable(res, false)) return res;
      return storeResponse(req, res).then(function () { return res; });
    }).catch(unavailable);
  }));
});
