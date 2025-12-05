const CACHE_NAME = 'log-my-job-v39';
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
    // Récupérer les congés depuis localStorage via IndexedDB ou Cache API
    // Note: Service Worker n'a pas accès direct à localStorage
    // On utilise une approche alternative via postMessage ou Cache API

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

// Variables pour la planification
let notificationSettings = null;
let notificationTimer = null;

// Écouter les messages du client
self.addEventListener('message', async (event) => {
  const { type, data } = event.data;

  switch (type) {
    case 'UPDATE_VACATIONS':
      // Stocker les congés dans le cache
      const vacationsCache = await caches.open(CACHE_NAME);
      const vacationsResponse = new Response(JSON.stringify(event.data.vacations), {
        headers: { 'Content-Type': 'application/json' }
      });
      await vacationsCache.put('/vacations-data', vacationsResponse);
      break;

    case 'UPDATE_NOTIFICATION_SETTINGS':
      // Stocker les paramètres de notifications
      notificationSettings = event.data.settings;
      const settingsCache = await caches.open(CACHE_NAME);
      const settingsResponse = new Response(JSON.stringify(event.data.settings), {
        headers: { 'Content-Type': 'application/json' }
      });
      await settingsCache.put('/notification-settings', settingsResponse);
      break;

    case 'SCHEDULE_NOTIFICATIONS':
      // Planifier les notifications
      notificationSettings = event.data.settings;
      await scheduleNextNotification();
      break;

    case 'CANCEL_NOTIFICATIONS':
      // Annuler les notifications planifiées
      if (notificationTimer) {
        clearTimeout(notificationTimer);
        notificationTimer = null;
      }
      break;
  }
});

// Fonction pour planifier la prochaine notification
async function scheduleNextNotification() {
  if (!notificationSettings || !notificationSettings.enabled) {
    return;
  }

  // Charger les paramètres depuis le cache si pas en mémoire
  if (!notificationSettings) {
    const cache = await caches.open(CACHE_NAME);
    const settingsResponse = await cache.match('/notification-settings');
    if (settingsResponse) {
      notificationSettings = await settingsResponse.json();
    }
  }

  if (!notificationSettings || !notificationSettings.enabled) {
    return;
  }

  // Calculer le temps jusqu'à la prochaine notification
  const now = new Date();
  const [hours, minutes] = notificationSettings.time.split(':');

  let nextNotification = new Date();
  nextNotification.setHours(parseInt(hours), parseInt(minutes), 0, 0);

  // Si l'heure est déjà passée aujourd'hui, planifier pour demain
  if (nextNotification <= now) {
    nextNotification.setDate(nextNotification.getDate() + 1);
  }

  // Vérifier si le jour est actif
  while (!notificationSettings.weekdays.includes(nextNotification.getDay())) {
    nextNotification.setDate(nextNotification.getDate() + 1);
  }

  const delay = nextNotification.getTime() - now.getTime();

  // Annuler le timer précédent
  if (notificationTimer) {
    clearTimeout(notificationTimer);
  }

  // Planifier la notification
  notificationTimer = setTimeout(async () => {
    await sendDailyReminder();
    // Planifier la suivante
    await scheduleNextNotification();
  }, delay);

  console.log('Prochaine notification planifiée pour:', nextNotification);
}

// Fonction pour envoyer une notification
async function sendDailyReminder() {
  // Vérifier les congés
  const onVacation = await isOnVacation();
  if (onVacation) {
    console.log('En congés - notification annulée');
    return;
  }

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
