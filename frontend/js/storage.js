// ============ STORAGE MODULE - localStorage Management ============
// Gestion des donnees en localStorage (100% offline)

const STORAGE_KEYS = {
    DAYS: 'logmyjob_days',
    CLIENTS: 'logmyjob_clients',
    SETTINGS: 'logmyjob_settings',
    VACATIONS: 'logmyjob_vacations',
    CLIENT_COLORS: 'clientColors',
    ASSISTANT: 'assistant-settings',
    NOTIFICATIONS: 'notification-settings',
    THEME: 'theme',
    LANGUAGE: 'app-language'
};

// ============ UTILITY FUNCTIONS ============

function generateId() {
    return Date.now() + Math.random().toString(36).substr(2, 9);
}

function getFromStorage(key, defaultValue = []) {
    try {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : defaultValue;
    } catch (e) {
        console.error(`Error reading ${key} from localStorage:`, e);
        return defaultValue;
    }
}

function saveToStorage(key, data) {
    try {
        localStorage.setItem(key, JSON.stringify(data));
        return true;
    } catch (e) {
        console.error(`Error saving ${key} to localStorage:`, e);
        return false;
    }
}

// ============ DAYS (PRESENCES) MANAGEMENT ============

function getAllDays() {
    return getFromStorage(STORAGE_KEYS.DAYS, []);
}

function getDayById(id) {
    const days = getAllDays();
    return days.find(d => d.id === id || d.id === parseInt(id));
}

function getDaysByMonth(month) {
    // month format: 'YYYY-MM'
    const days = getAllDays();
    if (!month) return days;
    return days.filter(d => d.date && d.date.startsWith(month));
}

function getDaysByClient(clientName) {
    const days = getAllDays();
    if (!clientName) return days;
    return days.filter(d => d.client === clientName);
}

function getDaysFiltered(options = {}) {
    let days = getAllDays();

    if (options.month) {
        days = days.filter(d => d.date && d.date.startsWith(options.month));
    }

    if (options.client) {
        days = days.filter(d => d.client === options.client);
    }

    if (options.startDate) {
        days = days.filter(d => d.date >= options.startDate);
    }

    if (options.endDate) {
        days = days.filter(d => d.date <= options.endDate);
    }

    // Sort by date descending (most recent first)
    days.sort((a, b) => b.date.localeCompare(a.date));

    return days;
}

function saveDay(dayData) {
    const days = getAllDays();

    // Check for duplicate (same date + client + duree)
    const existingIndex = days.findIndex(d =>
        d.date === dayData.date &&
        d.client === dayData.client &&
        d.duree === dayData.duree &&
        d.id !== dayData.id
    );

    if (existingIndex !== -1 && !dayData.id) {
        return { success: false, error: 'Une presence existe deja pour ce client a cette date avec cette duree' };
    }

    const newDay = {
        id: dayData.id || generateId(),
        date: dayData.date,
        client: dayData.client.trim(),
        duree: dayData.duree,
        notes: dayData.notes || '',
        created_at: dayData.created_at || new Date().toISOString()
    };

    days.push(newDay);

    // Also add client to clients list if new
    addClient(newDay.client);

    if (saveToStorage(STORAGE_KEYS.DAYS, days)) {
        return { success: true, id: newDay.id, day: newDay };
    }
    return { success: false, error: 'Erreur de sauvegarde' };
}

function updateDay(id, dayData) {
    const days = getAllDays();
    const index = days.findIndex(d => d.id === id || d.id === parseInt(id));

    if (index === -1) {
        return { success: false, error: 'Jour non trouve' };
    }

    // Check for duplicate
    const duplicateIndex = days.findIndex(d =>
        d.date === dayData.date &&
        d.client === dayData.client &&
        d.duree === dayData.duree &&
        d.id !== id && d.id !== parseInt(id)
    );

    if (duplicateIndex !== -1) {
        return { success: false, error: 'Une presence existe deja pour ce client a cette date avec cette duree' };
    }

    days[index] = {
        ...days[index],
        date: dayData.date,
        client: dayData.client.trim(),
        duree: dayData.duree,
        notes: dayData.notes || '',
        updated_at: new Date().toISOString()
    };

    // Also add client to clients list if new
    addClient(days[index].client);

    if (saveToStorage(STORAGE_KEYS.DAYS, days)) {
        return { success: true, day: days[index] };
    }
    return { success: false, error: 'Erreur de sauvegarde' };
}

function deleteDay(id) {
    const days = getAllDays();
    const index = days.findIndex(d => d.id === id || d.id === parseInt(id));

    if (index === -1) {
        return { success: false, error: 'Jour non trouve' };
    }

    days.splice(index, 1);

    if (saveToStorage(STORAGE_KEYS.DAYS, days)) {
        return { success: true };
    }
    return { success: false, error: 'Erreur de suppression' };
}

function deleteDays(ids) {
    const days = getAllDays();
    const idsToDelete = ids.map(id => String(id));
    const filteredDays = days.filter(d => !idsToDelete.includes(String(d.id)));

    if (saveToStorage(STORAGE_KEYS.DAYS, filteredDays)) {
        return { success: true, deleted: days.length - filteredDays.length };
    }
    return { success: false, error: 'Erreur de suppression' };
}

function deleteAllDays() {
    const count = getAllDays().length;
    if (saveToStorage(STORAGE_KEYS.DAYS, [])) {
        return { success: true, deleted: count };
    }
    return { success: false, error: 'Erreur de reinitialisation' };
}

// ============ CLIENTS MANAGEMENT ============

function getAllClients() {
    return getFromStorage(STORAGE_KEYS.CLIENTS, []);
}

function addClient(clientName) {
    if (!clientName || !clientName.trim()) return false;

    const clients = getAllClients();
    const trimmedName = clientName.trim();

    if (!clients.includes(trimmedName)) {
        clients.push(trimmedName);
        clients.sort((a, b) => a.localeCompare(b));
        return saveToStorage(STORAGE_KEYS.CLIENTS, clients);
    }
    return true; // Already exists
}

function removeClient(clientName) {
    const clients = getAllClients();
    const index = clients.indexOf(clientName);

    if (index !== -1) {
        clients.splice(index, 1);
        return saveToStorage(STORAGE_KEYS.CLIENTS, clients);
    }
    return true;
}

function syncClientsFromDays() {
    // Rebuild clients list from actual days data
    const days = getAllDays();
    const clientsSet = new Set(days.map(d => d.client).filter(c => c));
    const clients = Array.from(clientsSet).sort((a, b) => a.localeCompare(b));
    return saveToStorage(STORAGE_KEYS.CLIENTS, clients);
}

// ============ STATISTICS ============

function getMonthlyStats() {
    const days = getAllDays();
    const stats = {};

    days.forEach(day => {
        if (!day.date) return;

        const month = day.date.substring(0, 7); // 'YYYY-MM'

        if (!stats[month]) {
            stats[month] = {};
        }

        if (!stats[month][day.client]) {
            stats[month][day.client] = 0;
        }

        // Calculate duration value
        let durationValue = 1;
        if (day.duree === 'demi_journee_matin' || day.duree === 'demi_journee_aprem') {
            durationValue = 0.5;
        }

        stats[month][day.client] += durationValue;
    });

    // Convert to expected format with totals
    const result = {};
    Object.keys(stats).sort().reverse().forEach(month => {
        const clients = stats[month];
        result[month] = {
            clients: clients,
            total: Object.values(clients).reduce((a, b) => a + b, 0)
        };
    });

    return result;
}

function getCurrentMonthStats() {
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const stats = getMonthlyStats();
    return stats[currentMonth] || { clients: {}, total: 0 };
}

// ============ VACATIONS MANAGEMENT ============

function getAllVacations() {
    return getFromStorage(STORAGE_KEYS.VACATIONS, []);
}

function saveVacation(vacation) {
    const vacations = getAllVacations();
    const newVacation = {
        id: vacation.id || generateId(),
        dateDebut: vacation.dateDebut,
        dateFin: vacation.dateFin,
        type: vacation.type || 'conges',
        created_at: new Date().toISOString()
    };

    vacations.push(newVacation);
    vacations.sort((a, b) => b.dateDebut.localeCompare(a.dateDebut));

    if (saveToStorage(STORAGE_KEYS.VACATIONS, vacations)) {
        return { success: true, id: newVacation.id, vacation: newVacation };
    }
    return { success: false, error: 'Erreur de sauvegarde' };
}

function updateVacation(id, vacationData) {
    const vacations = getAllVacations();
    const index = vacations.findIndex(v => v.id === id || v.id === parseInt(id));

    if (index === -1) {
        return { success: false, error: 'Conge non trouve' };
    }

    vacations[index] = {
        ...vacations[index],
        dateDebut: vacationData.dateDebut,
        dateFin: vacationData.dateFin,
        type: vacationData.type
    };

    if (saveToStorage(STORAGE_KEYS.VACATIONS, vacations)) {
        return { success: true, vacation: vacations[index] };
    }
    return { success: false, error: 'Erreur de sauvegarde' };
}

function deleteVacation(id) {
    const vacations = getAllVacations();
    const index = vacations.findIndex(v => v.id === id || v.id === parseInt(id));

    if (index === -1) {
        return { success: false, error: 'Conge non trouve' };
    }

    vacations.splice(index, 1);

    if (saveToStorage(STORAGE_KEYS.VACATIONS, vacations)) {
        return { success: true };
    }
    return { success: false, error: 'Erreur de suppression' };
}

// ============ BACKUP & RESTORE ============

function exportAllData() {
    return {
        version: '2.0',
        export_date: new Date().toISOString(),
        data: {
            days: getAllDays(),
            clients: getAllClients(),
            vacations: getAllVacations(),
            settings: {
                clientColors: getFromStorage(STORAGE_KEYS.CLIENT_COLORS, {}),
                assistant: getFromStorage(STORAGE_KEYS.ASSISTANT, {}),
                notifications: getFromStorage(STORAGE_KEYS.NOTIFICATIONS, {}),
                theme: localStorage.getItem(STORAGE_KEYS.THEME) || 'auto',
                language: localStorage.getItem(STORAGE_KEYS.LANGUAGE) || 'fr'
            }
        }
    };
}

function importAllData(backupData, clearExisting = true) {
    try {
        // Support both old (v1) and new (v2) backup formats
        let days, clients, vacations, settings;

        if (backupData.version === '2.0' && backupData.data) {
            // New format
            days = backupData.data.days || [];
            clients = backupData.data.clients || [];
            vacations = backupData.data.vacations || [];
            settings = backupData.data.settings || {};
        } else if (backupData.presences) {
            // Old API format (v1)
            days = backupData.presences.map(p => ({
                id: p.id || generateId(),
                date: p.date,
                client: p.client,
                duree: p.duree,
                notes: p.notes || '',
                created_at: p.created_at || new Date().toISOString()
            }));
            clients = [...new Set(days.map(d => d.client))].sort();
            vacations = [];
            settings = {};
        } else {
            return { success: false, error: 'Format de sauvegarde non reconnu' };
        }

        if (clearExisting) {
            // Clear existing data
            saveToStorage(STORAGE_KEYS.DAYS, []);
            saveToStorage(STORAGE_KEYS.CLIENTS, []);
            saveToStorage(STORAGE_KEYS.VACATIONS, []);
        }

        // Import days
        if (clearExisting) {
            saveToStorage(STORAGE_KEYS.DAYS, days);
        } else {
            const existingDays = getAllDays();
            const mergedDays = [...existingDays, ...days];
            saveToStorage(STORAGE_KEYS.DAYS, mergedDays);
        }

        // Import or merge clients
        if (clearExisting) {
            saveToStorage(STORAGE_KEYS.CLIENTS, clients);
        } else {
            const existingClients = getAllClients();
            const mergedClients = [...new Set([...existingClients, ...clients])].sort();
            saveToStorage(STORAGE_KEYS.CLIENTS, mergedClients);
        }

        // Import vacations
        if (clearExisting) {
            saveToStorage(STORAGE_KEYS.VACATIONS, vacations);
        } else {
            const existingVacations = getAllVacations();
            const mergedVacations = [...existingVacations, ...vacations];
            saveToStorage(STORAGE_KEYS.VACATIONS, mergedVacations);
        }

        // Import settings if available
        if (settings.clientColors) {
            saveToStorage(STORAGE_KEYS.CLIENT_COLORS, settings.clientColors);
        }
        if (settings.assistant) {
            saveToStorage(STORAGE_KEYS.ASSISTANT, settings.assistant);
        }
        if (settings.notifications) {
            saveToStorage(STORAGE_KEYS.NOTIFICATIONS, settings.notifications);
        }
        if (settings.theme) {
            localStorage.setItem(STORAGE_KEYS.THEME, settings.theme);
        }
        if (settings.language) {
            localStorage.setItem(STORAGE_KEYS.LANGUAGE, settings.language);
        }

        // Sync clients from days to ensure consistency
        syncClientsFromDays();

        return {
            success: true,
            imported: {
                days: days.length,
                clients: clients.length,
                vacations: vacations.length
            }
        };
    } catch (e) {
        console.error('Import error:', e);
        return { success: false, error: e.message };
    }
}

function resetAllData() {
    try {
        saveToStorage(STORAGE_KEYS.DAYS, []);
        saveToStorage(STORAGE_KEYS.CLIENTS, []);
        saveToStorage(STORAGE_KEYS.VACATIONS, []);
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

// ============ SETTINGS ============

function getSettings() {
    return getFromStorage(STORAGE_KEYS.SETTINGS, {});
}

function saveSettings(settings) {
    return saveToStorage(STORAGE_KEYS.SETTINGS, settings);
}

function getSetting(key, defaultValue = null) {
    const settings = getSettings();
    return settings[key] !== undefined ? settings[key] : defaultValue;
}

function setSetting(key, value) {
    const settings = getSettings();
    settings[key] = value;
    return saveSettings(settings);
}
