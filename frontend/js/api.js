// Module API pour les operations de donnees avec Supabase.
// Les lectures et ecritures de jours / clients / conges passent par OfflineStore
// (cache local + file d'attente hors ligne).

async function currentUserId() {
    const user = await auth.getCurrentUser();
    if (!user) throw new Error('Utilisateur non connecté');
    return user.id;
}

function mapDay(row) {
    return {
        id: row.id,
        date: row.date,
        client: row.client,
        duree: row.duration,
        notes: row.notes,
        billing_month: row.billing_month,
        created_at: row.created_at
    };
}

function mapHoliday(row) {
    return {
        id: row.id,
        dateDebut: row.start_date,
        dateFin: row.end_date,
        type: row.type,
        created_at: row.created_at
    };
}

function sortByDateDesc(rows, field) {
    return [...rows].sort((a, b) => (a[field] < b[field] ? 1 : a[field] > b[field] ? -1 : 0));
}

async function selectAll(table, orderField, ascending) {
    const { data, error } = await getSupabase()
        .from(table)
        .select('*')
        .order(orderField, { ascending });
    if (error) throw error;
    return data;
}

const api = {
    // ===== DAYS (Presences) =====

    async getAllDays() {
        const { rows } = await OfflineStore.read('days', () => selectAll('days', 'date', false));
        return sortByDateDesc(rows, 'date').map(mapDay);
    },

    async getDays(filters = {}) {
        let days = await this.getAllDays();

        if (filters.month !== undefined && filters.year) {
            const prefix = `${filters.year}-${String(filters.month + 1).padStart(2, '0')}-`;
            days = days.filter(d => d.date.startsWith(prefix));
        }
        if (filters.client) {
            days = days.filter(d => d.client === filters.client);
        }
        if (filters.limit) {
            days = days.slice(0, filters.limit);
        }
        return days;
    },

    async saveDay(id, dayData) {
        const userId = await currentUserId();
        const row = {
            id: id || crypto.randomUUID(),
            user_id: userId,
            date: dayData.date,
            client: dayData.client,
            duration: dayData.duree,
            notes: dayData.notes || null,
            billing_month: dayData.billing_month || null
        };

        const { queued } = await OfflineStore.mutate({ table: 'days', action: 'upsert', row });
        await this.ensureClient(dayData.client);

        return { success: true, queued, data: mapDay(row) };
    },

    async addDay(dayData) {
        return this.saveDay(null, dayData);
    },

    async updateDay(id, dayData) {
        return this.saveDay(id, dayData);
    },

    async deleteDay(id) {
        const { queued } = await OfflineStore.mutate({ table: 'days', action: 'delete', id });
        return { success: true, queued };
    },

    async deleteDays(ids) {
        let queued = false;
        for (const id of ids) {
            const result = await this.deleteDay(id);
            queued = queued || result.queued;
        }
        return { success: true, queued };
    },

    // ===== CLIENTS =====

    async getClients() {
        const { rows } = await OfflineStore.read('clients', () => selectAll('clients', 'name', true));
        return rows.map(c => c.name);
    },

    async getClientsWithColors() {
        return selectAll('clients', 'name', true);
    },

    async ensureClient(name) {
        const userId = await currentUserId();
        await OfflineStore.mutate({
            table: 'clients',
            action: 'ensure-client',
            row: { user_id: userId, name }
        });
    },

    // ===== HOLIDAYS (Conges) =====

    async getHolidays() {
        const { rows } = await OfflineStore.read('holidays', () => selectAll('holidays', 'start_date', false));
        return sortByDateDesc(rows, 'start_date').map(mapHoliday);
    },

    async saveHoliday(id, holidayData) {
        const userId = await currentUserId();
        const row = {
            id: id || crypto.randomUUID(),
            user_id: userId,
            start_date: holidayData.dateDebut,
            end_date: holidayData.dateFin,
            type: holidayData.type
        };

        const { queued } = await OfflineStore.mutate({ table: 'holidays', action: 'upsert', row });
        return { success: true, queued, data: mapHoliday(row) };
    },

    async addHoliday(holidayData) {
        return this.saveHoliday(null, holidayData);
    },

    async updateHoliday(id, holidayData) {
        return this.saveHoliday(id, holidayData);
    },

    async deleteHoliday(id) {
        const { queued } = await OfflineStore.mutate({ table: 'holidays', action: 'delete', id });
        return { success: true, queued };
    },

    // ===== PREFERENCES (synchronisees entre appareils) =====
    // Colonne user_settings.preferences (jsonb) : { values: {...}, updatedAt: <ms> }

    async getPreferences() {
        const { data, error } = await getSupabase()
            .from('user_settings')
            .select('preferences')
            .maybeSingle();
        if (error) throw error;
        const preferences = data?.preferences;
        // Valeur par defaut de la colonne = {} : considere comme "jamais synchronise".
        return preferences && preferences.updatedAt ? preferences : null;
    },

    async savePreferences(preferences) {
        const userId = await currentUserId();
        const { error } = await getSupabase()
            .from('user_settings')
            .upsert({ user_id: userId, preferences }, { onConflict: 'user_id' });
        if (error) throw error;
    },

    // ===== EXPORT/IMPORT =====

    async exportAllData() {
        const [days, clients, holidays] = await Promise.all([
            this.getAllDays(),
            this.getClientsWithColors(),
            this.getHolidays()
        ]);

        return {
            version: CONFIG.VERSION,
            exportDate: new Date().toISOString(),
            data: {
                days,
                clients,
                holidays,
                preferences: Prefs.snapshot()
            }
        };
    },

    async importData(backupData, clearExisting = true) {
        if (!navigator.onLine) {
            throw new Error('La restauration necessite une connexion internet');
        }

        const supabase = getSupabase();
        const userId = await currentUserId();
        const check = (result) => {
            if (result.error) throw result.error;
            return result;
        };

        if (clearExisting) {
            const results = await Promise.all([
                supabase.from('days').delete().eq('user_id', userId),
                supabase.from('clients').delete().eq('user_id', userId),
                supabase.from('holidays').delete().eq('user_id', userId)
            ]);
            results.forEach(check);
        }

        const data = backupData.data || backupData;

        if (data.clients && data.clients.length > 0) {
            check(await supabase.from('clients').upsert(
                data.clients.map(c => ({
                    user_id: userId,
                    name: typeof c === 'string' ? c : c.name,
                    color: typeof c === 'string' ? null : c.color
                })),
                { onConflict: 'user_id,name', ignoreDuplicates: true }
            ));
        }

        if (data.days && data.days.length > 0) {
            check(await supabase.from('days').insert(
                data.days.map(d => ({
                    user_id: userId,
                    date: d.date,
                    client: d.client,
                    duration: d.duree || d.duration,
                    notes: d.notes,
                    billing_month: d.billing_month || null
                }))
            ));
        }

        if (data.holidays && data.holidays.length > 0) {
            check(await supabase.from('holidays').insert(
                data.holidays.map(h => ({
                    user_id: userId,
                    start_date: h.dateDebut || h.start_date,
                    end_date: h.dateFin || h.end_date,
                    type: h.type
                }))
            ));
        }

        if (data.preferences) {
            await Prefs.restore(data.preferences);
        }

        return { success: true };
    }
};

window.api = api;
