/* deciti service worker
   Strategy: network-first for everything, cache fallback for offline reads.
   Supabase API/auth/edge-function traffic is never intercepted or cached. */
'use strict';
var CACHE = 'deciti.shell.v4';
var SHELL = ['./', './index.html', './manifest.webmanifest', './icon.svg'];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE)
      .then(function (c) {
        /* add entries individually so one failed fetch cannot break install */
        return Promise.all(SHELL.map(function (u) {
          return c.add(u).catch(function () {});
        }));
      })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys()
      .then(function (keys) {
        return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
      })
      .then(function () { return self.clients.claim(); })
  );
});

function isSupabase(url) {
  return url.hostname === 'drzlwspfbnmmrtzjnrkc.supabase.co' || url.hostname.endsWith('.supabase.co');
}

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url;
  try { url = new URL(req.url); } catch (err) { return; }
  /* pass private backend traffic straight through */
  if (isSupabase(url)) return;
  /* same-origin shell + known static CDNs only */
  var cdn = /(^|\.)jsdelivr\.net$/.test(url.hostname);
  if (url.origin !== location.origin && !cdn) return;

  e.respondWith(
    fetch(req).then(function (res) {
      if (res && res.ok && (url.origin === location.origin || cdn)) {
        var copy = res.clone();
        e.waitUntil(caches.open(CACHE).then(function (c) { return c.put(req, copy); }));
      }
      return res;
    }).catch(function () {
      return caches.match(req, { ignoreSearch: true }).then(function (hit) {
        if (hit) return hit;
        if (req.mode === 'navigate') return caches.match('./index.html');
        return Response.error();
      });
    })
  );
});
