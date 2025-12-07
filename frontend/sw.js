// Import Workbox from CDN
importScripts('https://storage.googleapis.com/workbox-cdn/releases/7.0.0/workbox-sw.js');

const CACHE_VERSION = 'v42';
const CACHE_NAME = `log-my-job-${CACHE_VERSION}`;

// Configure Workbox
workbox.setConfig({ debug: false });

const { registerRoute, NavigationRoute, setDefaultHandler } = workbox.routing;
const { CacheFirst, NetworkFirst, StaleWhileRevalidate } = workbox.strategies;
const { ExpirationPlugin } = workbox.expiration;
const { CacheableResponsePlugin } = workbox.cacheableResponse;
const { BackgroundSyncPlugin } = workbox.backgroundSync;
const { precacheAndRoute, cleanupOutdatedCaches } = workbox.precaching;

// ============ PRECACHING ============

// Clean up old caches
cleanupOutdatedCaches();

// Precache core files
precacheAndRoute([
  { url: '/', revision: CACHE_VERSION },
  { url: '/index.html', revision: CACHE_VERSION },
  { url: '/auth.html', revision: CACHE_VERSION },
  { url: '/offline.html', revision: CACHE_VERSION },
  { url: '/css/style.css', revision: CACHE_VERSION },
  { url: '/js/config.js', revision: CACHE_VERSION },
  { url: '/js/supabase-client.js', revision: CACHE_VERSION },
  { url: '/js/auth.js', revision: CACHE_VERSION },
  { url: '/js/api.js', revision: CACHE_VERSION },
  { url: '/js/translations.js', revision: CACHE_VERSION },
  { url: '/js/app.js', revision: CACHE_VERSION },
  { url: '/js/calendar.js', revision: CACHE_VERSION },
  { url: '/js/history.js', revision: CACHE_VERSION },
  { url: '/js/export.js', revision: CACHE_VERSION },
  { url: '/js/stats.js', revision: CACHE_VERSION },
  { url: '/js/offline-sync.js', revision: CACHE_VERSION },
  { url: '/manifest.json', revision: CACHE_VERSION }
]);

// ============ RUNTIME CACHING STRATEGIES ============

// Cache images with CacheFirst strategy
registerRoute(
  ({ request }) => request.destination === 'image',
  new CacheFirst({
    cacheName: 'images-cache',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 30 * 24 * 60 * 60 // 30 days
      })
    ]
  })
);

// Cache Google Fonts with StaleWhileRevalidate
registerRoute(
  ({ url }) => url.origin === 'https://fonts.googleapis.com' ||
               url.origin === 'https://fonts.gstatic.com',
  new StaleWhileRevalidate({
    cacheName: 'google-fonts',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({
        maxEntries: 30,
        maxAgeSeconds: 365 * 24 * 60 * 60 // 1 year
      })
    ]
  })
);

// Cache CDN resources (Tailwind, etc.)
registerRoute(
  ({ url }) => url.origin === 'https://cdn.tailwindcss.com' ||
               url.origin === 'https://cdn.jsdelivr.net',
  new StaleWhileRevalidate({
    cacheName: 'cdn-cache',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({
        maxEntries: 20,
        maxAgeSeconds: 7 * 24 * 60 * 60 // 7 days
      })
    ]
  })
);

// ============ BACKGROUND SYNC FOR API REQUESTS ============

// Check if Background Sync is supported
const bgSyncSupported = 'sync' in self.registration;

// Background Sync plugin for failed API requests
const bgSyncPlugin = bgSyncSupported ? new BackgroundSyncPlugin('api-queue', {
  maxRetentionTime: 24 * 60, // 24 hours in minutes
  onSync: async ({ queue }) => {
    let entry;
    while ((entry = await queue.shiftRequest())) {
      try {
        await fetch(entry.request.clone());
        console.log('Background sync: request replayed successfully');

        // Notify the client of successful sync
        const clients = await self.clients.matchAll();
        clients.forEach(client => {
          client.postMessage({
            type: 'SYNC_COMPLETE',
            url: entry.request.url
          });
        });
      } catch (error) {
        console.error('Background sync failed:', error);
        await queue.unshiftRequest(entry);
        throw error;
      }
    }
  }
}) : null;

// Handle Supabase API requests with NetworkFirst + Background Sync
registerRoute(
  ({ url }) => url.hostname.includes('supabase.co'),
  async ({ request, event }) => {
    const networkFirst = new NetworkFirst({
      cacheName: 'api-cache',
      networkTimeoutSeconds: 10,
      plugins: [
        new CacheableResponsePlugin({ statuses: [0, 200] })
      ]
    });

    try {
      const response = await networkFirst.handle({ request, event });
      return response;
    } catch (error) {
      // If it's a mutation (POST, PUT, DELETE, PATCH), queue for background sync
      if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(request.method)) {
        if (bgSyncSupported && bgSyncPlugin) {
          // Clone request before queuing
          const clonedRequest = request.clone();
          await bgSyncPlugin.queueDidFail?.({ request: clonedRequest });

          // Notify client that request is queued
          const clients = await self.clients.matchAll();
          clients.forEach(client => {
            client.postMessage({
              type: 'REQUEST_QUEUED',
              method: request.method,
              url: request.url
            });
          });
        } else {
          // For iOS/Safari, notify client to use IndexedDB fallback
          const clients = await self.clients.matchAll();
          clients.forEach(client => {
            client.postMessage({
              type: 'QUEUE_TO_INDEXEDDB',
              method: request.method,
              url: request.url,
              body: request.bodyUsed ? null : request.body
            });
          });
        }
      }
      throw error;
    }
  }
);

// ============ OFFLINE FALLBACK ============

// Handle navigation requests with offline fallback
const navigationHandler = async ({ request }) => {
  try {
    return await new NetworkFirst({
      cacheName: 'pages-cache',
      networkTimeoutSeconds: 5
    }).handle({ request });
  } catch (error) {
    const cache = await caches.open(CACHE_NAME);
    const cachedResponse = await cache.match('/offline.html');
    return cachedResponse || new Response('Offline', { status: 503 });
  }
};

registerRoute(
  ({ request }) => request.mode === 'navigate',
  navigationHandler
);

// Default handler for other requests
setDefaultHandler(new NetworkFirst({
  cacheName: 'default-cache',
  networkTimeoutSeconds: 10
}));

// ============ SERVICE WORKER LIFECYCLE ============

// Skip waiting and claim clients immediately
self.addEventListener('install', (event) => {
  self.skipWaiting();
  console.log('Service Worker installed');
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      // Clean up old caches
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (!cacheName.includes(CACHE_VERSION) &&
                !['images-cache', 'google-fonts', 'cdn-cache', 'api-cache'].includes(cacheName)) {
              console.log('Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
    ])
  );
  console.log('Service Worker activated');
});

// ============ GESTION DES NOTIFICATIONS ET CONGÉS ============

// Fonction pour obtenir la date du jour au format YYYY-MM-DD
function getTodayDate() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

// Fonction pour vérifier si on est en période de congés
async function isOnVacation() {
  try {
    const cache = await caches.open(CACHE_NAME);
    const vacationsResponse = await cache.match('/vacations-data');

    if (vacationsResponse) {
      const vacations = await vacationsResponse.json();
      const today = getTodayDate();

      return vacations.some(v =>
        today >= v.dateDebut && today <= v.dateFin
      );
    }

    return false;
  } catch (error) {
    console.error('Erreur vérification congés:', error);
    return false;
  }
}

// Charger les paramètres depuis le cache
async function loadNotificationSettings() {
  try {
    const cache = await caches.open(CACHE_NAME);
    const settingsResponse = await cache.match('/notification-settings');
    if (settingsResponse) {
      return await settingsResponse.json();
    }
  } catch (error) {
    console.error('Erreur chargement paramètres:', error);
  }
  return null;
}

// Sauvegarder la dernière notification envoyée
async function saveLastNotificationDate(date) {
  try {
    const cache = await caches.open(CACHE_NAME);
    const response = new Response(JSON.stringify({ date }), {
      headers: { 'Content-Type': 'application/json' }
    });
    await cache.put('/last-notification-date', response);
  } catch (error) {
    console.error('Erreur sauvegarde date notification:', error);
  }
}

// Charger la dernière date de notification
async function getLastNotificationDate() {
  try {
    const cache = await caches.open(CACHE_NAME);
    const response = await cache.match('/last-notification-date');
    if (response) {
      const data = await response.json();
      return data.date;
    }
  } catch (error) {
    console.error('Erreur chargement date notification:', error);
  }
  return null;
}

// Vérifier si une notification doit être envoyée
async function shouldSendNotification(settings) {
  if (!settings || !settings.enabled) return false;

  const now = new Date();
  const today = getTodayDate();
  const currentDay = now.getDay();

  // Vérifier si c'est un jour actif
  if (!settings.weekdays.includes(currentDay)) return false;

  // Vérifier l'heure
  const [targetHours, targetMinutes] = settings.time.split(':').map(Number);
  const currentHours = now.getHours();
  const currentMinutes = now.getMinutes();

  // On est après l'heure programmée ?
  const isPastTime = (currentHours > targetHours) ||
                     (currentHours === targetHours && currentMinutes >= targetMinutes);

  if (!isPastTime) return false;

  // Vérifier si on a déjà envoyé une notification aujourd'hui
  const lastDate = await getLastNotificationDate();
  if (lastDate === today) return false;

  // Vérifier les congés
  const onVacation = await isOnVacation();
  if (onVacation) return false;

  return true;
}

// Écouter les messages du client
self.addEventListener('message', async (event) => {
  const { type, data } = event.data;

  switch (type) {
    case 'UPDATE_VACATIONS':
      const vacationsCache = await caches.open(CACHE_NAME);
      const vacationsResponse = new Response(JSON.stringify(event.data.vacations), {
        headers: { 'Content-Type': 'application/json' }
      });
      await vacationsCache.put('/vacations-data', vacationsResponse);
      break;

    case 'UPDATE_NOTIFICATION_SETTINGS':
    case 'SCHEDULE_NOTIFICATIONS':
      const settingsCache = await caches.open(CACHE_NAME);
      const settingsResponse = new Response(JSON.stringify(event.data.settings), {
        headers: { 'Content-Type': 'application/json' }
      });
      await settingsCache.put('/notification-settings', settingsResponse);

      // Enregistrer pour periodic sync si disponible
      if ('periodicSync' in self.registration) {
        try {
          await self.registration.periodicSync.register('daily-notification', {
            minInterval: 60 * 60 * 1000 // 1 heure minimum
          });
          console.log('Periodic sync enregistré');
        } catch (error) {
          console.log('Periodic sync non disponible:', error);
        }
      }

      // Vérifier immédiatement si une notification est due
      await checkAndSendNotification();
      break;

    case 'CANCEL_NOTIFICATIONS':
      if ('periodicSync' in self.registration) {
        try {
          await self.registration.periodicSync.unregister('daily-notification');
        } catch (error) {
          console.log('Erreur unregister periodic sync:', error);
        }
      }
      break;

    case 'CHECK_NOTIFICATION':
      // Appelé quand l'app s'ouvre - vérifier si notification manquée
      await checkAndSendNotification();
      break;

    case 'SKIP_WAITING':
      self.skipWaiting();
      break;

    case 'GET_SYNC_STATUS':
      // Return background sync support status
      const clients = await self.clients.matchAll();
      clients.forEach(client => {
        client.postMessage({
          type: 'SYNC_STATUS',
          supported: bgSyncSupported
        });
      });
      break;

    case 'FORCE_SYNC':
      // Trigger manual sync for queued requests
      if (bgSyncSupported && 'sync' in self.registration) {
        try {
          await self.registration.sync.register('api-queue');
        } catch (error) {
          console.error('Manual sync trigger failed:', error);
        }
      }
      break;
  }
});

// Vérifier et envoyer la notification si nécessaire
async function checkAndSendNotification() {
  const settings = await loadNotificationSettings();

  if (await shouldSendNotification(settings)) {
    await sendDailyReminder();
  }
}

// Periodic Background Sync (Chrome Android principalement)
self.addEventListener('periodicsync', async (event) => {
  if (event.tag === 'daily-notification') {
    event.waitUntil(checkAndSendNotification());
  }
});

// Background Sync event for API queue
self.addEventListener('sync', async (event) => {
  if (event.tag === 'api-queue') {
    console.log('Background sync triggered for api-queue');
    // Workbox BackgroundSyncPlugin handles this automatically
  }
});

// Fonction pour envoyer une notification
async function sendDailyReminder() {
  // Vérifier les permissions
  if (!self.registration || !self.registration.showNotification) {
    console.log('Notifications non supportées');
    return;
  }

  // Envoyer la notification
  try {
    await self.registration.showNotification('Log My Job', {
      body: 'N\'oublie pas de logger ta journée client !',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      tag: 'daily-reminder',
      requireInteraction: false,
      vibrate: [200, 100, 200],
      data: {
        url: '/'
      }
    });

    // Marquer comme envoyé aujourd'hui
    await saveLastNotificationDate(getTodayDate());
    console.log('Notification quotidienne envoyée');
  } catch (error) {
    console.error('Erreur envoi notification:', error);
  }
}

// Gestion des clics sur les notifications
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  event.waitUntil(
    clients.openWindow('/')
  );
});
