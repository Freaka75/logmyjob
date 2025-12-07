/**
 * Offline Sync Module for iOS/Safari
 * Provides IndexedDB-based queue management as fallback for browsers without Background Sync
 */

const OfflineSync = (function() {
  const DB_NAME = 'logmyjob-offline';
  const DB_VERSION = 1;
  const STORE_NAME = 'pending-requests';

  let db = null;
  let isOnline = navigator.onLine;
  let syncInProgress = false;

  // ============ INDEXEDDB SETUP ============

  async function openDatabase() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        db = request.result;
        resolve(db);
      };

      request.onupgradeneeded = (event) => {
        const database = event.target.result;

        if (!database.objectStoreNames.contains(STORE_NAME)) {
          const store = database.createObjectStore(STORE_NAME, {
            keyPath: 'id',
            autoIncrement: true
          });
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('type', 'type', { unique: false });
        }
      };
    });
  }

  async function ensureDatabase() {
    if (!db) {
      await openDatabase();
    }
    return db;
  }

  // ============ QUEUE MANAGEMENT ============

  async function addToQueue(request) {
    const database = await ensureDatabase();

    return new Promise((resolve, reject) => {
      const transaction = database.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      const entry = {
        timestamp: Date.now(),
        type: request.type || 'presence',
        method: request.method,
        url: request.url,
        body: request.body,
        headers: request.headers || {}
      };

      const addRequest = store.add(entry);
      addRequest.onsuccess = () => resolve(addRequest.result);
      addRequest.onerror = () => reject(addRequest.error);
    });
  }

  async function getQueuedRequests() {
    const database = await ensureDatabase();

    return new Promise((resolve, reject) => {
      const transaction = database.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('timestamp');

      const requests = [];
      const cursorRequest = index.openCursor();

      cursorRequest.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          requests.push(cursor.value);
          cursor.continue();
        } else {
          resolve(requests);
        }
      };

      cursorRequest.onerror = () => reject(cursorRequest.error);
    });
  }

  async function removeFromQueue(id) {
    const database = await ensureDatabase();

    return new Promise((resolve, reject) => {
      const transaction = database.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      const deleteRequest = store.delete(id);
      deleteRequest.onsuccess = () => resolve();
      deleteRequest.onerror = () => reject(deleteRequest.error);
    });
  }

  async function clearQueue() {
    const database = await ensureDatabase();

    return new Promise((resolve, reject) => {
      const transaction = database.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      const clearRequest = store.clear();
      clearRequest.onsuccess = () => resolve();
      clearRequest.onerror = () => reject(clearRequest.error);
    });
  }

  async function getQueueCount() {
    const database = await ensureDatabase();

    return new Promise((resolve, reject) => {
      const transaction = database.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);

      const countRequest = store.count();
      countRequest.onsuccess = () => resolve(countRequest.result);
      countRequest.onerror = () => reject(countRequest.error);
    });
  }

  // ============ SYNC PROCESSING ============

  async function processQueue() {
    if (syncInProgress || !isOnline) {
      return { processed: 0, failed: 0 };
    }

    syncInProgress = true;
    const results = { processed: 0, failed: 0 };

    try {
      const requests = await getQueuedRequests();

      for (const entry of requests) {
        try {
          const response = await fetch(entry.url, {
            method: entry.method,
            headers: {
              'Content-Type': 'application/json',
              ...entry.headers
            },
            body: entry.body ? JSON.stringify(entry.body) : undefined
          });

          if (response.ok) {
            await removeFromQueue(entry.id);
            results.processed++;
            console.log(`Offline sync: processed request ${entry.id}`);
          } else {
            results.failed++;
            console.error(`Offline sync: failed request ${entry.id}`, response.status);
          }
        } catch (error) {
          results.failed++;
          console.error(`Offline sync: error processing ${entry.id}`, error);
          // Don't remove from queue if fetch failed due to network
          if (!navigator.onLine) {
            break; // Stop processing if we went offline
          }
        }
      }
    } finally {
      syncInProgress = false;
    }

    // Dispatch event with results
    window.dispatchEvent(new CustomEvent('offline-sync-complete', {
      detail: results
    }));

    return results;
  }

  // ============ PRESENCE-SPECIFIC HELPERS ============

  async function queuePresenceCreate(presence) {
    const { supabaseUrl, supabaseKey } = await getSupabaseConfig();
    const user = await getCurrentUser();

    if (!user) {
      throw new Error('User not authenticated');
    }

    return addToQueue({
      type: 'presence-create',
      method: 'POST',
      url: `${supabaseUrl}/rest/v1/presence`,
      body: {
        ...presence,
        user_id: user.id
      },
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${await getAccessToken()}`,
        'Prefer': 'return=representation'
      }
    });
  }

  async function queuePresenceUpdate(id, updates) {
    const { supabaseUrl, supabaseKey } = await getSupabaseConfig();

    return addToQueue({
      type: 'presence-update',
      method: 'PATCH',
      url: `${supabaseUrl}/rest/v1/presence?id=eq.${id}`,
      body: updates,
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${await getAccessToken()}`,
        'Prefer': 'return=representation'
      }
    });
  }

  async function queuePresenceDelete(id) {
    const { supabaseUrl, supabaseKey } = await getSupabaseConfig();

    return addToQueue({
      type: 'presence-delete',
      method: 'DELETE',
      url: `${supabaseUrl}/rest/v1/presence?id=eq.${id}`,
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${await getAccessToken()}`
      }
    });
  }

  // ============ HELPER FUNCTIONS ============

  async function getSupabaseConfig() {
    // Get from config.js globals
    return {
      supabaseUrl: window.SUPABASE_URL || '',
      supabaseKey: window.SUPABASE_ANON_KEY || ''
    };
  }

  async function getCurrentUser() {
    if (window.supabase) {
      const { data: { user } } = await window.supabase.auth.getUser();
      return user;
    }
    return null;
  }

  async function getAccessToken() {
    if (window.supabase) {
      const { data: { session } } = await window.supabase.auth.getSession();
      return session?.access_token || '';
    }
    return '';
  }

  // ============ ONLINE/OFFLINE DETECTION ============

  function setupNetworkListeners() {
    window.addEventListener('online', () => {
      isOnline = true;
      console.log('Network: back online');

      // Auto-sync when coming back online
      setTimeout(() => {
        processQueue().then(results => {
          if (results.processed > 0) {
            showSyncNotification(results);
          }
        });
      }, 1000); // Small delay to ensure network is stable
    });

    window.addEventListener('offline', () => {
      isOnline = false;
      console.log('Network: went offline');
    });
  }

  function showSyncNotification(results) {
    const message = results.failed > 0
      ? `Synchronisation : ${results.processed} réussies, ${results.failed} échouées`
      : `${results.processed} modifications synchronisées`;

    // Dispatch event for UI to handle
    window.dispatchEvent(new CustomEvent('show-toast', {
      detail: {
        message,
        type: results.failed > 0 ? 'warning' : 'success'
      }
    }));
  }

  // ============ SERVICE WORKER COMMUNICATION ============

  function setupServiceWorkerListener() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', async (event) => {
        const { type, method, url, body } = event.data;

        if (type === 'QUEUE_TO_INDEXEDDB') {
          // Service worker is asking us to queue this request
          try {
            await addToQueue({ method, url, body });
            console.log('Request queued to IndexedDB');

            window.dispatchEvent(new CustomEvent('show-toast', {
              detail: {
                message: 'Modification sauvegardée localement',
                type: 'info'
              }
            }));
          } catch (error) {
            console.error('Failed to queue request:', error);
          }
        }

        if (type === 'SYNC_STATUS') {
          // Background sync status from service worker
          window.dispatchEvent(new CustomEvent('background-sync-status', {
            detail: { supported: event.data.supported }
          }));
        }

        if (type === 'SYNC_COMPLETE') {
          // Background sync completed a request
          window.dispatchEvent(new CustomEvent('show-toast', {
            detail: {
              message: 'Modification synchronisée',
              type: 'success'
            }
          }));
        }
      });
    }
  }

  // ============ STATUS & UI HELPERS ============

  function isBackgroundSyncSupported() {
    return 'serviceWorker' in navigator && 'SyncManager' in window;
  }

  function isIOSDevice() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  }

  function isSafari() {
    return /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
  }

  function needsIndexedDBFallback() {
    return !isBackgroundSyncSupported() || isIOSDevice() || isSafari();
  }

  // ============ INITIALIZATION ============

  async function init() {
    try {
      await openDatabase();
      setupNetworkListeners();
      setupServiceWorkerListener();

      // Check for pending requests on init
      const count = await getQueueCount();
      if (count > 0 && isOnline) {
        console.log(`Offline sync: ${count} pending requests found`);
        processQueue();
      }

      console.log('Offline sync module initialized', {
        needsFallback: needsIndexedDBFallback(),
        isIOS: isIOSDevice(),
        isSafari: isSafari(),
        bgSyncSupported: isBackgroundSyncSupported()
      });
    } catch (error) {
      console.error('Failed to initialize offline sync:', error);
    }
  }

  // ============ PUBLIC API ============

  return {
    init,
    addToQueue,
    getQueuedRequests,
    getQueueCount,
    processQueue,
    clearQueue,
    queuePresenceCreate,
    queuePresenceUpdate,
    queuePresenceDelete,
    isOnline: () => isOnline,
    isBackgroundSyncSupported,
    needsIndexedDBFallback,
    isIOSDevice,
    isSafari
  };
})();

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => OfflineSync.init());
} else {
  OfflineSync.init();
}
