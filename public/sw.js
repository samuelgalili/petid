// PetID Service Worker - PWA + Push Notifications
// Version 8 - Force refresh all content
const CACHE_VERSION = 'petid-v8';

// Force unregister old service workers and clear all caches immediately
(async () => {
  try {
    const allCaches = await caches.keys();
    await Promise.all(allCaches.map(cacheName => caches.delete(cacheName)));
    console.log('[SW] Cleared all caches on load');
  } catch (e) {
    console.log('[SW] Cache clear error:', e);
  }
})();

// ===== INSTALL =====
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker v8...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          console.log('[SW] Deleting cache:', cacheName);
          return caches.delete(cacheName);
        })
      );
    })
  );
  // Force immediate activation
  self.skipWaiting();
});

// ===== ACTIVATE =====
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker v8...');
  event.waitUntil(
    Promise.all([
      // Clear ALL caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => caches.delete(cacheName))
        );
      }),
      // Take control immediately
      self.clients.claim(),
      // Force reload all clients
      self.clients.matchAll({ type: 'window' }).then((clients) => {
        clients.forEach((client) => {
          client.postMessage({ type: 'RELOAD_PAGE' });
        });
      })
    ])
  );
});

// ===== FETCH =====
// BYPASS ALL CACHING - Always fetch from network
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;
  if (!event.request.url.startsWith('http')) return;
  
  // Always go to network - no caching at all
  event.respondWith(
    fetch(event.request, { cache: 'no-store' })
      .catch(() => {
        // Only use cache as absolute last resort (offline)
        return caches.match(event.request);
      })
  );
});

// ===== PUSH NOTIFICATIONS =====
self.addEventListener('push', (event) => {
  console.log('[SW] Push event received:', {
    hasData: !!event.data,
    dataType: event.data ? typeof event.data : null,
  });

  let data = {
    title: 'Petid',
    body: 'יש לך התראה חדשה',
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    url: '/',
  };

  try {
    if (event.data) {
      const payload = event.data.json();
      data = {
        title: payload.title || data.title,
        body: payload.body || data.body,
        icon: payload.icon || data.icon,
        badge: payload.badge || data.badge,
        url: payload.url || data.url,
      };
    }
  } catch (e) {
    console.log('[SW] Error parsing push data:', e);
    try {
      if (event.data) data.body = event.data.text();
    } catch (_) {
      // ignore
    }
  }

  const options = {
    body: data.body,
    icon: data.icon,
    badge: data.badge,
    tag: 'petid-notification',
    renotify: true,
    requireInteraction: false,
    data: { url: data.url },
    dir: 'rtl',
    lang: 'he',
    vibrate: [200, 100, 200],
  };

  event.waitUntil(
    (async () => {
      try {
        await self.registration.showNotification(data.title, options);
        
        // Notify open windows (for debugging)
        const windowClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
        windowClients.forEach((client) => {
          client.postMessage({ type: 'PUSH_RECEIVED', payload: data });
        });
      } catch (err) {
        console.log('[SW] Failed to display notification:', err);
      }
    })()
  );
});

// ===== NOTIFICATION CLICK =====
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event);

  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        for (const client of windowClients) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.navigate(urlToOpen);
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

// ===== NOTIFICATION CLOSE =====
self.addEventListener('notificationclose', (event) => {
  console.log('[SW] Notification closed:', event);
});

// ===== BACKGROUND SYNC =====
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync triggered:', event);
  
  if (event.tag === 'sync-notifications') {
    event.waitUntil(syncNotifications());
  }
});

async function syncNotifications() {
  try {
    console.log('[SW] Syncing notifications in background...');
  } catch (error) {
    console.error('[SW] Error syncing notifications:', error);
  }
}
