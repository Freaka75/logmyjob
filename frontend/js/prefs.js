// Synchronisation des reglages entre appareils.
//
// Les reglages restent lus/ecrits dans localStorage par le reste de l'application
// (cles ci-dessous). Ce module en envoie une copie dans user_settings.preferences
// et la recupere au demarrage. Regle : la version la plus recente gagne (updatedAt).

const Prefs = (() => {
    const KEYS = [
        'notificationSettings',
        'assistantSettings',
        'autoBackupEnabled',
        'theme',
        'app-language',
        'clientColors'
    ];
    const STAMP_KEY = 'lmj:prefs:updatedAt';
    const DIRTY_KEY = 'lmj:prefs:dirty';
    const PUSH_DELAY_MS = 1500;

    let pushTimer = null;

    function snapshot() {
        const values = {};
        for (const key of KEYS) {
            const value = localStorage.getItem(key);
            if (value !== null) values[key] = value;
        }
        return { values, updatedAt: Number(localStorage.getItem(STAMP_KEY) || 0) };
    }

    function applyValues(values) {
        for (const key of KEYS) {
            if (typeof values[key] === 'string') {
                localStorage.setItem(key, values[key]);
            }
        }
    }

    async function push() {
        if (!navigator.onLine) return;
        try {
            await api.savePreferences(snapshot());
            localStorage.removeItem(DIRTY_KEY);
        } catch (error) {
            console.error('Prefs: envoi impossible, nouvel essai plus tard', error);
        }
    }

    // A appeler apres chaque modification d'un reglage synchronise.
    function touch() {
        localStorage.setItem(STAMP_KEY, String(Date.now()));
        localStorage.setItem(DIRTY_KEY, '1');
        clearTimeout(pushTimer);
        pushTimer = setTimeout(push, PUSH_DELAY_MS);
    }

    // Recupere les reglages distants. Retourne true si les reglages locaux ont change.
    async function pull() {
        if (!navigator.onLine) return false;

        let remote;
        try {
            remote = await api.getPreferences();
        } catch (error) {
            console.error('Prefs: lecture impossible', error);
            return false;
        }

        const local = snapshot();
        const remoteStamp = Number(remote?.updatedAt || 0);

        if (remote && remoteStamp > local.updatedAt) {
            applyValues(remote.values || {});
            localStorage.setItem(STAMP_KEY, String(remoteStamp));
            localStorage.removeItem(DIRTY_KEY);
            return true;
        }

        // Rien a distance, ou version locale plus recente : on envoie la version locale.
        if (localStorage.getItem(DIRTY_KEY) || (!remote && Object.keys(local.values).length > 0)) {
            if (!local.updatedAt) localStorage.setItem(STAMP_KEY, String(Date.now()));
            await push();
        }
        return false;
    }

    // Restauration depuis une sauvegarde JSON.
    async function restore(preferences) {
        applyValues(preferences.values || {});
        touch();
        await push();
    }

    window.addEventListener('online', () => {
        if (localStorage.getItem(DIRTY_KEY)) push();
    });

    return { snapshot, touch, pull, restore };
})();

window.Prefs = Prefs;
