// Stockage hors ligne : cache local des donnees + file d'attente des modifications.
//
// - Lecture : chaque chargement reussi depuis Supabase est copie dans localStorage.
//   Sans reseau, l'application lit cette copie.
// - Ecriture : une modification est d'abord tentee en direct. En cas de coupure reseau,
//   elle est appliquee au cache local et mise en file d'attente, puis rejouee au retour
//   du reseau. Les lignes ont un id genere cote client et sont envoyees en upsert :
//   rejouer une operation ne cree pas de doublon.
//
// Cles localStorage : "lmj:<user_id>:cache:<table>" et "lmj:<user_id>:queue".

const OfflineStore = (() => {
    let userId = null;
    let flushPromise = null;

    function key(name) {
        if (!userId) throw new Error('OfflineStore: utilisateur non defini');
        return `lmj:${userId}:${name}`;
    }

    function readJson(name, fallback) {
        try {
            const raw = localStorage.getItem(key(name));
            return raw ? JSON.parse(raw) : fallback;
        } catch (error) {
            console.error('OfflineStore: lecture impossible', name, error);
            return fallback;
        }
    }

    function writeJson(name, value) {
        localStorage.setItem(key(name), JSON.stringify(value));
    }

    // ===== Cache =====

    function getCache(table) {
        return readJson(`cache:${table}`, null);
    }

    function setCache(table, rows) {
        writeJson(`cache:${table}`, rows);
    }

    function applyToCache(op) {
        const rows = getCache(op.table) || [];
        let next = rows;

        if (op.action === 'upsert') {
            const exists = rows.some(r => r.id === op.row.id);
            next = exists
                ? rows.map(r => (r.id === op.row.id ? { ...r, ...op.row } : r))
                : [op.row, ...rows];
        } else if (op.action === 'delete') {
            next = rows.filter(r => r.id !== op.id);
        } else if (op.action === 'ensure-client') {
            if (!rows.some(r => r.name === op.row.name)) {
                next = [...rows, op.row].sort((a, b) => a.name.localeCompare(b.name));
            }
        }

        setCache(op.table, next);
    }

    // ===== File d'attente =====

    function getQueue() {
        return readJson('queue', []);
    }

    function setQueue(queue) {
        writeJson('queue', queue);
        window.dispatchEvent(new CustomEvent('offline-store-change', {
            detail: { pending: queue.length }
        }));
    }

    function pendingCount() {
        return userId ? getQueue().length : 0;
    }

    // Erreur due au reseau (a reessayer plus tard) plutot qu'un refus du serveur.
    function isNetworkError(error) {
        if (!navigator.onLine) return true;
        if (error instanceof TypeError) return true;
        const text = `${error?.name || ''} ${error?.message || error || ''}`;
        return /failed to fetch|networkerror|load failed|network request failed|fetch/i.test(text);
    }

    // Session expiree / jeton invalide : on garde l'operation, elle repartira apres reconnexion.
    function isAuthError(error) {
        const text = `${error?.code || ''} ${error?.message || ''}`;
        return error?.status === 401 || /PGRST301|JWT/i.test(text);
    }

    async function send(op) {
        const supabase = getSupabase();
        let result;

        if (op.action === 'upsert') {
            result = await supabase.from(op.table).upsert(op.row);
        } else if (op.action === 'delete') {
            result = await supabase.from(op.table).delete().eq('id', op.id);
        } else if (op.action === 'ensure-client') {
            result = await supabase
                .from('clients')
                .upsert(op.row, { onConflict: 'user_id,name', ignoreDuplicates: true });
        } else {
            throw new Error(`OfflineStore: action inconnue ${op.action}`);
        }

        if (result.error && result.error.code !== '23505') {
            throw result.error;
        }
    }

    // Envoie une modification. Retourne { queued: true } si elle attend le reseau.
    // Une erreur du serveur (donnee refusee) est remontee a l'appelant.
    async function mutate(op) {
        const entry = { ...op, qid: crypto.randomUUID(), queuedAt: Date.now() };

        // Direct si en ligne et rien en attente (sinon on respecte l'ordre de la file).
        if (navigator.onLine && getQueue().length === 0) {
            try {
                await send(entry);
                applyToCache(entry);
                return { queued: false };
            } catch (error) {
                if (!isNetworkError(error)) throw error;
            }
        }

        applyToCache(entry);
        setQueue([...getQueue(), entry]);
        flush(); // tentative en arriere-plan, sans attendre
        return { queued: true };
    }

    // Rejoue la file dans l'ordre. S'arrete a la premiere coupure reseau.
    async function flush() {
        if (!userId || !navigator.onLine) {
            return { sent: 0, dropped: 0, pending: pendingCount() };
        }
        if (flushPromise) return flushPromise;

        flushPromise = (async () => {
            let sent = 0;
            let dropped = 0;

            for (const op of getQueue()) {
                try {
                    await send(op);
                    sent++;
                } catch (error) {
                    if (isNetworkError(error) || isAuthError(error)) break;
                    // Refus definitif du serveur : on retire l'operation pour ne pas bloquer la file.
                    console.error('OfflineStore: operation refusee par le serveur', op, error);
                    dropped++;
                }
                setQueue(getQueue().filter(q => q.qid !== op.qid));
            }

            return { sent, dropped, pending: pendingCount() };
        })();

        try {
            const result = await flushPromise;
            if (result.sent > 0 || result.dropped > 0) {
                window.dispatchEvent(new CustomEvent('offline-store-synced', { detail: result }));
            }
            return result;
        } finally {
            flushPromise = null;
        }
    }

    // Lecture : depuis Supabase si possible (et mise en cache), sinon depuis le cache.
    // Retourne { rows, fromCache }.
    async function read(table, fetchRows) {
        if (navigator.onLine) {
            try {
                await flush();
                const rows = await fetchRows();
                // Ne pas ecraser des modifications locales encore en attente.
                if (pendingCount() === 0) {
                    setCache(table, rows);
                    return { rows, fromCache: false };
                }
            } catch (error) {
                if (!isNetworkError(error)) throw error;
            }
        }

        const cached = getCache(table);
        if (cached === null) {
            throw new Error('Hors ligne et aucune donnee en cache');
        }
        return { rows: cached, fromCache: true };
    }

    function setUser(id) {
        userId = id;
    }

    window.addEventListener('online', () => {
        flush();
    });

    return {
        setUser,
        read,
        mutate,
        flush,
        pendingCount,
        isNetworkError
    };
})();

window.OfflineStore = OfflineStore;
