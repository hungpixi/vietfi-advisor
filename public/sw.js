const CACHE_NAME = "vietfi-v2";
const STATIC_ASSETS = [
  "/manifest.json",
  "/assets/icon-192.png",
  "/assets/icon-512.png",
];
const PUBLIC_API_PREFIXES = [
  "/api/market-data",
  "/api/news",
  "/api/stock-screener",
];

function isPublicApiPath(pathname) {
  return PUBLIC_API_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}?`));
}

function isStaticAsset(pathname) {
  return (
    pathname.startsWith("/_next/static/") ||
    pathname.startsWith("/assets/") ||
    pathname === "/manifest.json" ||
    /\.(?:css|js|png|jpg|jpeg|gif|webp|svg|ico|woff2?)$/.test(pathname)
  );
}

function canCacheResponse(response) {
  const cacheControl = response.headers.get("Cache-Control") || "";
  return response.ok && !/no-store|private/i.test(cacheControl);
}

function safeNotificationUrl(rawUrl) {
  if (typeof rawUrl !== "string") return "/dashboard";

  try {
    const url = new URL(rawUrl, self.location.origin);
    if (url.origin !== self.location.origin) return "/dashboard";
    if (!url.pathname.startsWith("/dashboard")) return "/dashboard";
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return "/dashboard";
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))),
    ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== "GET" || url.origin !== self.location.origin) return;

  if (url.pathname.startsWith("/api/")) {
    if (!isPublicApiPath(url.pathname)) {
      event.respondWith(fetch(request));
      return;
    }

    event.respondWith(
      fetch(request)
        .then((response) => {
          if (canCacheResponse(response)) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => caches.match(request)),
    );
    return;
  }

  if (!isStaticAsset(url.pathname)) {
    event.respondWith(fetch(request));
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      const fetchPromise = fetch(request)
        .then((response) => {
          if (canCacheResponse(response)) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => cached);

      return cached || fetchPromise;
    }),
  );
});

self.addEventListener("push", (event) => {
  const data = event.data
    ? event.data.json()
    : { title: "VietFi Alert", body: "Co bien dong thi truong moi!", icon: "/assets/icon-192.png" };
  const url = safeNotificationUrl(data.url);

  event.waitUntil(
    self.registration.showNotification(data.title || "VietFi Advisor", {
      body: data.body || "Xem ngay tren dashboard",
      icon: data.icon || "/assets/icon-192.png",
      badge: "/assets/icon-192.png",
      tag: data.tag || "market-alert",
      data: { url },
      vibrate: [200, 100, 200],
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = safeNotificationUrl(event.notification.data?.url);
  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clients) => {
      const existing = clients.find((client) => client.url.includes("/dashboard"));
      if (existing) return existing.focus();
      return self.clients.openWindow(url);
    }),
  );
});
