// ============ APPLICATION LOG MY JOB ============
// Stockage via Supabase - Authentification requise

// Echappe un texte saisi par l'utilisateur (client, notes) avant de l'inserer
// dans du HTML via innerHTML / template string. Sert aussi dans les attributs.
function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// Etat global
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
    weekdays: [1, 2, 3, 4, 5]
};
let assistantSettings = {
    email: '',
    name: '',
    message: ''
};

// Couleurs des clients
let clientColors = {};
const DEFAULT_COLORS = [
    '#2563eb', '#10b981', '#f59e0b', '#ef4444',
    '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16',
    '#f97316', '#6366f1', '#14b8a6', '#a855f7'
];

// Initialisation
document.addEventListener('DOMContentLoaded', async () => {
    // Verifier l'authentification
    const isAuth = await auth.isAuthenticated();
    if (!isAuth) {
        window.location.href = '/auth.html';
        return;
    }

    // Afficher l'email utilisateur
    const user = await auth.getCurrentUser();
    const userEmailEl = document.getElementById('user-email');
    if (userEmailEl && user) {
        userEmailEl.textContent = user.email;
    }

    // Cache hors ligne propre a cet utilisateur, puis reglages synchronises
    // (avant les init* qui lisent les reglages dans localStorage).
    OfflineStore.setUser(user.id);
    if (await Prefs.pull()) {
        const syncedLang = localStorage.getItem('app-language');
        if (syncedLang && translations[syncedLang] && syncedLang !== currentLang) {
            currentLang = syncedLang;
            document.documentElement.lang = syncedLang;
            applyTranslations();
        }
    }

    // Initialiser le bouton de deconnexion
    const logoutBtn = document.getElementById('btn-logout');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            if (confirm('Voulez-vous vraiment vous deconnecter ?')) {
                await auth.signOut();
            }
        });
    }

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
    initOfflineMode();

    await loadData();
    await loadVacations();
    loadNotificationSettings();
    loadAssistantSettings();
    checkCurrentVacation();
    requestNotificationPermission();

    // Vérifier si une notification a été manquée
    setTimeout(() => {
        checkMissedNotification();
    }, 2000); // Attendre que le SW soit prêt
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

    window.addEventListener('languageChanged', () => {
        updateMonthWidget();
        loadRecentPresences();
        if (typeof renderCalendar === 'function') renderCalendar();
        if (typeof loadHistory === 'function') loadHistory();
        if (typeof updateStats === 'function') updateStats();
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
    Prefs.touch();
}

function getClientColor(clientName) {
    if (clientColors[clientName]) {
        return clientColors[clientName];
    }

    const clientIndex = allClients.indexOf(clientName);
    const colorIndex = clientIndex >= 0 ? clientIndex % DEFAULT_COLORS.length : 0;
    const color = DEFAULT_COLORS[colorIndex];

    // Couleur par defaut : non enregistree (deterministe), pour ne pas ecraser
    // les couleurs synchronisees depuis un autre appareil.
    return color;
}

function setClientColor(clientName, color) {
    clientColors[clientName] = color;
    saveClientColors();

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
        container.innerHTML = '<p class="empty-hint">Aucun client enregistre</p>';
        return;
    }

    allClients.forEach(client => {
        const color = getClientColor(client);
        const item = document.createElement('div');
        item.className = 'client-color-item';
        item.innerHTML = `
            <div class="client-color-info">
                <span class="client-color-badge" style="background-color: ${color}"></span>
                <span class="client-color-name">${escapeHtml(client)}</span>
            </div>
            <div class="client-color-picker-wrapper">
                <input type="color" value="${color}" class="client-color-picker" data-client="${escapeHtml(client)}">
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
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

    document.getElementById(`page-${page}`).classList.add('active');
    document.querySelector(`[data-page="${page}"]`).classList.add('active');

    currentPage = page;

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

            quickDateButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            updateBillingMonthLabel();
        });
    });

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
        updateBillingMonthLabel();
    });

    // Event listener pour la checkbox "Facturer le mois prochain"
    const billNextMonthCheckbox = document.getElementById('bill-next-month');
    if (billNextMonthCheckbox) {
        billNextMonthCheckbox.addEventListener('change', updateBillingMonthLabel);
    }
}

// Formater le mois de facturation pour affichage
function formatBillingMonth(monthStr) {
    if (!monthStr) return '';
    const [year, month] = monthStr.split('-');
    const monthNames = ['Janvier', 'Fevrier', 'Mars', 'Avril', 'Mai', 'Juin',
                        'Juillet', 'Aout', 'Septembre', 'Octobre', 'Novembre', 'Decembre'];
    return `${monthNames[parseInt(month) - 1]} ${year}`;
}

// Mois suivant une date 'YYYY-MM-DD', au format 'YYYY-MM'.
// Calcul sur les chaines : new Date('2026-01-31').setMonth(+1) donnerait mars.
function getNextMonth(dateStr) {
    const [year, month] = dateStr.split('-').map(Number);
    return month === 12
        ? `${year + 1}-01`
        : `${year}-${String(month + 1).padStart(2, '0')}`;
}

// Mettre a jour le label du mois de facturation
function updateBillingMonthLabel() {
    const billNextMonthCheckbox = document.getElementById('bill-next-month');
    const billingMonthLabel = document.getElementById('billing-month-label');
    const dateInput = document.getElementById('date');

    if (!billNextMonthCheckbox || !billingMonthLabel) return;

    if (billNextMonthCheckbox.checked && dateInput.value) {
        billingMonthLabel.textContent = formatBillingMonth(getNextMonth(dateInput.value));
        billingMonthLabel.classList.remove('hidden');
    } else {
        billingMonthLabel.classList.add('hidden');
    }
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
    const billNextMonthCheckbox = document.getElementById('bill-next-month');
    const billingMonthLabel = document.getElementById('billing-month-label');

    if (editData) {
        formTitle.textContent = 'Modifier la presence';
        document.getElementById('edit-id').value = editData.id;
        document.getElementById('date').value = editData.date;

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

        // Gerer billing_month
        if (editData.billing_month) {
            billNextMonthCheckbox.checked = true;
            billingMonthLabel.textContent = formatBillingMonth(editData.billing_month);
            billingMonthLabel.classList.remove('hidden');
        } else {
            billNextMonthCheckbox.checked = false;
            billingMonthLabel.classList.add('hidden');
        }

        currentEditId = editData.id;
    } else {
        formTitle.textContent = 'Nouvelle presence';
        form.reset();
        document.getElementById('date').value = getTodayDate();
        billNextMonthCheckbox.checked = false;
        billingMonthLabel.classList.add('hidden');
        currentEditId = null;
    }

    updateQuickDateButtonsState();
    updateBillingMonthLabel();
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

async function savePresence() {
    const date = document.getElementById('date').value;
    const clientSelect = document.getElementById('client-select').value;
    const clientInput = document.getElementById('client-input').value;
    const client = clientInput || clientSelect;
    const duree = document.querySelector('input[name="duree"]:checked').value;
    const notes = document.getElementById('notes').value;
    const billNextMonth = document.getElementById('bill-next-month').checked;

    if (!client) {
        showToast('Veuillez selectionner ou saisir un client', 'error');
        return;
    }

    // Calculer le mois de facturation si "Facturer le mois prochain" est coche
    let billing_month = null;
    if (billNextMonth && date) {
        billing_month = getNextMonth(date);
    }

    const data = { date, client, duree, notes, billing_month };

    try {
        let result;
        if (currentEditId) {
            result = await api.updateDay(currentEditId, data);
        } else {
            result = await api.addDay(data);
        }

        if (result.success) {
            const label = currentEditId ? 'Jour mis a jour' : 'Jour enregistre';
            showToast(result.queued ? `${label} (hors ligne, sera synchronise)` : label,
                result.queued ? 'warning' : 'success');
            hideForm();
            await loadData();
        }
    } catch (error) {
        console.error('Erreur sauvegarde:', error);
        showToast(error.message || 'Erreur lors de l\'enregistrement', 'error');
    }
}

async function deletePresence(id) {
    if (!confirm('Supprimer ce jour ?')) return;

    try {
        const result = await api.deleteDay(id);
        showToast(result.queued ? 'Jour supprime (hors ligne, sera synchronise)' : 'Jour supprime',
            result.queued ? 'warning' : 'success');
        await loadData();
    } catch (error) {
        console.error('Erreur suppression:', error);
        showToast('Erreur lors de la suppression', 'error');
    }
}

// Chargement des donnees depuis Supabase
async function loadData() {
    try {
        // Charger toutes les presences
        allPresences = await api.getAllDays();

        // Charger les clients
        allClients = await api.getClients();

        // Charger les couleurs depuis localStorage
        loadClientColors();

        updateUI();
    } catch (error) {
        console.error('Erreur chargement donnees:', error);
        showToast('Erreur de chargement des donnees', 'error');
    }
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
    select.innerHTML = '<option value="">-- Selectionner --</option>';

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

    // Filtrer par billing_month si defini, sinon par date reelle
    const monthPresences = allPresences.filter(p => {
        if (p.billing_month) {
            return p.billing_month === currentMonth;
        }
        return p.date.startsWith(currentMonth);
    });

    const totalDays = calculateTotalDays(monthPresences);
    document.getElementById('month-total').textContent = totalDays.toFixed(1);

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

    const monthNames = ['Janvier', 'Fevrier', 'Mars', 'Avril', 'Mai', 'Juin',
                        'Juillet', 'Aout', 'Septembre', 'Octobre', 'Novembre', 'Decembre'];
    document.getElementById('current-month-label').textContent = `${monthNames[now.getMonth()]} ${now.getFullYear()}`;
}

function updateRecentDays() {
    const recentList = document.getElementById('recent-list');
    recentList.innerHTML = '';

    const recent = allPresences.slice(0, 5);

    if (recent.length === 0) {
        recentList.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">Aucun jour enregistre</p>';
        return;
    }

    recent.forEach(presence => {
        const div = document.createElement('div');
        div.className = 'day-item';
        const clientColor = getClientColor(presence.client);

        // Afficher un badge si le jour est differe au mois prochain
        let deferredBadge = '';
        if (presence.billing_month) {
            deferredBadge = `<span class="deferred-badge">Facture ${formatBillingMonth(presence.billing_month)}</span>`;
        }

        div.innerHTML = `
            <div class="day-color-bar" style="background-color: ${clientColor}"></div>
            <div class="day-info">
                <div class="day-date">${formatDate(presence.date)} ${deferredBadge}</div>
                <div class="day-client">${escapeHtml(presence.client)}</div>
                <div class="day-duration">${formatDuration(presence.duree)}</div>
                ${presence.notes ? `<div class="day-notes">${escapeHtml(presence.notes)}</div>` : ''}
            </div>
            <div class="day-actions">
                <button class="btn-primary btn-small" onclick="editPresence('${presence.id}')">✏️</button>
                <button class="btn-danger btn-small" onclick="deletePresence('${presence.id}')">🗑️</button>
            </div>
        `;
        recentList.appendChild(div);
    });
}

function editPresence(id) {
    const presence = allPresences.find(p => String(p.id) === String(id));
    if (presence) {
        navigateTo('home');
        setTimeout(() => showForm(presence), 100);
    }
}

// Filtres
function initFilters() {
    // Gere dans history.js
}

function updateFilterSelects() {
    const filterMonth = document.getElementById('filter-month');
    const filterClient = document.getElementById('filter-client');

    if (!filterMonth || !filterClient) return;

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
    if (typeof renderHistoryView === 'function') {
        renderHistoryView();
    }
}

// Utilitaires
function getTodayDate() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function formatDate(dateStr) {
    const date = new Date(dateStr + 'T00:00:00');
    const days = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
    const months = ['jan', 'fev', 'mar', 'avr', 'mai', 'juin', 'juil', 'aou', 'sep', 'oct', 'nov', 'dec'];
    return `${days[date.getDay()]} ${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

function formatMonth(monthStr) {
    const [year, month] = monthStr.split('-');
    const months = ['Janvier', 'Fevrier', 'Mars', 'Avril', 'Mai', 'Juin',
                    'Juillet', 'Aout', 'Septembre', 'Octobre', 'Novembre', 'Decembre'];
    return `${months[parseInt(month) - 1]} ${year}`;
}

function formatDuration(duree) {
    const map = {
        'journee_complete': 'Journee complete (1j)',
        'demi_journee_matin': 'Matin (0.5j)',
        'demi_journee_aprem': 'Apres-midi (0.5j)',
        '1.0': 'Journee complete (1j)',
        '0.5': 'Demi-journee (0.5j)'
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

// ============ GESTION DES CONGES ============

function initVacations() {
    const btnAdd = document.getElementById('btn-add-vacation');
    const btnAddHome = document.getElementById('btn-add-vacation-home');
    const modal = document.getElementById('vacation-modal');
    const modalClose = document.getElementById('vacation-modal-close');
    const cancelBtn = document.getElementById('vacation-cancel');
    const form = document.getElementById('vacation-form');

    if (btnAdd) btnAdd.addEventListener('click', () => showVacationModal());
    if (btnAddHome) btnAddHome.addEventListener('click', () => showVacationModal());

    modalClose.addEventListener('click', () => hideVacationModal());
    cancelBtn.addEventListener('click', () => hideVacationModal());

    modal.addEventListener('click', (e) => {
        if (e.target === modal) hideVacationModal();
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await saveVacation();
    });
}

async function loadVacations() {
    try {
        vacations = await api.getHolidays();
    } catch (error) {
        console.error('Erreur chargement conges:', error);
        vacations = [];
    }
}

function showVacationModal(vacation = null) {
    const modal = document.getElementById('vacation-modal');
    const title = document.getElementById('vacation-modal-title');
    const form = document.getElementById('vacation-form');

    if (vacation) {
        title.textContent = 'Modifier les conges';
        document.getElementById('vacation-edit-id').value = vacation.id;
        document.getElementById('vacation-start').value = vacation.dateDebut;
        document.getElementById('vacation-end').value = vacation.dateFin;
        document.getElementById('vacation-type').value = vacation.type;
    } else {
        title.textContent = 'Ajouter des conges';
        form.reset();
        document.getElementById('vacation-edit-id').value = '';
    }

    modal.style.display = 'flex';
}

function hideVacationModal() {
    const modal = document.getElementById('vacation-modal');
    modal.style.display = 'none';
}

async function saveVacation() {
    const editId = document.getElementById('vacation-edit-id').value;
    const dateDebut = document.getElementById('vacation-start').value;
    const dateFin = document.getElementById('vacation-end').value;
    const type = document.getElementById('vacation-type').value;

    if (new Date(dateFin) < new Date(dateDebut)) {
        showToast('La date de fin doit etre >= a la date de debut', 'error');
        return;
    }

    const hasOverlap = vacations.some(v => {
        if (editId && String(v.id) === String(editId)) return false;

        const vStart = new Date(v.dateDebut);
        const vEnd = new Date(v.dateFin);
        const newStart = new Date(dateDebut);
        const newEnd = new Date(dateFin);

        return (newStart <= vEnd && newEnd >= vStart);
    });

    if (hasOverlap) {
        showToast('Cette periode chevauche une periode existante', 'error');
        return;
    }

    try {
        if (editId) {
            await api.updateHoliday(editId, { dateDebut, dateFin, type });
        } else {
            await api.addHoliday({ dateDebut, dateFin, type });
        }

        await loadVacations();
        checkCurrentVacation();
        hideVacationModal();
        showToast(editId ? 'Conges modifies' : 'Conges ajoutes', 'success');

        if (currentPage === 'calendar') {
            renderCalendar();
        }
    } catch (error) {
        console.error('Erreur sauvegarde conges:', error);
        showToast('Erreur lors de la sauvegarde', 'error');
    }
}

async function deleteVacation(id, skipConfirm = false) {
    if (!skipConfirm && !confirm('Supprimer cette periode de conges ?')) return;

    try {
        await api.deleteHoliday(id);
        await loadVacations();
        checkCurrentVacation();

        if (currentPage === 'calendar') {
            renderCalendar();
        }

        showToast('Conges supprimes', 'success');
    } catch (error) {
        console.error('Erreur suppression conges:', error);
        showToast('Erreur lors de la suppression', 'error');
    }
}

function editVacation(id) {
    const vacation = vacations.find(v => String(v.id) === String(id));
    if (vacation) {
        const dayModal = document.getElementById('day-details-modal');
        if (dayModal) dayModal.style.display = 'none';
        showVacationModal(vacation);
    }
}

function getVacationType(type) {
    const types = {
        'conges': 'Conges',
        'rtt': 'RTT',
        'ferie': 'Ferie',
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
        bannerText.textContent = `${icon} Vous etes en ${typeLabel.toLowerCase()} jusqu'au ${formatDate(activeVacation.dateFin)}`;
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

    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (!isLocalhost && warning) {
        warning.style.display = 'flex';
    }

    toggle.addEventListener('change', async () => {
        if (toggle.checked) {
            const permission = await requestNotificationPermission();
            if (permission === 'granted') {
                notificationSettings.enabled = true;
                config.style.display = 'block';
                saveNotificationSettings();
                scheduleNotifications();
            } else {
                toggle.checked = false;
                showToast('Permission de notifications refusee', 'error');
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
        showToast('Les notifications ne sont pas supportees', 'error');
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

    const toggle = document.getElementById('notifications-enabled');
    const config = document.getElementById('notifications-config');
    const timeInput = document.getElementById('notification-time');

    toggle.checked = notificationSettings.enabled;
    config.style.display = notificationSettings.enabled ? 'block' : 'none';
    timeInput.value = notificationSettings.time;

    const weekdayCheckboxes = document.querySelectorAll('.weekday-item input[type="checkbox"]');
    weekdayCheckboxes.forEach(checkbox => {
        checkbox.checked = notificationSettings.weekdays.includes(parseInt(checkbox.value));
    });
}

function saveNotificationSettings() {
    localStorage.setItem('notificationSettings', JSON.stringify(notificationSettings));
    Prefs.touch();

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
        showToast('Permission de notifications refusee', 'error');
        return;
    }

    if ('serviceWorker' in navigator && 'showNotification' in ServiceWorkerRegistration.prototype) {
        navigator.serviceWorker.ready.then(registration => {
            registration.showNotification('Log My Job', {
                body: 'N\'oublie pas de logger ta journee client !',
                icon: '/icons/icon-192x192.png',
                badge: '/icons/icon-72x72.png',
                tag: 'test-notification',
                requireInteraction: false,
                vibrate: [200, 100, 200],
                data: { url: '/' }
            });
        });
        showToast('Notification de test envoyee', 'success');
    } else {
        new Notification('Log My Job', {
            body: 'N\'oublie pas de logger ta journee client !',
            icon: '/icons/icon-192x192.png'
        });
        showToast('Notification de test envoyee', 'success');
    }
}

function scheduleNotifications() {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
            type: 'SCHEDULE_NOTIFICATIONS',
            settings: notificationSettings,
            vacations: vacations
        });
    }
}

// Vérifier si une notification a été manquée (appelé au chargement)
function checkMissedNotification() {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
            type: 'CHECK_NOTIFICATION'
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

    document.getElementById('assistant-email').value = assistantSettings.email || '';
    document.getElementById('assistant-name').value = assistantSettings.name || '';
    document.getElementById('assistant-message').value = assistantSettings.message || '';
}

function saveAssistantSettings() {
    assistantSettings.email = document.getElementById('assistant-email').value;
    assistantSettings.name = document.getElementById('assistant-name').value;
    assistantSettings.message = document.getElementById('assistant-message').value;

    localStorage.setItem('assistantSettings', JSON.stringify(assistantSettings));
    Prefs.touch();
    showToast('Parametres assistante sauvegardes', 'success');
}

// ============ SAUVEGARDE ET RESTAURATION ============

function initBackup() {
    const btnBackup = document.getElementById('btn-backup');
    const btnRestore = document.getElementById('btn-restore');
    const btnReset = document.getElementById('btn-reset-all');
    const fileInput = document.getElementById('restore-file-input');
    const autoBackupToggle = document.getElementById('auto-backup-toggle');

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

    if (autoBackupToggle) {
        autoBackupToggle.checked = localStorage.getItem('autoBackupEnabled') === 'true';

        autoBackupToggle.addEventListener('change', () => {
            localStorage.setItem('autoBackupEnabled', autoBackupToggle.checked);
            Prefs.touch();
            if (autoBackupToggle.checked) {
                showToast('Sauvegarde auto activee', 'success');
            } else {
                showToast('Sauvegarde auto desactivee', 'info');
            }
        });
    }
}

async function backupData() {
    const status = document.getElementById('backup-status');
    status.className = 'backup-status info';
    status.textContent = 'Preparation de la sauvegarde...';

    try {
        const backup = await api.exportAllData();

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

async function handleRestoreFile(event) {
    const file = event.target.files[0];
    if (!file) return;

    const status = document.getElementById('backup-status');
    status.className = 'backup-status info';
    status.textContent = 'Lecture du fichier...';

    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const backup = JSON.parse(e.target.result);

            const hasV2Data = backup.data && backup.data.days;
            const hasV1Data = backup.data && backup.data.presences;

            if (!hasV2Data && !hasV1Data) {
                throw new Error('Format de sauvegarde invalide');
            }

            let presenceCount = 0;
            if (hasV2Data) {
                presenceCount = backup.data.days.length;
            } else if (hasV1Data) {
                presenceCount = backup.data.presences.length;
            }

            const confirmMsg = `Restaurer ${presenceCount} presences?\n\nAttention: Les donnees actuelles seront remplacees.`;

            if (!confirm(confirmMsg)) {
                status.textContent = '';
                status.className = 'backup-status';
                event.target.value = '';
                return;
            }

            status.textContent = 'Restauration en cours...';

            await api.importData(backup, true);

            status.className = 'backup-status success';
            status.textContent = `Restauration reussie!`;

            await loadData();
            await loadVacations();
            loadAssistantSettings();
            loadClientColors();
            renderClientColorsList();

            showToast('Donnees restaurees avec succes', 'success');

        } catch (error) {
            console.error('Erreur restauration:', error);
            status.className = 'backup-status error';
            status.textContent = 'Erreur: ' + error.message;
        }

        event.target.value = '';
    };

    reader.readAsText(file);
}

async function resetAllData() {
    const confirm1 = confirm(
        'ATTENTION\n\n' +
        'Vous etes sur le point de supprimer TOUTES vos donnees.\n\n' +
        'Avez-vous effectue une SAUVEGARDE ?'
    );

    if (!confirm1) return;

    const confirm2 = confirm(
        'CONFIRMATION FINALE\n\n' +
        'Cette action est IRREVERSIBLE.\n\n' +
        'Etes-vous VRAIMENT sur de vouloir tout supprimer ?'
    );

    if (!confirm2) return;

    try {
        // Supprimer via API
        const supabase = getSupabase();
        const user = await auth.getCurrentUser();

        await Promise.all([
            supabase.from('days').delete().eq('user_id', user.id),
            supabase.from('clients').delete().eq('user_id', user.id),
            supabase.from('holidays').delete().eq('user_id', user.id),
            supabase.from('user_settings').delete().eq('user_id', user.id)
        ]);

        // Supprimer les donnees locales
        localStorage.removeItem('notificationSettings');
        localStorage.removeItem('assistantSettings');
        localStorage.removeItem('clientColors');

        // Reinitialiser les variables
        vacations = [];
        notificationSettings = { enabled: false, time: '18:00', weekdays: [1, 2, 3, 4, 5] };
        assistantSettings = { email: '', name: '', message: '' };
        clientColors = {};
        allPresences = [];
        allClients = [];

        await loadData();
        await loadVacations();
        loadAssistantSettings();
        renderClientColorsList();

        const toggle = document.getElementById('notifications-enabled');
        if (toggle) toggle.checked = false;
        const config = document.getElementById('notifications-config');
        if (config) config.style.display = 'none';

        showToast('Reinitialisation terminee.', 'success');
        navigateTo('home');

    } catch (error) {
        console.error('Erreur reinitialisation:', error);
        showToast('Erreur lors de la reinitialisation', 'error');
    }
}

// ============ DARK MODE ============

let currentTheme = 'auto';

function initDarkMode() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        currentTheme = savedTheme;
    }

    applyTheme(currentTheme);

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', (e) => {
        if (currentTheme === 'auto') {
            applyTheme('auto');
        }
    });

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

    updateThemeUI();
}

function setTheme(theme) {
    currentTheme = theme;
    localStorage.setItem('theme', theme);
    Prefs.touch();
    applyTheme(theme);
    updateThemeUI();
}

function applyTheme(theme) {
    const html = document.documentElement;
    const body = document.body;

    html.classList.remove('dark', 'light');
    body.classList.remove('dark', 'light');

    let isDark = false;

    if (theme === 'dark') {
        isDark = true;
    } else if (theme === 'auto') {
        isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    }

    if (isDark) {
        html.classList.add('dark');
        body.classList.add('dark');
    } else {
        html.classList.add('light');
        body.classList.add('light');
    }

    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
        metaThemeColor.setAttribute('content', isDark ? '#1e293b' : '#2563eb');
    }

    updateChartTheme(isDark);
}

function updateThemeUI() {
    const toggleBtn = document.getElementById('dark-mode-toggle');
    const lightBtn = document.getElementById('theme-light');
    const darkBtn = document.getElementById('theme-dark');
    const autoBtn = document.getElementById('theme-auto');

    const isDark = document.documentElement.classList.contains('dark');

    if (toggleBtn) {
        toggleBtn.checked = isDark;
    }

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
    if (typeof Chart === 'undefined') return;

    // Couleurs par defaut lues par les graphiques au moment de leur creation.
    Chart.defaults.color = isDark ? '#cbd5e1' : '#475569';
    Chart.defaults.borderColor = isDark ? 'rgba(148, 163, 184, 0.15)' : 'rgba(15, 23, 42, 0.06)';

    // Les options d'un graphique Chart.js v4 sont des proxys : les reaffecter
    // (ex. ticks = ticks || {}) provoquait une recursion infinie. On recree le graphique.
    if (typeof statsChart !== 'undefined' && statsChart) {
        renderStats();
    }
}

function isDarkMode() {
    return document.documentElement.classList.contains('dark');
}

// ============ PWA INSTALLATION ============

let deferredPrompt = null;

function initPWAInstall() {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
        || window.navigator.standalone === true;

    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        showInstallBanner();
        updateSettingsInstallSection();
    });

    window.addEventListener('appinstalled', () => {
        deferredPrompt = null;
        hideInstallBanner();
        hideIOSBanner();
        updateSettingsInstallSection();
        showToast('Application installee avec succes!', 'success');
    });

    initInstallBannerButtons();
    initIOSBannerButtons();
    initSettingsInstallButton();

    if (isStandalone) {
        updateSettingsInstallSection();
    } else if (isIOS) {
        if (shouldShowIOSBanner()) {
            showIOSBanner();
        }
        updateSettingsInstallSection();
    }

    updateSettingsInstallSection();
}

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

    if (dismissed) {
        const dismissedDate = new Date(dismissed);
        const daysSinceDismissed = (Date.now() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceDismissed < 7) return false;
    }

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

function updateSettingsInstallSection() {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
        || window.navigator.standalone === true;
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

    const notInstalledSection = document.getElementById('app-not-installed');
    const iosSection = document.getElementById('app-ios-instructions');
    const installedSection = document.getElementById('app-installed');

    if (notInstalledSection) notInstalledSection.classList.add('hidden');
    if (iosSection) iosSection.classList.add('hidden');
    if (installedSection) installedSection.classList.add('hidden');

    if (isStandalone) {
        if (installedSection) installedSection.classList.remove('hidden');
    } else if (isIOS) {
        if (iosSection) iosSection.classList.remove('hidden');
    } else if (deferredPrompt) {
        if (notInstalledSection) notInstalledSection.classList.remove('hidden');
    } else {
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

function isPWAInstalled() {
    return window.matchMedia('(display-mode: standalone)').matches
        || window.navigator.standalone === true;
}

// Fonctions legacy pour compatibilite avec autres modules
function getAllDays() {
    return allPresences;
}

function getAllClients() {
    return allClients;
}

function getAllVacations() {
    return vacations;
}

// ============ GESTION DU MODE HORS LIGNE ============
// Les donnees et la file d'attente sont gerees par OfflineStore (offline-store.js).

let isOnline = navigator.onLine;

function initOfflineMode() {
    window.addEventListener('online', handleOnlineStatus);
    window.addEventListener('offline', handleOfflineStatus);
    window.addEventListener('offline-store-change', updatePendingSyncCount);
    window.addEventListener('offline-store-synced', handleSyncComplete);

    const syncBtn = document.getElementById('btn-force-sync');
    if (syncBtn) {
        syncBtn.addEventListener('click', handleForceSyncClick);
    }

    if (!isOnline) document.body.classList.add('offline');
    updateOfflineBanner();
}

async function handleOnlineStatus() {
    isOnline = true;
    document.body.classList.remove('offline');
    updateOfflineBanner();

    // OfflineStore.read() vide la file avant de relire les donnees du serveur.
    try {
        await loadData();
        await loadVacations();
        showToast('Connexion retablie', 'success');
    } catch (error) {
        console.error('Erreur au retour en ligne:', error);
    }
}

function handleOfflineStatus() {
    isOnline = false;
    document.body.classList.add('offline');
    updateOfflineBanner();
    showToast('Mode hors ligne : vos saisies seront synchronisees au retour du reseau', 'warning');
}

function updateOfflineBanner() {
    const banner = document.getElementById('offline-banner');
    const syncBtn = document.getElementById('btn-force-sync');
    const pending = OfflineStore.pendingCount();

    if (banner) {
        // Bandeau visible hors ligne, ou s'il reste des modifications a envoyer.
        banner.classList.toggle('hidden', isOnline && pending === 0);
    }
    if (syncBtn) {
        syncBtn.classList.toggle('hidden', !isOnline || pending === 0);
    }
    updatePendingSyncCount();
}

function updatePendingSyncCount() {
    const countBadge = document.getElementById('pending-sync-count');
    if (!countBadge) return;

    const count = OfflineStore.pendingCount();
    countBadge.textContent = count;
    countBadge.classList.toggle('hidden', count === 0);

    const banner = document.getElementById('offline-banner');
    if (banner && isOnline) {
        banner.classList.toggle('hidden', count === 0);
    }
}

async function handleForceSyncClick() {
    const syncBtn = document.getElementById('btn-force-sync');
    if (!isOnline) {
        showToast('Vous devez etre connecte pour synchroniser', 'error');
        return;
    }

    if (syncBtn) {
        syncBtn.classList.add('syncing');
        syncBtn.disabled = true;
    }

    try {
        const result = await OfflineStore.flush();
        if (result.pending > 0) {
            showToast(`${result.pending} modification(s) encore en attente`, 'warning');
        } else if (result.sent === 0 && result.dropped === 0) {
            showToast('Aucune modification en attente', 'info');
        }
    } catch (error) {
        console.error('Erreur de synchronisation:', error);
        showToast('Erreur lors de la synchronisation', 'error');
    } finally {
        if (syncBtn) {
            syncBtn.classList.remove('syncing');
            syncBtn.disabled = false;
        }
        updateOfflineBanner();
    }
}

async function handleSyncComplete(event) {
    const { sent, dropped } = event.detail;

    if (dropped > 0) {
        showToast(`${dropped} modification(s) refusee(s) par le serveur`, 'error');
    } else if (sent > 0) {
        showToast(`${sent} modification(s) synchronisee(s)`, 'success');
    }

    updateOfflineBanner();
    await loadData();
    await loadVacations();
}
