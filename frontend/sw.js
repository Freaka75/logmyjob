const CACHE_NAME = 'log-my-job-v41';
const urlsToCache = [
  '/',
  '/index.html',
  '/auth.html',
  '/css/style.css',
  '/js/config.js',
  '/js/supabase-client.js',
  '/js/auth.js',
  '/js/api.js',
  '/js/translations.js',
  '/js/app.js',
  '/js/calendar.js',
  '/js/history.js',
  '/js/export.js',
  '/js/stats.js',
  '/manifest.json'
];

// Installation du Service Worker
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache ouvert');
        return cache.addAll(urlsToCache);
      })
  );
});

// Activation du Service Worker
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Suppression ancien cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Interception des requêtes
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Retourner la ressource du cache si disponible
        if (response) {
          return response;
        }

        // Sinon, faire la requête réseau
        return fetch(event.request).then(response => {
          // Ne pas mettre en cache les requêtes API
          if (event.request.url.includes('/api/')) {
            return response;
          }

          // Vérifier si la réponse est valide
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          // Cloner la réponse
          const responseToCache = response.clone();

          caches.open(CACHE_NAME)
            .then(cache => {
              cache.put(event.request, responseToCache);
            });

          return response;
        });
      })
      .catch(() => {
        // En cas d'erreur, retourner une page offline si disponible
        return caches.match('/index.html');
      })
  );
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
  const { type } = event.data;

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
