/* Fechtbuch – Offline-Speicher für die App-Dateien.
   Speichert nur die App selbst (HTML, Icons, Manifest). Trainingsdaten liegen
   ausschließlich im Browser-Speicher des Geräts und werden nie verschickt. */
var CACHE = 'fechtbuch-36f8aa13a9';
var SHELL = ['./', './index.html', './manifest.webmanifest', './apple-touch-icon.png', './icon-192.png', './icon-512.png'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(SHELL); }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k.indexOf('fechtbuch-') === 0 && k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

function fromCache(req) {
  return caches.match(req)
    .then(function (r) { return r || caches.match('./index.html'); })
    .then(function (r) { return r || caches.match('./'); });
}

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;

  // Seitenaufruf: erst Netz (damit Updates sofort ankommen), nach 4 Sekunden oder offline aus dem Speicher
  if (req.mode === 'navigate') {
    var net = fetch(req).then(function (res) {
      if (res.ok) {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put('./index.html', copy); });
      }
      return res;
    });
    var timeout = new Promise(function (resolve) { setTimeout(resolve, 4000); }).then(function () { return fromCache(req); });
    e.respondWith(Promise.race([net.catch(function () { return fromCache(req); }), timeout]).then(function (r) { return r || net; }));
    return;
  }

  // Icons und Manifest: aus dem Speicher, sonst Netz
  e.respondWith(caches.match(req).then(function (r) {
    return r || fetch(req).then(function (res) {
      if (res.ok) { var copy = res.clone(); caches.open(CACHE).then(function (c) { c.put(req, copy); }); }
      return res;
    });
  }));
});
