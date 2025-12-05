// Module API pour les operations de donnees avec Supabase

const api = {
    // ===== DAYS (Presences) =====

    async getDays(filters = {}) {
        const supabase = getSupabase();
        let query = supabase
            .from('days')
            .select('*')
            .order('date', { ascending: false });

        // Filtrer par mois/annee
        if (filters.month !== undefined && filters.year) {
            const startDate = `${filters.year}-${String(filters.month + 1).padStart(2, '0')}-01`;
            const lastDay = new Date(filters.year, filters.month + 1, 0).getDate();
            const endDate = `${filters.year}-${String(filters.month + 1).padStart(2, '0')}-${lastDay}`;
            query = query.gte('date', startDate).lte('date', endDate);
        }

        // Filtrer par client
        if (filters.client) {
            query = query.eq('client', filters.client);
        }

        // Limiter les resultats
        if (filters.limit) {
            query = query.limit(filters.limit);
        }

        const { data, error } = await query;
        if (error) throw error;

        // Mapper les champs pour compatibilite avec l'app existante
        return data.map(day => ({
            id: day.id,
            date: day.date,
            client: day.client,
            duree: day.duration,
            notes: day.notes,
            billing_month: day.billing_month,
            created_at: day.created_at
        }));
    },

    async getAllDays() {
        return this.getDays();
    },

    async addDay(dayData) {
        const supabase = getSupabase();
        const user = await auth.getCurrentUser();

        const { data, error } = await supabase
            .from('days')
            .insert({
                user_id: user.id,
                date: dayData.date,
                client: dayData.client,
                duration: dayData.duree,
                notes: dayData.notes || null,
                billing_month: dayData.billing_month || null
            })
            .select()
            .single();

        if (error) throw error;

        // Ajouter le client s'il n'existe pas
        await this.ensureClient(dayData.client);

        return {
            success: true,
            data: {
                id: data.id,
                date: data.date,
                client: data.client,
                duree: data.duration,
                notes: data.notes,
                billing_month: data.billing_month
            }
        };
    },

    async updateDay(id, dayData) {
        const supabase = getSupabase();

        const { data, error } = await supabase
            .from('days')
            .update({
                date: dayData.date,
                client: dayData.client,
                duration: dayData.duree,
                notes: dayData.notes || null,
                billing_month: dayData.billing_month || null
            })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        // Ajouter le client s'il n'existe pas
        await this.ensureClient(dayData.client);

        return {
            success: true,
            data: {
                id: data.id,
                date: data.date,
                client: data.client,
                duree: data.duration,
                notes: data.notes,
                billing_month: data.billing_month
            }
        };
    },

    async deleteDay(id) {
        const supabase = getSupabase();

        const { error } = await supabase
            .from('days')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return { success: true };
    },

    async deleteDays(ids) {
        const supabase = getSupabase();

        const { error } = await supabase
            .from('days')
            .delete()
            .in('id', ids);

        if (error) throw error;
        return { success: true };
    },

    // ===== CLIENTS =====

    async getClients() {
        const supabase = getSupabase();

        const { data, error } = await supabase
            .from('clients')
            .select('*')
            .order('name');

        if (error) throw error;
        return data.map(c => c.name);
    },

    async getClientsWithColors() {
        const supabase = getSupabase();

        const { data, error } = await supabase
            .from('clients')
            .select('*')
            .order('name');

        if (error) throw error;
        return data;
    },

    async ensureClient(name, color = null) {
        const supabase = getSupabase();
        const user = await auth.getCurrentUser();

        // Upsert - insere ou ignore si existe deja
        const { error } = await supabase
            .from('clients')
            .upsert(
                { user_id: user.id, name, color },
                { onConflict: 'user_id,name', ignoreDuplicates: true }
            );

        if (error && error.code !== '23505') throw error; // Ignorer erreur duplicate
    },

    async addClient(name, color = null) {
        const supabase = getSupabase();
        const user = await auth.getCurrentUser();

        const { data, error } = await supabase
            .from('clients')
            .insert({ user_id: user.id, name, color })
            .select()
            .single();

        if (error) throw error;
        return { success: true, data };
    },

    async updateClientColor(name, color) {
        const supabase = getSupabase();
        const user = await auth.getCurrentUser();

        const { error } = await supabase
            .from('clients')
            .update({ color })
            .eq('user_id', user.id)
            .eq('name', name);

        if (error) throw error;
        return { success: true };
    },

    async deleteClient(name) {
        const supabase = getSupabase();
        const user = await auth.getCurrentUser();

        const { error } = await supabase
            .from('clients')
            .delete()
            .eq('user_id', user.id)
            .eq('name', name);

        if (error) throw error;
        return { success: true };
    },

    // ===== HOLIDAYS (Conges) =====

    async getHolidays() {
        const supabase = getSupabase();

        const { data, error } = await supabase
            .from('holidays')
            .select('*')
            .order('start_date', { ascending: false });

        if (error) throw error;

        // Mapper pour compatibilite
        return data.map(h => ({
            id: h.id,
            dateDebut: h.start_date,
            dateFin: h.end_date,
            type: h.type,
            created_at: h.created_at
        }));
    },

    async addHoliday(holidayData) {
        const supabase = getSupabase();
        const user = await auth.getCurrentUser();

        const { data, error } = await supabase
            .from('holidays')
            .insert({
                user_id: user.id,
                start_date: holidayData.dateDebut,
                end_date: holidayData.dateFin,
                type: holidayData.type
            })
            .select()
            .single();

        if (error) throw error;

        return {
            success: true,
            data: {
                id: data.id,
                dateDebut: data.start_date,
                dateFin: data.end_date,
                type: data.type
            }
        };
    },

    async updateHoliday(id, holidayData) {
        const supabase = getSupabase();

        const { data, error } = await supabase
            .from('holidays')
            .update({
                start_date: holidayData.dateDebut,
                end_date: holidayData.dateFin,
                type: holidayData.type
            })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        return {
            success: true,
            data: {
                id: data.id,
                dateDebut: data.start_date,
                dateFin: data.end_date,
                type: data.type
            }
        };
    },

    async deleteHoliday(id) {
        const supabase = getSupabase();

        const { error } = await supabase
            .from('holidays')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return { success: true };
    },

    // ===== USER SETTINGS =====

    async getSettings() {
        const supabase = getSupabase();

        const { data, error } = await supabase
            .from('user_settings')
            .select('*')
            .single();

        // PGRST116 = no rows found
        if (error && error.code !== 'PGRST116') throw error;

        if (!data) {
            return {
                darkMode: false,
                language: 'fr',
                autoBackup: true
            };
        }

        return {
            darkMode: data.dark_mode,
            language: data.language,
            autoBackup: data.auto_backup,
            assistantEmail: data.assistant_email,
            assistantName: data.assistant_name,
            notificationHour: data.notification_hour,
            notificationDays: data.notification_days,
            customMessage: data.custom_message
        };
    },

    async saveSettings(settings) {
        const supabase = getSupabase();
        const user = await auth.getCurrentUser();

        const { data, error } = await supabase
            .from('user_settings')
            .upsert({
                user_id: user.id,
                dark_mode: settings.darkMode,
                language: settings.language,
                auto_backup: settings.autoBackup,
                assistant_email: settings.assistantEmail,
                assistant_name: settings.assistantName,
                notification_hour: settings.notificationHour,
                notification_days: settings.notificationDays,
                custom_message: settings.customMessage
            })
            .select()
            .single();

        if (error) throw error;
        return { success: true, data };
    },

    // ===== STATS =====

    async getMonthlyStats(year, month) {
        const days = await this.getDays({ year, month });
        const stats = {};

        days.forEach(day => {
            const value = day.duree === 'journee_complete' ? 1 : 0.5;
            stats[day.client] = (stats[day.client] || 0) + value;
        });

        return {
            total: Object.values(stats).reduce((a, b) => a + b, 0),
            byClient: stats,
            days
        };
    },

    // ===== EXPORT/IMPORT =====

    async exportAllData() {
        const [days, clients, holidays, settings] = await Promise.all([
            this.getAllDays(),
            this.getClientsWithColors(),
            this.getHolidays(),
            this.getSettings()
        ]);

        return {
            version: CONFIG.VERSION,
            exportDate: new Date().toISOString(),
            data: {
                days,
                clients,
                holidays,
                settings
            }
        };
    },

    async importData(backupData, clearExisting = true) {
        const supabase = getSupabase();
        const user = await auth.getCurrentUser();

        if (clearExisting) {
            // Supprimer les donnees existantes
            await Promise.all([
                supabase.from('days').delete().eq('user_id', user.id),
                supabase.from('clients').delete().eq('user_id', user.id),
                supabase.from('holidays').delete().eq('user_id', user.id)
            ]);
        }

        const data = backupData.data || backupData;

        // Importer les clients
        if (data.clients && data.clients.length > 0) {
            const clientsToInsert = data.clients.map(c => ({
                user_id: user.id,
                name: typeof c === 'string' ? c : c.name,
                color: typeof c === 'string' ? null : c.color
            }));

            await supabase.from('clients').insert(clientsToInsert);
        }

        // Importer les jours
        if (data.days && data.days.length > 0) {
            const daysToInsert = data.days.map(d => ({
                user_id: user.id,
                date: d.date,
                client: d.client,
                duration: d.duree || d.duration,
                notes: d.notes,
                billing_month: d.billing_month || null
            }));

            await supabase.from('days').insert(daysToInsert);
        }

        // Importer les conges
        if (data.holidays && data.holidays.length > 0) {
            const holidaysToInsert = data.holidays.map(h => ({
                user_id: user.id,
                start_date: h.dateDebut || h.start_date,
                end_date: h.dateFin || h.end_date,
                type: h.type
            }));

            await supabase.from('holidays').insert(holidaysToInsert);
        }

        // Importer les settings
        if (data.settings) {
            await this.saveSettings(data.settings);
        }

        return { success: true };
    }
};

window.api = api;
