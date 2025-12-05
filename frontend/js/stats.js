// ============ STATISTIQUES DASHBOARD ============

let statsChart = null;
let currentStatsPeriod = 'last-3-months';

// Initialisation
function initStats() {
    const periodSelect = document.getElementById('stats-period');
    const exportBtn = document.getElementById('btn-export-stats-csv');

    if (periodSelect) {
        periodSelect.addEventListener('change', () => {
            currentStatsPeriod = periodSelect.value;
            renderStats();
        });
    }

    if (exportBtn) {
        exportBtn.addEventListener('click', exportStatsCSV);
    }
}

// Calculer la plage de dates selon la periode
function getStatsDateRange() {
    const now = new Date();
    let start, end;

    switch (currentStatsPeriod) {
        case 'this-month':
            start = new Date(now.getFullYear(), now.getMonth(), 1);
            end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            break;
        case 'last-3-months':
            start = new Date(now.getFullYear(), now.getMonth() - 2, 1);
            end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            break;
        case 'last-6-months':
            start = new Date(now.getFullYear(), now.getMonth() - 5, 1);
            end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            break;
        case 'this-year':
            start = new Date(now.getFullYear(), 0, 1);
            end = new Date(now.getFullYear(), 11, 31);
            break;
        case 'all':
            start = new Date(2000, 0, 1);
            end = new Date(2100, 11, 31);
            break;
        default:
            start = new Date(now.getFullYear(), now.getMonth() - 2, 1);
            end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    }

    return { start, end };
}

// Filtrer les presences selon la periode
// Utilise billing_month si defini, sinon la date reelle
function getStatsPresences() {
    const { start, end } = getStatsDateRange();
    const startMonth = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}`;
    const endMonth = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}`;

    return allPresences.filter(p => {
        // Si billing_month est defini, utiliser celui-ci pour le filtrage
        if (p.billing_month) {
            return p.billing_month >= startMonth && p.billing_month <= endMonth;
        }
        // Sinon, utiliser la date reelle
        const date = new Date(p.date);
        return date >= start && date <= end;
    });
}

// Calculer les jours (decimal) pour une presence
function getDaysValue(duree) {
    if (duree === 'journee_complete' || duree === '1.0' || duree === 1.0) {
        return 1;
    } else if (duree === 'demi_journee_matin' || duree === 'demi_journee_aprem' || duree === '0.5' || duree === 0.5) {
        return 0.5;
    }
    return 1;
}

// Calculer toutes les statistiques
function calculateStats() {
    const presences = getStatsPresences();
    const { start, end } = getStatsDateRange();

    // Totaux
    let totalDays = 0;
    let halfDaysCount = 0;
    let fullDaysCount = 0;
    const clients = new Set();
    const byClient = {};
    const byMonth = {};

    presences.forEach(p => {
        const days = getDaysValue(p.duree);
        totalDays += days;
        clients.add(p.client);

        // Compteur demi-journees
        if (days === 0.5) {
            halfDaysCount++;
        } else {
            fullDaysCount++;
        }

        // Par client
        if (!byClient[p.client]) {
            byClient[p.client] = 0;
        }
        byClient[p.client] += days;

        // Par mois - utiliser billing_month si defini
        const date = new Date(p.date);
        const originalMonthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const monthKey = p.billing_month || originalMonthKey;

        if (!byMonth[monthKey]) {
            byMonth[monthKey] = {
                total: 0,
                clients: new Set()
            };
        }
        byMonth[monthKey].total += days;
        byMonth[monthKey].clients.add(p.client);
    });

    // Calculer le nombre de mois dans la periode
    const monthsInPeriod = getMonthsInPeriod(start, end);
    const avgPerMonth = monthsInPeriod > 0 ? totalDays / monthsInPeriod : 0;

    // Taux de demi-journees
    const totalEntries = halfDaysCount + fullDaysCount;
    const halfDaysRate = totalEntries > 0 ? (halfDaysCount / totalEntries) * 100 : 0;

    // Moyenne hebdomadaire (approximation: mois = 4.33 semaines)
    const weeksInPeriod = monthsInPeriod * 4.33;
    const avgPerWeek = weeksInPeriod > 0 ? totalDays / weeksInPeriod : 0;

    // Trouver le mois le plus charge
    let busiestMonth = null;
    let busiestMonthDays = 0;
    Object.keys(byMonth).forEach(monthKey => {
        if (byMonth[monthKey].total > busiestMonthDays) {
            busiestMonthDays = byMonth[monthKey].total;
            busiestMonth = monthKey;
        }
    });

    // Trouver le client principal
    let mainClient = null;
    let mainClientDays = 0;
    Object.keys(byClient).forEach(client => {
        if (byClient[client] > mainClientDays) {
            mainClientDays = byClient[client];
            mainClient = client;
        }
    });
    const mainClientPercent = totalDays > 0 ? (mainClientDays / totalDays) * 100 : 0;

    return {
        totalDays,
        clientsCount: clients.size,
        avgPerMonth,
        avgPerWeek,
        halfDaysCount,
        halfDaysRate,
        byClient,
        byMonth,
        busiestMonth,
        busiestMonthDays,
        mainClient,
        mainClientDays,
        mainClientPercent
    };
}

// Calculer le nombre de mois dans une periode
function getMonthsInPeriod(start, end) {
    const startYear = start.getFullYear();
    const startMonth = start.getMonth();
    const endYear = end.getFullYear();
    const endMonth = end.getMonth();

    return (endYear - startYear) * 12 + (endMonth - startMonth) + 1;
}

// Formater le nom du mois
function formatMonthName(monthKey) {
    const [year, month] = monthKey.split('-');
    const monthNames = ['Jan', 'Fev', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aout', 'Sept', 'Oct', 'Nov', 'Dec'];
    return `${monthNames[parseInt(month) - 1]} ${year}`;
}

function formatMonthNameFull(monthKey) {
    const [year, month] = monthKey.split('-');
    const monthNames = ['Janvier', 'Fevrier', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Aout', 'Septembre', 'Octobre', 'Novembre', 'Decembre'];
    return `${monthNames[parseInt(month) - 1]} ${year}`;
}

// Rendu principal des statistiques
function renderStats() {
    const stats = calculateStats();

    // Widgets
    document.getElementById('stat-total-days').textContent = stats.totalDays.toFixed(1);
    document.getElementById('stat-total-clients').textContent = stats.clientsCount;
    document.getElementById('stat-avg-month').textContent = stats.avgPerMonth.toFixed(1) + ' j';
    document.getElementById('stat-half-days').textContent = stats.halfDaysRate.toFixed(0) + '%';

    // Graphique
    renderStatsChart(stats);

    // Repartition clients
    renderClientDistribution(stats);

    // Insights
    renderInsights(stats);

    // Tableau mensuel
    renderMonthlyTable(stats);
}

// Rendu du graphique d'evolution
function renderStatsChart(stats) {
    const ctx = document.getElementById('stats-chart');
    if (!ctx) return;

    // Preparer les donnees
    const { start, end } = getStatsDateRange();
    const labels = [];
    const data = [];

    // Generer tous les mois de la periode
    const current = new Date(start.getFullYear(), start.getMonth(), 1);
    while (current <= end) {
        const monthKey = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`;
        labels.push(formatMonthName(monthKey));
        data.push(stats.byMonth[monthKey] ? stats.byMonth[monthKey].total : 0);
        current.setMonth(current.getMonth() + 1);
    }

    // Detruire l'ancien graphique
    if (statsChart) {
        statsChart.destroy();
    }

    // Creer le nouveau graphique
    statsChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Jours',
                data: data,
                borderColor: '#2563eb',
                backgroundColor: 'rgba(37, 99, 235, 0.1)',
                fill: true,
                tension: 0.3,
                pointRadius: 6,
                pointHoverRadius: 8,
                pointBackgroundColor: '#2563eb',
                pointBorderColor: '#fff',
                pointBorderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return context.parsed.y.toFixed(1) + ' jours';
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 5
                    },
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    }
                },
                x: {
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
}

// Rendu de la repartition par client
function renderClientDistribution(stats) {
    const container = document.getElementById('client-distribution');
    if (!container) return;

    const clients = Object.keys(stats.byClient).sort((a, b) => stats.byClient[b] - stats.byClient[a]);

    if (clients.length === 0) {
        container.innerHTML = '<p class="empty-state">Aucune donnee</p>';
        return;
    }

    const maxDays = Math.max(...Object.values(stats.byClient));

    let html = '';
    clients.forEach(client => {
        const days = stats.byClient[client];
        const percent = stats.totalDays > 0 ? (days / stats.totalDays) * 100 : 0;
        const barWidth = maxDays > 0 ? (days / maxDays) * 100 : 0;
        const color = getClientColor(client);

        html += `
            <div class="client-bar-item">
                <div class="client-bar-header">
                    <span class="client-bar-name">
                        <span class="client-dot" style="background-color: ${color}"></span>
                        ${client}
                    </span>
                    <span class="client-bar-value">${days.toFixed(1)}j (${percent.toFixed(0)}%)</span>
                </div>
                <div class="client-bar-track">
                    <div class="client-bar-fill" style="width: ${barWidth}%; background-color: ${color}"></div>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

// Rendu des insights
function renderInsights(stats) {
    const container = document.getElementById('stats-insights');
    if (!container) return;

    let html = '<div class="insights-grid">';

    // Mois le plus charge
    if (stats.busiestMonth) {
        html += `
            <div class="insight-card">
                <div class="insight-icon">🏆</div>
                <div class="insight-text">
                    <strong>Mois le plus charge</strong>
                    <span>${formatMonthNameFull(stats.busiestMonth)} (${stats.busiestMonthDays.toFixed(1)} jours)</span>
                </div>
            </div>
        `;
    }

    // Client principal
    if (stats.mainClient) {
        html += `
            <div class="insight-card">
                <div class="insight-icon">👤</div>
                <div class="insight-text">
                    <strong>Client principal</strong>
                    <span>${stats.mainClient} (${stats.mainClientPercent.toFixed(0)}% - ${stats.mainClientDays.toFixed(1)}j)</span>
                </div>
            </div>
        `;
    }

    // Moyenne hebdomadaire
    html += `
        <div class="insight-card">
            <div class="insight-icon">📅</div>
            <div class="insight-text">
                <strong>Moyenne hebdomadaire</strong>
                <span>${stats.avgPerWeek.toFixed(1)} jours/semaine</span>
            </div>
        </div>
    `;

    // Taux demi-journees
    html += `
        <div class="insight-card">
            <div class="insight-icon">⏱️</div>
            <div class="insight-text">
                <strong>Demi-journees</strong>
                <span>${stats.halfDaysCount} demi-journees (${stats.halfDaysRate.toFixed(0)}%)</span>
            </div>
        </div>
    `;

    html += '</div>';
    container.innerHTML = html;
}

// Rendu du tableau mensuel
function renderMonthlyTable(stats) {
    const tbody = document.getElementById('monthly-stats-body');
    if (!tbody) return;

    const monthKeys = Object.keys(stats.byMonth).sort().reverse();

    if (monthKeys.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" class="empty-state">Aucune donnee</td></tr>';
        return;
    }

    let html = '';
    monthKeys.forEach(monthKey => {
        const monthData = stats.byMonth[monthKey];
        html += `
            <tr>
                <td>${formatMonthNameFull(monthKey)}</td>
                <td><strong>${monthData.total.toFixed(1)}j</strong></td>
                <td>${monthData.clients.size} client${monthData.clients.size > 1 ? 's' : ''}</td>
            </tr>
        `;
    });

    tbody.innerHTML = html;
}

// Export CSV des statistiques
function exportStatsCSV() {
    const stats = calculateStats();
    const monthKeys = Object.keys(stats.byMonth).sort();

    let csv = 'Mois,Jours,Clients\n';

    monthKeys.forEach(monthKey => {
        const monthData = stats.byMonth[monthKey];
        csv += `"${formatMonthNameFull(monthKey)}",${monthData.total.toFixed(1)},${monthData.clients.size}\n`;
    });

    // Ajouter un total
    csv += `\nTOTAL,${stats.totalDays.toFixed(1)},${stats.clientsCount}\n`;
    csv += `Moyenne/mois,${stats.avgPerMonth.toFixed(1)},-\n`;

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `statistiques_presence_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    showToast('CSV telecharge', 'success');
}

// Initialiser au chargement
document.addEventListener('DOMContentLoaded', initStats);
