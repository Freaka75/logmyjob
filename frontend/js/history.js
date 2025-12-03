// ============ HISTORIQUE AMÉLIORÉ ============

// Initialisation de l'historique
function initHistoryPage() {
    populateClientFilter();
    initHistoryFilters();
    initHistoryViews();
    initHistoryActions();
}

// Remplir le filtre client
function populateClientFilter() {
    const clientFilter = document.getElementById('filter-client');
    if (!clientFilter) return;

    // Garder la valeur actuelle
    const currentValue = clientFilter.value;

    // Vider et recréer les options
    clientFilter.innerHTML = '<option value="">Tous les clients</option>';

    // Ajouter chaque client
    if (typeof allClients !== 'undefined' && allClients.length > 0) {
        allClients.forEach(client => {
            const option = document.createElement('option');
            option.value = client;
            option.textContent = client;
            clientFilter.appendChild(option);
        });
    }

    // Restaurer la valeur si elle existe toujours
    if (currentValue) {
        clientFilter.value = currentValue;
    }
}

// Filtres avancés
function initHistoryFilters() {
    const periodFilter = document.getElementById('filter-period');
    const clientFilter = document.getElementById('filter-client');
    const searchInput = document.getElementById('search-input');
    const customPeriod = document.getElementById('custom-period');
    const applyCustomBtn = document.getElementById('apply-custom-period');

    // Filtre période
    periodFilter.addEventListener('change', () => {
        currentPeriodFilter = periodFilter.value;
        if (currentPeriodFilter === 'custom') {
            customPeriod.style.display = 'flex';
        } else {
            customPeriod.style.display = 'none';
            renderHistoryView();
        }
    });

    // Filtre client
    clientFilter.addEventListener('change', () => {
        currentFilter.client = clientFilter.value;
        renderHistoryView();
    });

    // Recherche
    let searchTimeout;
    searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            currentSearchTerm = e.target.value.toLowerCase();
            renderHistoryView();
        }, 300);
    });

    // Période personnalisée
    applyCustomBtn.addEventListener('click', () => {
        customPeriodStart = document.getElementById('custom-start').value;
        customPeriodEnd = document.getElementById('custom-end').value;
        if (customPeriodStart && customPeriodEnd) {
            renderHistoryView();
        }
    });
}

// Vues alternatives
function initHistoryViews() {
    const viewToggles = document.querySelectorAll('.view-toggle');

    viewToggles.forEach(toggle => {
        toggle.addEventListener('click', () => {
            const view = toggle.dataset.view;

            // Mettre à jour l'état actif
            viewToggles.forEach(t => t.classList.remove('active'));
            toggle.classList.add('active');

            // Changer de vue
            document.querySelectorAll('.history-view').forEach(v => {
                v.style.display = 'none';
                v.classList.remove('active');
            });

            currentHistoryView = view;
            const viewElement = document.getElementById(`view-${view}`);
            viewElement.style.display = 'block';
            viewElement.classList.add('active');

            renderHistoryView();
        });
    });
}

// Actions rapides
function initHistoryActions() {
    const btnSelectAll = document.getElementById('btn-select-all');
    const btnExportSelection = document.getElementById('btn-export-selection');
    const btnDeleteSelection = document.getElementById('btn-delete-selection');

    btnSelectAll.addEventListener('click', toggleSelectAll);
    btnExportSelection.addEventListener('click', exportSelectedToCSV);
    btnDeleteSelection.addEventListener('click', deleteSelected);
}

// Filtrer les présences
function getFilteredPresences() {
    let filtered = [...allPresences];

    // Filtre période
    const dateRange = getPeriodDateRange();
    if (dateRange) {
        filtered = filtered.filter(p => {
            const date = new Date(p.date);
            return date >= dateRange.start && date <= dateRange.end;
        });
    }

    // Filtre client
    if (currentFilter.client) {
        filtered = filtered.filter(p => p.client === currentFilter.client);
    }

    // Recherche
    if (currentSearchTerm) {
        filtered = filtered.filter(p =>
            p.client.toLowerCase().includes(currentSearchTerm) ||
            (p.notes && p.notes.toLowerCase().includes(currentSearchTerm))
        );
    }

    return filtered;
}

// Obtenir la plage de dates selon le filtre de période
function getPeriodDateRange() {
    const now = new Date();
    let start, end;

    switch (currentPeriodFilter) {
        case 'this-month':
            start = new Date(now.getFullYear(), now.getMonth(), 1);
            end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            break;

        case 'last-month':
            start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            end = new Date(now.getFullYear(), now.getMonth(), 0);
            break;

        case 'last-3-months':
            start = new Date(now.getFullYear(), now.getMonth() - 2, 1);
            end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            break;

        case 'this-year':
            start = new Date(now.getFullYear(), 0, 1);
            end = new Date(now.getFullYear(), 11, 31);
            break;

        case 'custom':
            if (customPeriodStart && customPeriodEnd) {
                start = new Date(customPeriodStart);
                end = new Date(customPeriodEnd);
            } else {
                return null;
            }
            break;

        case 'all':
        default:
            return null;
    }

    return { start, end };
}

// Rendu de la vue actuelle
function renderHistoryView() {
    const filtered = getFilteredPresences();

    // Mettre à jour les statistiques
    updateHistoryStats(filtered);

    // Rendu selon la vue active
    switch (currentHistoryView) {
        case 'grouped':
            renderGroupedView(filtered);
            break;
        case 'compact':
            renderCompactView(filtered);
            break;
        case 'timeline':
            renderTimelineView(filtered);
            break;
    }
}

// Mettre à jour les statistiques
function updateHistoryStats(filtered) {
    const totalDays = calculateTotalDays(filtered);
    const countText = document.getElementById('history-count-text');

    let text = `${totalDays.toFixed(1)} jours trouvés`;

    if (currentFilter.client) {
        text += ` pour ${currentFilter.client}`;
    }

    if (currentPeriodFilter !== 'all') {
        const periodLabels = {
            'this-month': 'ce mois',
            'last-month': 'le mois dernier',
            'last-3-months': 'les 3 derniers mois',
            'this-year': 'cette année',
            'custom': 'la période sélectionnée'
        };
        text += ` sur ${periodLabels[currentPeriodFilter]}`;
    }

    text += ` (${filtered.length} entrées)`;
    countText.textContent = text;
}

// Vue groupée par mois
function renderGroupedView(presences) {
    const container = document.getElementById('view-grouped');
    container.innerHTML = '';

    if (presences.length === 0) {
        container.innerHTML = '<p class="empty-state">Aucune présence trouvée</p>';
        return;
    }

    // Grouper par mois
    const byMonth = {};
    presences.forEach(p => {
        const monthKey = p.date.substring(0, 7);
        if (!byMonth[monthKey]) {
            byMonth[monthKey] = [];
        }
        byMonth[monthKey].push(p);
    });

    // Trier par mois décroissant
    const sortedMonths = Object.keys(byMonth).sort().reverse();

    sortedMonths.forEach(monthKey => {
        const monthPresences = byMonth[monthKey];
        const monthTotal = calculateTotalDays(monthPresences);

        const monthGroup = document.createElement('div');
        monthGroup.className = 'month-group';

        const monthHeader = document.createElement('div');
        monthHeader.className = 'month-header';
        monthHeader.innerHTML = `
            <span class="month-label">📅 ${formatMonth(monthKey).toUpperCase()} (${monthTotal.toFixed(1)} jours)</span>
            <span class="month-toggle">▼</span>
        `;

        const monthContent = document.createElement('div');
        monthContent.className = 'month-content';

        // Trier par date décroissante
        const sortedPresences = monthPresences.sort((a, b) => b.date.localeCompare(a.date));

        sortedPresences.forEach(presence => {
            const item = createPresenceItem(presence);
            monthContent.appendChild(item);
        });

        // Toggle collapse/expand
        monthHeader.addEventListener('click', () => {
            const isExpanded = monthContent.style.display !== 'none';
            monthContent.style.display = isExpanded ? 'none' : 'block';
            monthHeader.querySelector('.month-toggle').textContent = isExpanded ? '▶' : '▼';
        });

        monthGroup.appendChild(monthHeader);
        monthGroup.appendChild(monthContent);
        container.appendChild(monthGroup);
    });
}

// Créer un item de présence
function createPresenceItem(presence) {
    const item = document.createElement('div');
    item.className = 'presence-item';
    item.dataset.id = presence.id;

    const durationIcon = getDurationIcon(presence.duree);
    const clientColor = getClientColor(presence.client);
    const formattedDate = new Date(presence.date + 'T00:00:00').toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit'
    });

    item.innerHTML = `
        <div class="presence-checkbox">
            <input type="checkbox" data-id="${presence.id}" class="presence-select">
        </div>
        <div class="presence-date">${formattedDate}</div>
        <div class="presence-client">
            <span class="client-color-dot" style="background-color: ${clientColor}"></span>
            ${presence.client}
        </div>
        <div class="presence-duration">
            <span class="duration-icon">${durationIcon}</span>
            <span class="duration-text">${formatDurationShort(presence.duree)}</span>
        </div>
        <div class="presence-notes">${presence.notes || '-'}</div>
        <div class="presence-actions">
            <button class="btn-icon" onclick="duplicatePresence('${presence.id}')" title="Dupliquer">📋</button>
            <button class="btn-icon" onclick="editPresence('${presence.id}')" title="Éditer">✏️</button>
            <button class="btn-icon" onclick="deletePresence('${presence.id}')" title="Supprimer">🗑️</button>
        </div>
    `;

    // Gérer la sélection
    const checkbox = item.querySelector('.presence-select');
    checkbox.addEventListener('change', () => {
        if (checkbox.checked) {
            selectedPresences.add(presence.id);
        } else {
            selectedPresences.delete(presence.id);
        }
        updateBulkActions();
    });

    return item;
}

// Vue compacte (tableau)
function renderCompactView(presences) {
    const container = document.getElementById('view-compact');
    container.innerHTML = '';

    if (presences.length === 0) {
        container.innerHTML = '<p class="empty-state">Aucune présence trouvée</p>';
        return;
    }

    const table = document.createElement('table');
    table.className = 'compact-table';
    table.innerHTML = `
        <thead>
            <tr>
                <th><input type="checkbox" id="select-all-compact"></th>
                <th>Date</th>
                <th>Client</th>
                <th>Durée</th>
                <th>Notes</th>
                <th>Actions</th>
            </tr>
        </thead>
        <tbody id="compact-tbody"></tbody>
    `;

    const tbody = table.querySelector('#compact-tbody');
    presences.sort((a, b) => b.date.localeCompare(a.date)).forEach(presence => {
        const clientColor = getClientColor(presence.client);
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><input type="checkbox" data-id="${presence.id}" class="presence-select"></td>
            <td>${formatDate(presence.date)}</td>
            <td><span class="client-color-dot" style="background-color: ${clientColor}"></span> ${presence.client}</td>
            <td>${getDurationIcon(presence.duree)} ${formatDurationShort(presence.duree)}</td>
            <td class="notes-cell">${presence.notes || '-'}</td>
            <td class="actions-cell">
                <button class="btn-icon btn-small" onclick="duplicatePresence('${presence.id}')">📋</button>
                <button class="btn-icon btn-small" onclick="editPresence('${presence.id}')">✏️</button>
                <button class="btn-icon btn-small" onclick="deletePresence('${presence.id}')">🗑️</button>
            </td>
        `;
        tbody.appendChild(row);
    });

    container.appendChild(table);
}

// Vue timeline
function renderTimelineView(presences) {
    const container = document.getElementById('view-timeline');
    container.innerHTML = '';

    if (presences.length === 0) {
        container.innerHTML = '<p class="empty-state">Aucune présence trouvée</p>';
        return;
    }

    const timeline = document.createElement('div');
    timeline.className = 'timeline';

    presences.sort((a, b) => b.date.localeCompare(a.date)).forEach(presence => {
        const clientColor = getClientColor(presence.client);
        const item = document.createElement('div');
        item.className = 'timeline-item';
        item.innerHTML = `
            <div class="timeline-date">${formatDate(presence.date)}</div>
            <div class="timeline-dot" style="background-color: ${clientColor}; box-shadow: 0 0 0 2px ${clientColor}"></div>
            <div class="timeline-content">
                <div class="timeline-client" style="color: ${clientColor}">${presence.client}</div>
                <div class="timeline-duration">${getDurationIcon(presence.duree)} ${formatDurationShort(presence.duree)}</div>
                ${presence.notes ? `<div class="timeline-notes">${presence.notes}</div>` : ''}
                <div class="timeline-actions">
                    <button class="btn-icon btn-small" onclick="duplicatePresence('${presence.id}')">📋</button>
                    <button class="btn-icon btn-small" onclick="editPresence('${presence.id}')">✏️</button>
                    <button class="btn-icon btn-small" onclick="deletePresence('${presence.id}')">🗑️</button>
                </div>
            </div>
        `;
        timeline.appendChild(item);
    });

    container.appendChild(timeline);
}

// Actions en masse
function toggleSelectAll() {
    const checkboxes = document.querySelectorAll('.presence-select');
    const allSelected = selectedPresences.size === checkboxes.length;

    checkboxes.forEach(cb => {
        cb.checked = !allSelected;
        const id = parseInt(cb.dataset.id);
        if (!allSelected) {
            selectedPresences.add(id);
        } else {
            selectedPresences.delete(id);
        }
    });

    updateBulkActions();
}

function updateBulkActions() {
    const bulkActions = document.querySelector('.bulk-actions');
    if (selectedPresences.size > 0) {
        bulkActions.style.display = 'flex';
    } else {
        bulkActions.style.display = 'none';
    }
}

async function deleteSelected() {
    if (selectedPresences.size === 0) return;

    if (!confirm(`Supprimer ${selectedPresences.size} entrées ?`)) return;

    const promises = Array.from(selectedPresences).map(id => deletePresence(id));
    await Promise.all(promises);

    selectedPresences.clear();
    updateBulkActions();
}

function exportSelectedToCSV() {
    if (selectedPresences.size === 0) {
        showToast('Aucune sélection', 'error');
        return;
    }

    const selected = allPresences.filter(p => selectedPresences.has(p.id));

    let csv = 'Date,Client,Durée,Notes\n';
    selected.forEach(p => {
        csv += `${p.date},${p.client},${formatDurationShort(p.duree)},"${(p.notes || '').replace(/"/g, '""')}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `selection_${getTodayDate()}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    showToast('Export CSV réussi', 'success');
}

// Dupliquer une présence
function duplicatePresence(id) {
    const presence = allPresences.find(p => p.id === id);
    if (!presence) return;

    navigateTo('home');
    setTimeout(() => {
        document.getElementById('date').value = getTodayDate();
        document.getElementById('client-select').value = '';
        document.getElementById('client-input').value = presence.client;
        document.querySelector(`input[name="duree"][value="${presence.duree}"]`).checked = true;
        document.getElementById('notes').value = presence.notes || '';
        document.getElementById('form-container').style.display = 'block';
        document.getElementById('form-container').scrollIntoView({ behavior: 'smooth' });
    }, 100);
}

// Utilitaires
function getDurationIcon(duree) {
    if (duree === 'journee_complete' || duree === '1.0') return '🌞';
    if (duree === 'demi_journee_matin') return '🌅';
    if (duree === 'demi_journee_aprem') return '🌆';
    return '🌞';
}

function formatDurationShort(duree) {
    if (duree === 'journee_complete' || duree === '1.0') return '1j';
    if (duree === 'demi_journee_matin') return '0.5j';
    if (duree === 'demi_journee_aprem') return '0.5j';
    return duree;
}
