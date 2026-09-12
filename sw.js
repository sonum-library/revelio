var CACHE = "revelio-v3";
var SHELL = ["./", "./index.html", "./manifest.json", "./icon-192.png", "./icon-512.png", "./apple-touch-icon.png"];

self.addEventListener("install", function(e){
  e.waitUntil(caches.open(CACHE).then(function(c){
    /* cache:"reload" skips the browser's HTTP cache so a new release never saves a stale page */
    return c.addAll(SHELL.map(function(u){ return new Request(u, { cache: "reload" }); }));
  }).then(function(){ return self.skipWaiting(); }));
});
self.addEventListener("activate", function(e){
  e.waitUntil(caches.keys().then(function(keys){
    return Promise.all(keys.map(function(k){ if(k!==CACHE) return caches.delete(k); }));
  }).then(function(){ return self.clients.claim(); }));
});
self.addEventListener("fetch", function(e){
  if(e.request.method !== "GET") return;

  /* The page itself: live copy when online, saved copy when not, so a new release shows up on the next visit */
  if(e.request.mode === "navigate"){
    e.respondWith(
      fetch(e.request).then(function(resp){
        if(resp && resp.status === 200){
          var copy = resp.clone();
          caches.open(CACHE).then(function(c){ c.put("./index.html", copy); });
        }
        return resp;
      }).catch(function(){ return caches.match("./index.html"); })
    );
    return;
  }

  /* Everything else (icons, fonts, scripts): saved copy first, it is faster and rarely changes */
  e.respondWith(
    caches.match(e.request).then(function(cached){
      if(cached) return cached;
      return fetch(e.request).then(function(resp){
        if(resp && resp.status === 200 && (resp.type === "basic" || resp.type === "cors")){
          var copy = resp.clone();
          caches.open(CACHE).then(function(c){ c.put(e.request, copy); });
        }
        return resp;
      });
    })
  );
});
