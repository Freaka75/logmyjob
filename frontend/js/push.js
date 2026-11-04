// Notifications push : abonnement du navigateur et enregistrement dans Supabase.
// Les rappels sont envoyes par l'Edge Function send-reminders (supabase/functions/),
// planifiee par pg_cron, meme quand l'application est fermee.
// iPhone / iPad : il faut avoir installe l'application sur l'ecran d'accueil (iOS 16.4+).

const Push = (() => {
    function isSupported() {
        return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
    }

    function isIOS() {
        return /iPad|iPhone|iPod/.test(navigator.userAgent)
            || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    }

    function isStandalone() {
        return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
    }

    // Sur iOS hors application installee, PushManager n'existe pas.
    function needsInstallFirst() {
        return isIOS() && !isStandalone();
    }

    function base64UrlToUint8Array(base64Url) {
        const padding = '='.repeat((4 - (base64Url.length % 4)) % 4);
        const base64 = (base64Url + padding).replace(/-/g, '+').replace(/_/g, '/');
        const raw = atob(base64);
        return Uint8Array.from(raw, c => c.charCodeAt(0));
    }

    async function getRegistration() {
        return navigator.serviceWorker.ready;
    }

    async function save(subscription) {
        const user = await auth.getCurrentUser();
        if (!user) throw new Error('Utilisateur non connecte');
        const data = subscription.toJSON();

        const { error } = await getSupabase()
            .from('push_subscriptions')
            .upsert({
                user_id: user.id,
                endpoint: data.endpoint,
                p256dh: data.keys.p256dh,
                auth: data.keys.auth,
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Paris',
                user_agent: navigator.userAgent.slice(0, 200),
                updated_at: new Date().toISOString()
            }, { onConflict: 'endpoint' });
        if (error) throw error;
    }

    // A appeler suite a un geste de l'utilisateur (demande de permission).
    async function subscribe() {
        if (needsInstallFirst()) {
            throw new Error("Sur iPhone, installez d'abord l'application sur l'ecran d'accueil (Partager > Sur l'ecran d'accueil)");
        }
        if (!isSupported()) {
            throw new Error('Notifications push non supportees par ce navigateur');
        }

        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
            throw new Error('Permission de notifications refusee');
        }

        const registration = await getRegistration();
        let subscription = await registration.pushManager.getSubscription();
        if (!subscription) {
            subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: base64UrlToUint8Array(CONFIG.VAPID_PUBLIC_KEY)
            });
        }
        await save(subscription);
        return subscription;
    }

    async function unsubscribe() {
        if (!isSupported()) return;
        const registration = await getRegistration();
        const subscription = await registration.pushManager.getSubscription();
        if (!subscription) return;

        const { error } = await getSupabase()
            .from('push_subscriptions')
            .delete()
            .eq('endpoint', subscription.endpoint);
        if (error) console.error('Push: suppression de l\'abonnement impossible', error);
        await subscription.unsubscribe();
    }

    // Au demarrage : remet a jour l'abonnement (fuseau horaire, cle renouvelee par le navigateur).
    async function refresh() {
        if (!isSupported() || Notification.permission !== 'granted' || !navigator.onLine) return;
        try {
            const registration = await getRegistration();
            let subscription = await registration.pushManager.getSubscription();
            if (!subscription) {
                subscription = await registration.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: base64UrlToUint8Array(CONFIG.VAPID_PUBLIC_KEY)
                });
            }
            await save(subscription);
        } catch (error) {
            console.error('Push: mise a jour de l\'abonnement impossible', error);
        }
    }

    // Demande au serveur d'envoyer un vrai push de test a tous mes appareils.
    async function sendTest() {
        const session = await auth.getSession();
        if (!session) throw new Error('Session expiree, reconnectez-vous');

        const response = await fetch(`${CONFIG.SUPABASE_URL}/functions/v1/send-reminders`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                apikey: CONFIG.SUPABASE_ANON_KEY,
                Authorization: `Bearer ${session.access_token}`
            },
            body: JSON.stringify({ test: true })
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.error || `Erreur ${response.status}`);
        return result;
    }

    return { isSupported, needsInstallFirst, subscribe, unsubscribe, refresh, sendTest };
})();

window.Push = Push;
