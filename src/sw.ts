/// <reference lib="webworker" />

import { CacheableResponsePlugin } from "workbox-cacheable-response";
import { ExpirationPlugin } from "workbox-expiration";
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from "workbox-precaching";
import { NavigationRoute, registerRoute } from "workbox-routing";
import { CacheFirst, NetworkFirst } from "workbox-strategies";

type PushPayload = {
  title?: string;
  body?: string;
  icon?: string;
  badge?: string;
  url?: string;
};

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<{ url: string; revision?: string }>;
};
const sw = self;

precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

registerRoute(
  new NavigationRoute(createHandlerBoundToURL("/index.html"), {
    denylist: [/^\/~oauth/, /^\/api\//],
  }),
);

registerRoute(
  ({ url, request }) => request.method === "GET"
    && url.origin === sw.location.origin
    && /^\/api\/(?:products|breeds)(?:\/|$)/i.test(url.pathname),
  new NetworkFirst({
    cacheName: "public-api-cache",
    networkTimeoutSeconds: 10,
    plugins: [
      new ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: 5 * 60 }),
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  }),
);

registerRoute(
  ({ url }) => url.origin === "https://fonts.googleapis.com" || url.origin === "https://fonts.gstatic.com",
  new CacheFirst({
    cacheName: "google-fonts-cache",
    plugins: [
      new ExpirationPlugin({ maxEntries: 20, maxAgeSeconds: 365 * 24 * 60 * 60 }),
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  }),
);

registerRoute(
  ({ url }) => url.origin === "https://images.unsplash.com",
  new CacheFirst({
    cacheName: "unsplash-images-cache",
    plugins: [
      new ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: 30 * 24 * 60 * 60 }),
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  }),
);

sw.addEventListener("install", () => {
  void sw.skipWaiting();
});

sw.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter((key) => key === "api-cache" || /^mipo-v\d+$/.test(key))
        .map((key) => caches.delete(key)),
    );
    await sw.clients.claim();
  })());
});

sw.addEventListener("push", (event) => {
  const defaults: Required<PushPayload> = {
    title: "MIPO",
    body: "יש לך התראה חדשה",
    icon: "/pwa-192x192.png",
    badge: "/pwa-192x192.png",
    url: "/",
  };
  let payload: PushPayload = {};

  try {
    payload = event.data?.json() as PushPayload || {};
  } catch {
    payload.body = event.data?.text() || defaults.body;
  }

  const notification = { ...defaults, ...payload };
  const notificationOptions: NotificationOptions & { renotify?: boolean; vibrate?: number[] } = {
    body: notification.body,
    icon: notification.icon,
    badge: notification.badge,
    tag: "mipo-notification",
    renotify: true,
    data: { url: notification.url },
    dir: "rtl",
    lang: "he",
    vibrate: [200, 100, 200],
  };
  event.waitUntil(
    sw.registration.showNotification(notification.title, notificationOptions).then(async () => {
      const clients = await sw.clients.matchAll({ type: "window", includeUncontrolled: true });
      clients.forEach((client) => client.postMessage({ type: "PUSH_RECEIVED", payload: notification }));
    }),
  );
});

sw.addEventListener("notificationclick", (event) => {
  event.notification.close();
  let safeUrl = sw.location.origin;
  try {
    const requestedUrl = new URL(String(event.notification.data?.url || "/"), sw.location.origin);
    safeUrl = requestedUrl.origin === sw.location.origin ? requestedUrl.href : sw.location.origin;
  } catch {
    // Malformed notification payloads fall back to the app root.
  }

  event.waitUntil((async () => {
    const windowClients = await sw.clients.matchAll({ type: "window", includeUncontrolled: true });
    const existingClient = windowClients[0] as WindowClient | undefined;
    if (existingClient) {
      await existingClient.navigate(safeUrl);
      await existingClient.focus();
      return;
    }
    await sw.clients.openWindow(safeUrl);
  })());
});
