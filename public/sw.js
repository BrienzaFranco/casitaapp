const CACHE_ESTATICO = "casita-estatico-v1";
const CACHE_DINAMICO = "casita-dinamico-v1";

const RECURSOS_ESTATICOS = [
  "/",
  "/icon.svg",
  "/icon-maskable.svg",
];

// Install: cachear recursos criticos
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_ESTATICO).then((cache) => cache.addAll(RECURSOS_ESTATICOS))
  );
  self.skipWaiting();
});

// Activate: limpiar caches viejos
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_ESTATICO && key !== CACHE_DINAMICO)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Fetch: cache-first para estaticos, network-first para el resto
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // No interceptar llamadas a Supabase/API
  if (url.pathname.startsWith("/api/") || url.hostname.includes("supabase")) {
    return;
  }

  // CSS/JS/fonts del _next: cache-first
  if (url.pathname.startsWith("/_next/")) {
    event.respondWith(
      caches.match(event.request).then((cacheada) => {
        return (
          cacheada ||
          fetch(event.request).then((respuesta) => {
            if (respuesta.ok) {
              const clon = respuesta.clone();
              caches.open(CACHE_ESTATICO).then((c) => c.put(event.request, clon));
            }
            return respuesta;
          })
        );
      })
    );
    return;
  }

  // Navegacion: network-first, fallback a cache
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((respuesta) => {
          if (respuesta.ok) {
            const clon = respuesta.clone();
            caches.open(CACHE_DINAMICO).then((c) => c.put(event.request, clon));
          }
          return respuesta;
        })
        .catch(() => caches.match(event.request))
    );
  }
});
