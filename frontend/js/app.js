// ============ APPLICATION LOG MY JOB ============
// Stockage 100% localStorage - Fonctionne offline

// État global
let currentPage = 'home';
let allPresences = [];
let allClients = [];
let currentEditId = null;
let currentFilter = { month: '', client: '' };
let currentSearchTerm = '';
let currentHistoryPage = 1;
const ITEMS_PER_PAGE = 20;
let vacations = [];
let currentHistoryView = 'grouped';
let currentPeriodFilter = 'this-month';
let customPeriodStart = '';
let customPeriodEnd = '';
let selectedPresences = new Set();
let notificationSettings = {
    enabled: false,
    time: '18:00',
    weekdays: [1, 2, 3, 4, 5] // Lun-Ven par défaut
};
let assistantSettings = {
    email: '',
    name: '',
    message: ''
};

// Couleurs des clients (stockées en localStorage)
let clientColors = {};
const DEFAULT_COLORS = [
    '#2563eb', // Bleu
    '#10b981', // Vert
    '#f59e0b', // Orange
    '#ef4444', // Rouge
    '#8b5cf6', // Violet
    '#ec4899', // Rose
    '#06b6d4', // Cyan
    '#84cc16', // Lime
    '#f97316', // Orange foncé
    '#6366f1', // Indigo
    '#14b8a6', // Teal
    '#a855f7'  // Purple
];

// Initialisation
document.addEventListener('DOMContentLoaded', () => {
    initLanguageButtons();
    initDarkMode();
    initPWAInstall();
    initNavigation();
    initFormHandlers();
    initFilters();
    initVacations();
    initNotifications();
    initAssistant();
    initBackup();
    loadClientColors();
    loadData();
    loadVacations();
    loadNotificationSettings();
    loadAssistantSettings();
    checkCurrentVacation();
    requestNotificationPermission();
});

// ============ GESTION DE LA LANGUE ============

function initLanguageButtons() {
    const langFr = document.getElementById('lang-fr');
    const langEn = document.getElementById('lang-en');

    if (langFr) {
        langFr.addEventListener('click', () => {
            setLanguage('fr');
            showToast('Langue changee en Francais');
        });
    }

    if (langEn) {
        langEn.addEventListener('click', () => {
            setLanguage('en');
            showToast('Language changed to English');
        });
    }

    // Update UI on language change event
    window.addEventListener('languageChanged', () => {
        // Refresh dynamic content
        updateMonthWidget();
        loadRecentPresences();
        if (typeof renderCalendar === 'function') {
            renderCalendar();
        }
        if (typeof loadHistory === 'function') {
            loadHistory();
        }
        if (typeof updateStats === 'function') {
            updateStats();
        }
    });
}

// ============ GESTION DES COULEURS CLIENTS ============

function loadClientColors() {
    const saved = localStorage.getItem('clientColors');
    if (saved) {
        clientColors = JSON.parse(saved);
    }
}

function saveClientColors() {
    localStorage.setItem('clientColors', JSON.stringify(clientColors));
}

function getClientColor(clientName) {
    // Si le client a une couleur assignée, la retourner
    if (clientColors[clientName]) {
        return clientColors[clientName];
    }

    // Sinon, assigner une couleur par défaut basée sur l'index
    const clientIndex = allClients.indexOf(clientName);
    const colorIndex = clientIndex >= 0 ? clientIndex % DEFAULT_COLORS.length : 0;
    const color = DEFAULT_COLORS[colorIndex];

    // Sauvegarder pour cohérence future
    clientColors[clientName] = color;
    saveClientColors();

    return color;
}

function setClientColor(clientName, color) {
    clientColors[clientName] = color;
    saveClientColors();

    // Rafraîchir les vues si nécessaire
    if (currentPage === 'calendar') {
        initCalendar();
    } else if (currentPage === 'history') {
        renderHistoryView();
    } else if (currentPage === 'settings') {
        renderClientColorsList();
    }
}

function renderClientColorsList() {
    const container = document.getElementById('client-colors-list');
    if (!container) return;

    container.innerHTML = '';

    if (allClients.length === 0) {
        container.innerHTML = '<p class="empty-hint">Aucun client enregistré</p>';
        return;
    }

    allClients.forEach(client => {
        const color = getClientColor(client);
        const item = document.createElement('div');
        item.className = 'client-color-item';
        item.innerHTML = `
            <div class="client-color-info">
                <span class="client-color-badge" style="background-color: ${color}"></span>
                <span class="client-color-name">${client}</span>
            </div>
            <div class="client-color-picker-wrapper">
                <input type="color" value="${color}" class="client-color-picker" data-client="${client}">
            </div>
        `;

        const colorPicker = item.querySelector('.client-color-picker');
        colorPicker.addEventListener('change', (e) => {
            setClientColor(client, e.target.value);
            item.querySelector('.client-color-badge').style.backgroundColor = e.target.value;
        });

        container.appendChild(item);
    });
}

// Navigation
function initNavigation() {
    const navButtons = document.querySelectorAll('.nav-item');
    navButtons.forEach(button => {
        button.addEventListener('click', () => {
            const page = button.dataset.page;
            navigateTo(page);
        });
    });
}

function navigateTo(page) {
    // Désactiver toutes les pages et nav items
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

    // Activer la page et nav item sélectionnés
    document.getElementById(`page-${page}`).classList.add('active');
    document.querySelector(`[data-page="${page}"]`).classList.add('active');

    currentPage = page;

    // Charger les donnees specifiques a la page
    if (page === 'calendar') {
        initCalendar();
    } else if (page === 'stats') {
        renderStats();
    } else if (page === 'export') {
        initExport();
    } else if (page === 'history') {
        initHistoryPage();
        renderHistoryView();
    } else if (page === 'settings') {
        renderVacationsList();
        renderClientColorsList();
    }
}

// Formulaire
function initFormHandlers() {
    const form = document.getElementById('presence-form');
    const btnLogToday = document.getElementById('btn-log-today');
    const btnCancel = document.getElementById('btn-cancel');
    const clientSelect = document.getElementById('client-select');
    const clientInput = document.getElementById('client-input');

    btnLogToday.addEventListener('click', () => {
        showForm();
        document.getElementById('date').value = getTodayDate();
    });

    btnCancel.addEventListener('click', hideForm);

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await savePresence();
    });

    // Gérer la sélection client vs input libre
    clientSelect.addEventListener('change', () => {
        if (clientSelect.value) {
            clientInput.value = '';
        }
    });

    clientInput.addEventListener('input', () => {
        if (clientInput.value) {
            clientSelect.value = '';
        }
    });

    // Boutons de sélection rapide de date
    initQuickDateButtons();
}

function initQuickDateButtons() {
    const quickDateButtons = document.querySelectorAll('.quick-date-btn');
    const dateInput = document.getElementById('date');

    quickDateButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const dateType = btn.dataset.date;
            const date = getQuickDate(dateType);
            dateInput.value = date;

            // Mettre à jour l'état actif des boutons
            quickDateButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });

    // Quand l'utilisateur change la date manuellement, désactiver les boutons
    dateInput.addEventListener('change', () => {
        const currentDate = dateInput.value;
        quickDateButtons.forEach(btn => {
            const btnDate = getQuickDate(btn.dataset.date);
            if (btnDate === currentDate) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    });
}

function getQuickDate(type) {
    const today = new Date();
    let date;

    switch (type) {
        case 'today':
            date = today;
            break;
        case 'yesterday':
            date = new Date(today);
            date.setDate(date.getDate() - 1);
            break;
        case 'before-yesterday':
            date = new Date(today);
            date.setDate(date.getDate() - 2);
            break;
        default:
            date = today;
    }

    return formatDateISO(date);
}

function formatDateISO(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function showForm(editData = null) {
    const formContainer = document.getElementById('form-container');
    const formTitle = document.getElementById('form-title');
    const form = document.getElementById('presence-form');

    if (editData) {
        formTitle.textContent = 'Modifier la présence';
        document.getElementById('edit-id').value = editData.id;
        document.getElementById('date').value = editData.date;

        // Essayer de sélectionner le client existant
        const clientSelect = document.getElementById('client-select');
        const option = Array.from(clientSelect.options).find(opt => opt.value === editData.client);
        if (option) {
            clientSelect.value = editData.client;
            document.getElementById('client-input').value = '';
        } else {
            clientSelect.value = '';
            document.getElementById('client-input').value = editData.client;
        }

        document.querySelector(`input[name="duree"][value="${editData.duree}"]`).checked = true;
        document.getElementById('notes').value = editData.notes || '';
        currentEditId = editData.id;
    } else {
        formTitle.textContent = 'Nouvelle présence';
        form.reset();
        document.getElementById('date').value = getTodayDate();
        currentEditId = null;
    }

    // Mettre à jour les boutons de date rapide
    updateQuickDateButtonsState();

    formContainer.style.display = 'block';
    formContainer.scrollIntoView({ behavior: 'smooth' });
}

function updateQuickDateButtonsState() {
    const dateInput = document.getElementById('date');
    const currentDate = dateInput.value;
    const quickDateButtons = document.querySelectorAll('.quick-date-btn');

    quickDateButtons.forEach(btn => {
        const btnDate = getQuickDate(btn.dataset.date);
        if (btnDate === currentDate) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
}

function hideForm() {
    document.getElementById('form-container').style.display = 'none';
    document.getElementById('presence-form').reset();
    currentEditId = null;
}

function savePresence() {
    const date = document.getElementById('date').value;
    const clientSelect = document.getElementById('client-select').value;
    const clientInput = document.getElementById('client-input').value;
    const client = clientInput || clientSelect;
    const duree = document.querySelector('input[name="duree"]:checked').value;
    const notes = document.getElementById('notes').value;

    if (!client) {
        showToast('Veuillez selectionner ou saisir un client', 'error');
        return;
    }

    const data = { date, client, duree, notes };

    let result;
    if (currentEditId) {
        result = updateDay(currentEditId, data);
    } else {
        result = saveDay(data);
    }

    if (result.success) {
        showToast(currentEditId ? 'Jour mis a jour' : 'Jour enregistre', 'success');
        hideForm();
        loadData();
    } else {
        showToast(result.error || 'Erreur lors de l\'enregistrement', 'error');
    }
}

function deletePresence(id) {
    if (!confirm('Supprimer ce jour ?')) return;

    const result = deleteDay(id);

    if (result.success) {
        showToast('Jour supprime', 'success');
        loadData();
    } else {
        showToast('Erreur lors de la suppression', 'error');
    }
}

// Chargement des données depuis localStorage
function loadData() {
    // Charger toutes les presences depuis localStorage
    allPresences = getAllDays();

    // Trier par date decroissante
    allPresences.sort((a, b) => b.date.localeCompare(a.date));

    // Charger les clients depuis localStorage
    allClients = getAllClients();

    // Si pas de clients, les synchroniser depuis les jours
    if (allClients.length === 0 && allPresences.length > 0) {
        syncClientsFromDays();
        allClients = getAllClients();
    }

    updateUI();
}

function updateUI() {
    updateClientSelect();
    updateMonthWidget();
    updateRecentDays();
    updateFilterSelects();
    if (currentPage === 'history') {
        renderHistory();
    }
}

function updateClientSelect() {
    const select = document.getElementById('client-select');
    select.innerHTML = '<option value="">-- Sélectionner --</option>';

    allClients.forEach(client => {
        const option = document.createElement('option');
        option.value = client;
        option.textContent = client;
        select.appendChild(option);
    });
}

function updateMonthWidget() {
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const monthPresences = allPresences.filter(p => p.date.startsWith(currentMonth));

    // Calculer le total de jours
    const totalDays = calculateTotalDays(monthPresences);
    document.getElementById('month-total').textContent = totalDays.toFixed(1);

    // Breakdown par client
    const clientStats = {};
    monthPresences.forEach(p => {
        if (!clientStats[p.client]) clientStats[p.client] = 0;
        clientStats[p.client] += getDurationValue(p.duree);
    });

    const clientBreakdown = document.getElementById('month-clients');
    clientBreakdown.innerHTML = '';
    Object.entries(clientStats).forEach(([client, days]) => {
        const div = document.createElement('div');
        div.className = 'client-stat';
        div.textContent = `${client}: ${days.toFixed(1)}j`;
        clientBreakdown.appendChild(div);
    });

    // Mettre à jour le label du mois
    const monthNames = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
                        'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
    document.getElementById('current-month-label').textContent = `${monthNames[now.getMonth()]} ${now.getFullYear()}`;
}

function updateRecentDays() {
    const recentList = document.getElementById('recent-list');
    recentList.innerHTML = '';

    const recent = allPresences.slice(0, 5);

    if (recent.length === 0) {
        recentList.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">Aucun jour enregistré</p>';
        return;
    }

    recent.forEach(presence => {
        const div = document.createElement('div');
        div.className = 'day-item';
        div.innerHTML = `
            <div class="day-info">
                <div class="day-date">${formatDate(presence.date)}</div>
                <div class="day-client">${presence.client}</div>
                <div class="day-duration">${formatDuration(presence.duree)}</div>
                ${presence.notes ? `<div class="day-notes">${presence.notes}</div>` : ''}
            </div>
            <div class="day-actions">
                <button class="btn-primary btn-small" onclick="editPresence(${presence.id})">✏️</button>
                <button class="btn-danger btn-small" onclick="deletePresence(${presence.id})">🗑️</button>
            </div>
        `;
        recentList.appendChild(div);
    });
}

function editPresence(id) {
    const presence = allPresences.find(p => p.id === id);
    if (presence) {
        navigateTo('home');
        setTimeout(() => showForm(presence), 100);
    }
}

// Historique et filtres (LEGACY - remplacé par history.js)
function initFilters() {
    // Ces éléments n'existent plus avec la nouvelle page historique
    // La fonction est maintenant dans history.js (initHistoryFilters)
    // On garde cette fonction vide pour éviter les erreurs
}

function updateFilterSelects() {
    // LEGACY - Ces éléments n'existent plus avec la nouvelle page historique
    // La logique est maintenant dans history.js
    const filterMonth = document.getElementById('filter-month');
    const filterClient = document.getElementById('filter-client');

    // Si les éléments n'existent pas, on sort (nouvelle page historique)
    if (!filterMonth || !filterClient) {
        return;
    }

    // Code legacy pour compatibilité (si les éléments existent)
    const months = [...new Set(allPresences.map(p => p.date.substring(0, 7)))].sort().reverse();
    const currentValue = filterMonth.value;
    filterMonth.innerHTML = '<option value="">Tous</option>';
    months.forEach(month => {
        const option = document.createElement('option');
        option.value = month;
        option.textContent = formatMonth(month);
        filterMonth.appendChild(option);
    });
    filterMonth.value = currentValue;

    const currentClientValue = filterClient.value;
    filterClient.innerHTML = '<option value="">Tous</option>';
    allClients.forEach(client => {
        const option = document.createElement('option');
        option.value = client;
        option.textContent = client;
        filterClient.appendChild(option);
    });
    filterClient.value = currentClientValue;
}

function renderHistory() {
    // LEGACY - La nouvelle page historique utilise history.js
    // Vérifier si les anciens éléments existent
    const historyList = document.getElementById('history-list');
    const historyCount = document.getElementById('history-count');

    // Si les éléments n'existent pas, on utilise la nouvelle page (history.js)
    if (!historyList || !historyCount) {
        // Appeler la fonction de history.js si disponible
        if (typeof renderHistoryView === 'function') {
            renderHistoryView();
        }
        return;
    }

    // Code legacy ci-dessous (pour compatibilité)
    let filtered = [...allPresences];

    if (currentFilter.month) {
        filtered = filtered.filter(p => p.date.startsWith(currentFilter.month));
    }
    if (currentFilter.client) {
        filtered = filtered.filter(p => p.client === currentFilter.client);
    }
    if (currentSearchTerm) {
        filtered = filtered.filter(p =>
            p.client.toLowerCase().includes(currentSearchTerm) ||
            p.date.includes(currentSearchTerm) ||
            (p.notes && p.notes.toLowerCase().includes(currentSearchTerm))
        );
    }

    const totalDays = calculateTotalDays(filtered);
    historyCount.textContent = `${totalDays.toFixed(1)} jours (${filtered.length} entrées)`;

    const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
    const start = (currentHistoryPage - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    const paged = filtered.slice(start, end);

    historyList.innerHTML = '';

    if (paged.length === 0) {
        historyList.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 40px;">Aucun résultat</p>';
        const pagination = document.getElementById('pagination');
        if (pagination) pagination.innerHTML = '';
        return;
    }

    paged.forEach(presence => {
        const div = document.createElement('div');
        div.className = 'day-item';
        div.innerHTML = `
            <div class="day-info">
                <div class="day-date">${formatDate(presence.date)}</div>
                <div class="day-client">${presence.client}</div>
                <div class="day-duration">${formatDuration(presence.duree)}</div>
                ${presence.notes ? `<div class="day-notes">${presence.notes}</div>` : ''}
            </div>
            <div class="day-actions">
                <button class="btn-primary btn-small" onclick="editPresence(${presence.id})">✏️</button>
                <button class="btn-danger btn-small" onclick="deletePresence(${presence.id})">🗑️</button>
            </div>
        `;
        historyList.appendChild(div);
    });

    renderPagination(totalPages);
}

function renderPagination(totalPages) {
    const pagination = document.getElementById('pagination');
    if (!pagination) return;

    pagination.innerHTML = '';

    if (totalPages <= 1) return;

    for (let i = 1; i <= totalPages; i++) {
        const button = document.createElement('button');
        button.textContent = i;
        button.className = i === currentHistoryPage ? 'active' : '';
        button.addEventListener('click', () => {
            currentHistoryPage = i;
            renderHistory();
        });
        pagination.appendChild(button);
    }
}

// Stats - Calculees depuis localStorage
function loadStats() {
    const stats = getMonthlyStats();

    const container = document.getElementById('stats-container');
    if (!container) return;

    container.innerHTML = '';

    if (Object.keys(stats).length === 0) {
        container.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 40px;">Aucune donnee</p>';
        return;
    }

    Object.entries(stats).sort((a, b) => b[0].localeCompare(a[0])).forEach(([month, data]) => {
        const div = document.createElement('div');
        div.className = 'stats-month';

        let clientsHTML = '';
        Object.entries(data.clients).forEach(([client, days]) => {
            clientsHTML += `
                <div class="stats-client-item">
                    <span class="stats-client-name">${client}</span>
                    <span class="stats-client-days">${days.toFixed(1)} jours</span>
                </div>
            `;
        });

        div.innerHTML = `
            <h3>
                <span>${formatMonth(month)}</span>
                <span class="stats-total">${data.total.toFixed(1)} jours</span>
            </h3>
            <div class="stats-clients">${clientsHTML}</div>
        `;
        container.appendChild(div);
    });
}

// Export - Les fonctions d'export sont maintenant dans export.js
// initExport() est appelée depuis export.js

// Utilitaires
function getTodayDate() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function formatDate(dateStr) {
    const date = new Date(dateStr + 'T00:00:00');
    const days = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
    const months = ['jan', 'fév', 'mar', 'avr', 'mai', 'juin', 'juil', 'aoû', 'sep', 'oct', 'nov', 'déc'];
    return `${days[date.getDay()]} ${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

function formatMonth(monthStr) {
    const [year, month] = monthStr.split('-');
    const months = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
                    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
    return `${months[parseInt(month) - 1]} ${year}`;
}

function formatDuration(duree) {
    const map = {
        'journee_complete': 'Journée complète (1j)',
        'demi_journee_matin': 'Matin (0.5j)',
        'demi_journee_aprem': 'Après-midi (0.5j)',
        '1.0': 'Journée complète (1j)',
        '0.5': 'Demi-journée (0.5j)'
    };
    return map[duree] || duree;
}

function getDurationValue(duree) {
    if (duree === 'journee_complete' || duree === '1.0') return 1.0;
    if (duree === 'demi_journee_matin' || duree === 'demi_journee_aprem' || duree === '0.5') return 0.5;
    return parseFloat(duree) || 1.0;
}

function calculateTotalDays(presences) {
    return presences.reduce((total, p) => total + getDurationValue(p.duree), 0);
}

function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast show ${type}`;

    setTimeout(() => {
        toast.className = 'toast';
    }, 3000);
}

// ============ GESTION DES CONGÉS ============

function initVacations() {
    const btnAdd = document.getElementById('btn-add-vacation');
    const modal = document.getElementById('vacation-modal');
    const modalClose = document.getElementById('vacation-modal-close');
    const cancelBtn = document.getElementById('vacation-cancel');
    const form = document.getElementById('vacation-form');

    if (btnAdd) btnAdd.addEventListener('click', () => showVacationModal());

    modalClose.addEventListener('click', () => hideVacationModal());
    cancelBtn.addEventListener('click', () => hideVacationModal());

    modal.addEventListener('click', (e) => {
        if (e.target === modal) hideVacationModal();
    });

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        saveVacation();
    });
}

function loadVacations() {
    // Utiliser storage.js pour charger les vacations
    vacations = getAllVacations();
}

function saveVacationsToStorage() {
    localStorage.setItem('vacations', JSON.stringify(vacations));

    // Informer le Service Worker des changements de congés
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
            type: 'UPDATE_VACATIONS',
            vacations: vacations
        });
    }
}

function showVacationModal(vacation = null) {
    const modal = document.getElementById('vacation-modal');
    const title = document.getElementById('vacation-modal-title');
    const form = document.getElementById('vacation-form');

    if (vacation) {
        title.textContent = 'Modifier les congés';
        document.getElementById('vacation-edit-id').value = vacation.id;
        document.getElementById('vacation-start').value = vacation.dateDebut;
        document.getElementById('vacation-end').value = vacation.dateFin;
        document.getElementById('vacation-type').value = vacation.type;
    } else {
        title.textContent = 'Ajouter des congés';
        form.reset();
        document.getElementById('vacation-edit-id').value = '';
    }

    modal.style.display = 'flex';
}

function hideVacationModal() {
    const modal = document.getElementById('vacation-modal');
    modal.style.display = 'none';
}

function saveVacation() {
    const editId = document.getElementById('vacation-edit-id').value;
    const dateDebut = document.getElementById('vacation-start').value;
    const dateFin = document.getElementById('vacation-end').value;
    const type = document.getElementById('vacation-type').value;

    // Validation
    if (new Date(dateFin) < new Date(dateDebut)) {
        showToast('La date de fin doit être >= à la date de début', 'error');
        return;
    }

    // Vérifier chevauchement
    const hasOverlap = vacations.some(v => {
        if (editId && v.id === editId) return false; // Ignorer si édition

        const vStart = new Date(v.dateDebut);
        const vEnd = new Date(v.dateFin);
        const newStart = new Date(dateDebut);
        const newEnd = new Date(dateFin);

        return (newStart <= vEnd && newEnd >= vStart);
    });

    if (hasOverlap) {
        showToast('Cette période chevauche une période existante', 'error');
        return;
    }

    if (editId) {
        // Modification
        const index = vacations.findIndex(v => v.id === editId);
        if (index !== -1) {
            vacations[index] = {
                ...vacations[index],
                dateDebut,
                dateFin,
                type
            };
        }
    } else {
        // Nouveau
        const vacation = {
            id: Date.now().toString(),
            dateDebut,
            dateFin,
            type,
            createdAt: new Date().toISOString()
        };
        vacations.push(vacation);
    }

    saveVacationsToStorage();
    renderVacationsList();
    checkCurrentVacation();
    hideVacationModal();
    showToast(editId ? 'Congés modifiés' : 'Congés ajoutés', 'success');

    // Rafraîchir le calendrier si on est sur cette page
    if (currentPage === 'calendar') {
        renderCalendar();
    }
}

function deleteVacation(id) {
    if (!confirm('Supprimer cette période de congés ?')) return;

    vacations = vacations.filter(v => v.id !== id);
    saveVacationsToStorage();
    renderVacationsList();
    checkCurrentVacation();
    showToast('Congés supprimés', 'success');

    // Rafraîchir le calendrier si on est sur cette page
    if (currentPage === 'calendar') {
        renderCalendar();
    }
}

function renderVacationsList() {
    const container = document.getElementById('vacations-list');
    container.innerHTML = '';

    if (vacations.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 20px;">Aucune période de congés enregistrée</p>';
        return;
    }

    // Trier par date (plus récent en premier)
    const sorted = [...vacations].sort((a, b) => new Date(b.dateDebut) - new Date(a.dateDebut));

    sorted.forEach(vacation => {
        const item = document.createElement('div');
        item.className = 'vacation-item';

        const isActive = isVacationActive(vacation);
        const typeLabel = getVacationType(vacation.type);
        const typeIcon = getVacationIcon(vacation.type);

        item.innerHTML = `
            <div class="vacation-info">
                <span class="vacation-icon">${typeIcon}</span>
                <div class="vacation-details">
                    <div class="vacation-type">${typeLabel}</div>
                    <div class="vacation-dates">
                        ${formatDate(vacation.dateDebut)} → ${formatDate(vacation.dateFin)}
                    </div>
                </div>
                ${isActive ? '<span class="vacation-badge">En cours</span>' : ''}
            </div>
            <button class="btn-danger btn-small" onclick="deleteVacation('${vacation.id}')">✕</button>
        `;

        container.appendChild(item);
    });
}

function getVacationType(type) {
    const types = {
        'conges': 'Congés',
        'rtt': 'RTT',
        'ferie': 'Férié',
        'autre': 'Autre'
    };
    return types[type] || type;
}

function getVacationIcon(type) {
    const icons = {
        'conges': '🏖️',
        'rtt': '🌴',
        'ferie': '🎉',
        'autre': '📅'
    };
    return icons[type] || '📅';
}

function isVacationActive(vacation) {
    const today = getTodayDate();
    return today >= vacation.dateDebut && today <= vacation.dateFin;
}

function checkCurrentVacation() {
    const today = getTodayDate();
    const activeVacation = vacations.find(v =>
        today >= v.dateDebut && today <= v.dateFin
    );

    const banner = document.getElementById('vacation-banner');
    const bannerText = document.getElementById('vacation-banner-text');

    if (activeVacation) {
        const icon = getVacationIcon(activeVacation.type);
        const typeLabel = getVacationType(activeVacation.type);
        bannerText.textContent = `${icon} Vous êtes en ${typeLabel.toLowerCase()} jusqu'au ${formatDate(activeVacation.dateFin)}`;
        banner.style.display = 'flex';
    } else {
        banner.style.display = 'none';
    }
}

function isDateInVacation(dateStr) {
    return vacations.some(v => dateStr >= v.dateDebut && dateStr <= v.dateFin);
}

// ============ GESTION DES NOTIFICATIONS ============

function initNotifications() {
    const toggle = document.getElementById('notifications-enabled');
    const config = document.getElementById('notifications-config');
    const timeInput = document.getElementById('notification-time');
    const weekdayCheckboxes = document.querySelectorAll('.weekday-item input[type="checkbox"]');
    const btnTest = document.getElementById('btn-test-notification');
    const warning = document.getElementById('notification-warning');

    // Afficher avertissement si pas sur localhost (mobile via IP)
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (!isLocalhost && warning) {
        warning.style.display = 'flex';
    }

    toggle.addEventListener('change', async () => {
        if (toggle.checked) {
            // Demander permission si pas encore accordée
            const permission = await requestNotificationPermission();
            if (permission === 'granted') {
                notificationSettings.enabled = true;
                config.style.display = 'block';
                saveNotificationSettings();
                scheduleNotifications();
            } else {
                toggle.checked = false;
                showToast('Permission de notifications refusée', 'error');
            }
        } else {
            notificationSettings.enabled = false;
            config.style.display = 'none';
            saveNotificationSettings();
            cancelNotifications();
        }
    });

    timeInput.addEventListener('change', () => {
        notificationSettings.time = timeInput.value;
        saveNotificationSettings();
        if (notificationSettings.enabled) {
            scheduleNotifications();
        }
    });

    weekdayCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', () => {
            updateWeekdays();
            saveNotificationSettings();
            if (notificationSettings.enabled) {
                scheduleNotifications();
            }
        });
    });

    btnTest.addEventListener('click', () => {
        sendTestNotification();
    });
}

async function requestNotificationPermission() {
    if (!('Notification' in window)) {
        showToast('Les notifications ne sont pas supportées', 'error');
        return 'denied';
    }

    if (Notification.permission === 'granted') {
        return 'granted';
    }

    if (Notification.permission !== 'denied') {
        const permission = await Notification.requestPermission();
        return permission;
    }

    return Notification.permission;
}

function loadNotificationSettings() {
    const saved = localStorage.getItem('notificationSettings');
    if (saved) {
        notificationSettings = JSON.parse(saved);
    }

    // Appliquer à l'interface
    const toggle = document.getElementById('notifications-enabled');
    const config = document.getElementById('notifications-config');
    const timeInput = document.getElementById('notification-time');

    toggle.checked = notificationSettings.enabled;
    config.style.display = notificationSettings.enabled ? 'block' : 'none';
    timeInput.value = notificationSettings.time;

    // Cocher les jours
    const weekdayCheckboxes = document.querySelectorAll('.weekday-item input[type="checkbox"]');
    weekdayCheckboxes.forEach(checkbox => {
        checkbox.checked = notificationSettings.weekdays.includes(parseInt(checkbox.value));
    });
}

function saveNotificationSettings() {
    localStorage.setItem('notificationSettings', JSON.stringify(notificationSettings));

    // Informer le Service Worker
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
            type: 'UPDATE_NOTIFICATION_SETTINGS',
            settings: notificationSettings
        });
    }
}

function updateWeekdays() {
    const weekdayCheckboxes = document.querySelectorAll('.weekday-item input[type="checkbox"]');
    notificationSettings.weekdays = [];
    weekdayCheckboxes.forEach(checkbox => {
        if (checkbox.checked) {
            notificationSettings.weekdays.push(parseInt(checkbox.value));
        }
    });
}

async function sendTestNotification() {
    const permission = await requestNotificationPermission();

    if (permission !== 'granted') {
        showToast('Permission de notifications refusée', 'error');
        return;
    }

    if ('serviceWorker' in navigator && 'showNotification' in ServiceWorkerRegistration.prototype) {
        navigator.serviceWorker.ready.then(registration => {
            registration.showNotification('Tracker Présence', {
                body: 'N\'oublie pas de logger ta journée client !',
                icon: '/icons/icon-192x192.png',
                badge: '/icons/icon-72x72.png',
                tag: 'test-notification',
                requireInteraction: false,
                vibrate: [200, 100, 200],
                data: {
                    url: '/'
                }
            });
        });
        showToast('Notification de test envoyée', 'success');
    } else {
        // Fallback pour navigateurs qui ne supportent pas les service worker notifications
        new Notification('Tracker Présence', {
            body: 'N\'oublie pas de logger ta journée client !',
            icon: '/icons/icon-192x192.png'
        });
        showToast('Notification de test envoyée', 'success');
    }
}

function scheduleNotifications() {
    // La planification réelle se fait dans le Service Worker
    // On envoie juste les paramètres mis à jour
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
            type: 'SCHEDULE_NOTIFICATIONS',
            settings: notificationSettings,
            vacations: vacations
        });
    }
}

function cancelNotifications() {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
            type: 'CANCEL_NOTIFICATIONS'
        });
    }
}

// ============ GESTION DE L'ASSISTANTE ============

function initAssistant() {
    const btnSave = document.getElementById('btn-save-assistant');

    btnSave.addEventListener('click', () => {
        saveAssistantSettings();
    });
}

function loadAssistantSettings() {
    const saved = localStorage.getItem('assistantSettings');
    if (saved) {
        assistantSettings = JSON.parse(saved);
    }

    // Appliquer à l'interface
    document.getElementById('assistant-email').value = assistantSettings.email || '';
    document.getElementById('assistant-name').value = assistantSettings.name || '';
    document.getElementById('assistant-message').value = assistantSettings.message || '';
}

function saveAssistantSettings() {
    assistantSettings.email = document.getElementById('assistant-email').value;
    assistantSettings.name = document.getElementById('assistant-name').value;
    assistantSettings.message = document.getElementById('assistant-message').value;

    localStorage.setItem('assistantSettings', JSON.stringify(assistantSettings));
    showToast('Parametres assistante sauvegardes', 'success');
}

// ============ SAUVEGARDE ET RESTAURATION ============

function initBackup() {
    const btnBackup = document.getElementById('btn-backup');
    const btnRestore = document.getElementById('btn-restore');
    const btnReset = document.getElementById('btn-reset-all');
    const fileInput = document.getElementById('restore-file-input');

    if (btnBackup) {
        btnBackup.addEventListener('click', backupData);
    }

    if (btnRestore) {
        btnRestore.addEventListener('click', () => fileInput.click());
    }

    if (fileInput) {
        fileInput.addEventListener('change', handleRestoreFile);
    }

    if (btnReset) {
        btnReset.addEventListener('click', resetAllData);
    }
}

function backupData() {
    const status = document.getElementById('backup-status');
    status.className = 'backup-status info';
    status.textContent = 'Preparation de la sauvegarde...';

    try {
        // Exporter toutes les donnees depuis localStorage
        const backup = exportAllData();

        // Telecharger le fichier
        const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        const dateStr = new Date().toISOString().split('T')[0];
        link.href = url;
        link.download = `logmyjob_backup_${dateStr}.json`;
        link.click();
        URL.revokeObjectURL(url);

        const daysCount = backup.data.days ? backup.data.days.length : 0;
        status.className = 'backup-status success';
        status.textContent = `Sauvegarde reussie! ${daysCount} presences exportees.`;

    } catch (error) {
        console.error('Erreur sauvegarde:', error);
        status.className = 'backup-status error';
        status.textContent = 'Erreur lors de la sauvegarde';
    }
}

function handleRestoreFile(event) {
    const file = event.target.files[0];
    if (!file) return;

    const status = document.getElementById('backup-status');
    status.className = 'backup-status info';
    status.textContent = 'Lecture du fichier...';

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const backup = JSON.parse(e.target.result);

            // Validation du format (supporte v1 et v2)
            const hasV2Data = backup.data && backup.data.days;
            const hasV1Data = backup.data && backup.data.presences;
            const hasLegacyData = backup.presences;

            if (!hasV2Data && !hasV1Data && !hasLegacyData) {
                throw new Error('Format de sauvegarde invalide');
            }

            // Compter les presences selon le format
            let presenceCount = 0;
            if (hasV2Data) {
                presenceCount = backup.data.days.length;
            } else if (hasV1Data) {
                presenceCount = backup.data.presences.length;
            } else if (hasLegacyData) {
                presenceCount = backup.presences.length;
            }

            // Confirmation
            const confirmMsg = `Restaurer ${presenceCount} presences?\n\nAttention: Les donnees actuelles seront remplacees.`;

            if (!confirm(confirmMsg)) {
                status.textContent = '';
                status.className = 'backup-status';
                event.target.value = '';
                return;
            }

            status.textContent = 'Restauration en cours...';

            // Adapter le format pour importAllData
            let importData;
            if (hasV2Data) {
                importData = backup;
            } else if (hasV1Data) {
                // Convertir v1 vers v2
                importData = {
                    version: '2.0',
                    data: {
                        days: backup.data.presences.map(p => ({
                            id: p.id || Date.now() + Math.random(),
                            date: p.date,
                            client: p.client,
                            duree: p.duree,
                            notes: p.notes || '',
                            created_at: p.created_at || new Date().toISOString()
                        })),
                        clients: [...new Set(backup.data.presences.map(p => p.client))].sort(),
                        vacations: backup.data.settings?.vacations || [],
                        settings: backup.data.settings || {}
                    }
                };
            } else {
                // Format legacy API
                importData = backup;
            }

            // Importer les donnees
            const result = importAllData(importData, true);

            if (result.success) {
                status.className = 'backup-status success';
                status.textContent = `Restauration reussie! ${result.imported.days} presences importees.`;

                // Recharger les donnees dans l'app
                loadData();
                vacations = getAllVacations();
                renderVacationsList();
                loadAssistantSettings();
                loadClientColors();
                renderClientColorsList();

                showToast('Donnees restaurees avec succes', 'success');
            } else {
                throw new Error(result.error);
            }

        } catch (error) {
            console.error('Erreur restauration:', error);
            status.className = 'backup-status error';
            status.textContent = 'Erreur: ' + error.message;
        }

        event.target.value = '';
    };

    reader.readAsText(file);
}

// Reinitialisation complete
function resetAllData() {
    // Premier avertissement
    const confirm1 = confirm(
        'ATTENTION\n\n' +
        'Vous etes sur le point de supprimer TOUTES vos donnees :\n' +
        '- Toutes les presences\n' +
        '- Tous les conges\n' +
        '- Tous les parametres\n' +
        '- Toutes les couleurs clients\n\n' +
        'Avez-vous effectue une SAUVEGARDE ?\n\n' +
        'Cliquez sur OK pour continuer ou Annuler pour sauvegarder d\'abord.'
    );

    if (!confirm1) return;

    // Deuxieme confirmation
    const confirm2 = confirm(
        'CONFIRMATION FINALE\n\n' +
        'Cette action est IRREVERSIBLE.\n\n' +
        'Etes-vous VRAIMENT sur de vouloir tout supprimer ?'
    );

    if (!confirm2) return;

    try {
        // Supprimer toutes les donnees via storage.js
        const result = resetAllData_storage();

        // Supprimer aussi les autres donnees localStorage
        localStorage.removeItem('notificationSettings');
        localStorage.removeItem('assistantSettings');
        localStorage.removeItem('clientColors');
        localStorage.removeItem('logmyjob_vacations');

        // Reinitialiser les variables
        vacations = [];
        notificationSettings = { enabled: false, time: '18:00', weekdays: [1, 2, 3, 4, 5] };
        assistantSettings = { email: '', name: '', message: '' };
        clientColors = {};
        allPresences = [];
        allClients = [];

        // Recharger l'interface
        loadData();
        renderVacationsList();
        loadAssistantSettings();
        renderClientColorsList();

        // Desactiver les notifications
        const toggle = document.getElementById('notifications-enabled');
        if (toggle) toggle.checked = false;
        const config = document.getElementById('notifications-config');
        if (config) config.style.display = 'none';

        showToast('Reinitialisation terminee.', 'success');

        // Retourner a l'accueil
        navigateTo('home');

    } catch (error) {
        console.error('Erreur reinitialisation:', error);
        showToast('Erreur lors de la reinitialisation', 'error');
    }
}

// Alias pour eviter conflit de nom avec storage.js
function resetAllData_storage() {
    return resetAllData_internal();
}

function resetAllData_internal() {
    try {
        // Utiliser les fonctions de storage.js
        saveToStorage('logmyjob_days', []);
        saveToStorage('logmyjob_clients', []);
        saveToStorage('logmyjob_vacations', []);
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

// Fonction utilitaire pour sauvegarder dans localStorage (utilisee par resetAllData_internal)
function saveToStorage(key, data) {
    try {
        localStorage.setItem(key, JSON.stringify(data));
        return true;
    } catch (e) {
        console.error(`Error saving ${key}:`, e);
        return false;
    }
}

// ============ DARK MODE ============

let currentTheme = 'auto'; // 'light', 'dark', 'auto'

function initDarkMode() {
    // Charger le theme sauvegarde
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        currentTheme = savedTheme;
    }

    // Appliquer le theme initial
    applyTheme(currentTheme);

    // Ecouter les changements de preference systeme
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', (e) => {
        if (currentTheme === 'auto') {
            applyTheme('auto');
        }
    });

    // Initialiser les boutons de theme
    const toggleBtn = document.getElementById('dark-mode-toggle');
    const lightBtn = document.getElementById('theme-light');
    const darkBtn = document.getElementById('theme-dark');
    const autoBtn = document.getElementById('theme-auto');

    if (toggleBtn) {
        toggleBtn.addEventListener('change', (e) => {
            setTheme(e.target.checked ? 'dark' : 'light');
        });
    }

    if (lightBtn) {
        lightBtn.addEventListener('click', () => setTheme('light'));
    }

    if (darkBtn) {
        darkBtn.addEventListener('click', () => setTheme('dark'));
    }

    if (autoBtn) {
        autoBtn.addEventListener('click', () => setTheme('auto'));
    }

    // Mettre a jour l'interface initiale
    updateThemeUI();
}

function setTheme(theme) {
    currentTheme = theme;
    localStorage.setItem('theme', theme);
    applyTheme(theme);
    updateThemeUI();
}

function applyTheme(theme) {
    const html = document.documentElement;
    const body = document.body;

    // Supprimer les classes existantes
    html.classList.remove('dark', 'light');
    body.classList.remove('dark', 'light');

    let isDark = false;

    if (theme === 'dark') {
        isDark = true;
    } else if (theme === 'auto') {
        // Verifier la preference systeme
        isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    // theme === 'light' -> isDark reste false

    if (isDark) {
        html.classList.add('dark');
        body.classList.add('dark');
    } else {
        html.classList.add('light');
        body.classList.add('light');
    }

    // Mettre a jour le meta theme-color
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
        metaThemeColor.setAttribute('content', isDark ? '#1e293b' : '#2563eb');
    }

    // Mettre a jour Chart.js si disponible
    updateChartTheme(isDark);
}

function updateThemeUI() {
    const toggleBtn = document.getElementById('dark-mode-toggle');
    const lightBtn = document.getElementById('theme-light');
    const darkBtn = document.getElementById('theme-dark');
    const autoBtn = document.getElementById('theme-auto');

    // Determiner si le mode sombre est actif
    const isDark = document.documentElement.classList.contains('dark');

    // Mettre a jour le toggle
    if (toggleBtn) {
        toggleBtn.checked = isDark;
    }

    // Mettre a jour les boutons de theme
    [lightBtn, darkBtn, autoBtn].forEach(btn => {
        if (btn) btn.classList.remove('active');
    });

    if (currentTheme === 'light' && lightBtn) {
        lightBtn.classList.add('active');
    } else if (currentTheme === 'dark' && darkBtn) {
        darkBtn.classList.add('active');
    } else if (currentTheme === 'auto' && autoBtn) {
        autoBtn.classList.add('active');
    }
}

function updateChartTheme(isDark) {
    // Mettre a jour les couleurs du graphique Chart.js si il existe
    if (typeof Chart !== 'undefined' && Chart.instances) {
        const textColor = isDark ? '#f1f5f9' : '#1e293b';
        const gridColor = isDark ? '#475569' : '#e2e8f0';

        Object.values(Chart.instances).forEach(chart => {
            if (chart.options.scales) {
                if (chart.options.scales.x) {
                    chart.options.scales.x.ticks = chart.options.scales.x.ticks || {};
                    chart.options.scales.x.ticks.color = textColor;
                    chart.options.scales.x.grid = chart.options.scales.x.grid || {};
                    chart.options.scales.x.grid.color = gridColor;
                }
                if (chart.options.scales.y) {
                    chart.options.scales.y.ticks = chart.options.scales.y.ticks || {};
                    chart.options.scales.y.ticks.color = textColor;
                    chart.options.scales.y.grid = chart.options.scales.y.grid || {};
                    chart.options.scales.y.grid.color = gridColor;
                }
            }
            if (chart.options.plugins && chart.options.plugins.legend) {
                chart.options.plugins.legend.labels = chart.options.plugins.legend.labels || {};
                chart.options.plugins.legend.labels.color = textColor;
            }
            chart.update();
        });
    }
}

// Fonction utilitaire pour verifier si le mode sombre est actif
function isDarkMode() {
    return document.documentElement.classList.contains('dark');
}

// ============ PWA INSTALLATION ============

let deferredPrompt = null;

function initPWAInstall() {
    // Verifier si deja installe (mode standalone)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
        || window.navigator.standalone === true;

    // Detecter iOS
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

    // Ecouter l'evenement beforeinstallprompt (Chrome, Edge, etc.)
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        showInstallBanner();
        updateSettingsInstallSection();
    });

    // Ecouter quand l'app est installee
    window.addEventListener('appinstalled', () => {
        deferredPrompt = null;
        hideInstallBanner();
        hideIOSBanner();
        updateSettingsInstallSection();
        showToast('Application installee avec succes!', 'success');
    });

    // Initialiser les boutons
    initInstallBannerButtons();
    initIOSBannerButtons();
    initSettingsInstallButton();

    // Afficher la banniere appropriee
    if (isStandalone) {
        // Deja installe - ne rien afficher
        updateSettingsInstallSection();
    } else if (isIOS) {
        // iOS - afficher instructions si pas refuse recemment
        if (shouldShowIOSBanner()) {
            showIOSBanner();
        }
        updateSettingsInstallSection();
    }
    // Pour Android/Chrome, la banniere s'affiche via beforeinstallprompt

    // Mettre a jour la section reglages
    updateSettingsInstallSection();
}

// ============ BANNIERE INSTALLATION (Android/Chrome) ============

function showInstallBanner() {
    if (!shouldShowInstallBanner()) return;

    const banner = document.getElementById('install-banner');
    if (banner) {
        banner.classList.remove('hidden');
        banner.classList.add('install-banner-show');
    }
}

function hideInstallBanner() {
    const banner = document.getElementById('install-banner');
    if (banner) {
        banner.classList.add('hidden');
        banner.classList.remove('install-banner-show');
    }
}

function shouldShowInstallBanner() {
    const dismissed = localStorage.getItem('pwa-install-dismissed');
    const later = localStorage.getItem('pwa-install-later');

    // Si refuse, ne plus afficher pendant 7 jours
    if (dismissed) {
        const dismissedDate = new Date(dismissed);
        const daysSinceDismissed = (Date.now() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceDismissed < 7) return false;
    }

    // Si "plus tard", reafficher apres 3 jours
    if (later) {
        const laterDate = new Date(later);
        const daysSinceLater = (Date.now() - laterDate.getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceLater < 3) return false;
    }

    return true;
}

function initInstallBannerButtons() {
    const installBtn = document.getElementById('install-banner-btn');
    const laterBtn = document.getElementById('install-banner-later');
    const closeBtn = document.getElementById('install-banner-close');

    if (installBtn) {
        installBtn.addEventListener('click', async () => {
            await triggerInstallPrompt();
        });
    }

    if (laterBtn) {
        laterBtn.addEventListener('click', () => {
            localStorage.setItem('pwa-install-later', new Date().toISOString());
            hideInstallBanner();
        });
    }

    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            localStorage.setItem('pwa-install-dismissed', new Date().toISOString());
            hideInstallBanner();
        });
    }
}

async function triggerInstallPrompt() {
    if (!deferredPrompt) {
        showToast('Installation non disponible', 'error');
        return;
    }

    deferredPrompt.prompt();

    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
        console.log('Installation acceptee');
    } else {
        console.log('Installation refusee');
        localStorage.setItem('pwa-install-dismissed', new Date().toISOString());
    }

    deferredPrompt = null;
    hideInstallBanner();
}

// ============ BANNIERE iOS ============

function showIOSBanner() {
    const banner = document.getElementById('ios-install-banner');
    if (banner) {
        banner.classList.remove('hidden');
        banner.classList.add('install-banner-show');
    }
}

function hideIOSBanner() {
    const banner = document.getElementById('ios-install-banner');
    if (banner) {
        banner.classList.add('hidden');
        banner.classList.remove('install-banner-show');
    }
}

function shouldShowIOSBanner() {
    const dismissed = localStorage.getItem('pwa-ios-dismissed');
    const understood = localStorage.getItem('pwa-ios-understood');

    // Si "j'ai compris" ou ferme, ne plus afficher pendant 7 jours
    const checkDate = dismissed || understood;
    if (checkDate) {
        const date = new Date(checkDate);
        const daysSince = (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24);
        if (daysSince < 7) return false;
    }

    return true;
}

function initIOSBannerButtons() {
    const understoodBtn = document.getElementById('ios-banner-understood');
    const closeBtn = document.getElementById('ios-banner-close');

    if (understoodBtn) {
        understoodBtn.addEventListener('click', () => {
            localStorage.setItem('pwa-ios-understood', new Date().toISOString());
            hideIOSBanner();
        });
    }

    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            localStorage.setItem('pwa-ios-dismissed', new Date().toISOString());
            hideIOSBanner();
        });
    }
}

// ============ SECTION REGLAGES ============

function updateSettingsInstallSection() {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
        || window.navigator.standalone === true;
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

    const notInstalledSection = document.getElementById('app-not-installed');
    const iosSection = document.getElementById('app-ios-instructions');
    const installedSection = document.getElementById('app-installed');

    // Cacher toutes les sections
    if (notInstalledSection) notInstalledSection.classList.add('hidden');
    if (iosSection) iosSection.classList.add('hidden');
    if (installedSection) installedSection.classList.add('hidden');

    if (isStandalone) {
        // App installee
        if (installedSection) installedSection.classList.remove('hidden');
    } else if (isIOS) {
        // iOS - montrer instructions
        if (iosSection) iosSection.classList.remove('hidden');
    } else if (deferredPrompt) {
        // Android/Chrome - montrer bouton installer
        if (notInstalledSection) notInstalledSection.classList.remove('hidden');
    } else {
        // Pas de prompt disponible mais pas installe
        // On affiche quand meme la section "non installe" avec un message adapte
        if (notInstalledSection) notInstalledSection.classList.remove('hidden');
    }
}

function initSettingsInstallButton() {
    const settingsInstallBtn = document.getElementById('settings-install-btn');

    if (settingsInstallBtn) {
        settingsInstallBtn.addEventListener('click', async () => {
            if (deferredPrompt) {
                await triggerInstallPrompt();
            } else {
                // Pas de prompt disponible - afficher message
                const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
                if (isIOS) {
                    showIOSBanner();
                    navigateTo('home');
                } else {
                    showToast('Utilisez le menu de votre navigateur pour installer', 'info');
                }
            }
        });
    }
}

// Fonction pour verifier si l'app est installee
function isPWAInstalled() {
    return window.matchMedia('(display-mode: standalone)').matches
        || window.navigator.standalone === true;
}
