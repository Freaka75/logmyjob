// ============ EXPORT & PARTAGE ============

let currentExportPeriod = 'this-month';
let exportDateStart = '';
let exportDateEnd = '';
let showDetailedExport = true; // Détails affichés par défaut

// Initialisation de la page export
function initExport() {
    initExportPeriodSelect();
    initExportActions();
    initEmailPreviewToggle();
    updateExportPeriod();
}

// Initialiser le sélecteur de période (dropdown)
function initExportPeriodSelect() {
    const periodSelect = document.getElementById('export-period');
    const customPeriodDiv = document.getElementById('custom-period-export');
    const applyCustomBtn = document.getElementById('btn-apply-custom-export');
    const detailedCheckbox = document.getElementById('show-detailed-view');

    if (periodSelect) {
        periodSelect.addEventListener('change', () => {
            currentExportPeriod = periodSelect.value;

            if (currentExportPeriod === 'custom') {
                customPeriodDiv.style.display = 'block';
            } else {
                customPeriodDiv.style.display = 'none';
                updateExportPeriod();
            }
        });
    }

    if (applyCustomBtn) {
        applyCustomBtn.addEventListener('click', () => {
            exportDateStart = document.getElementById('export-date-start').value;
            exportDateEnd = document.getElementById('export-date-end').value;
            if (exportDateStart && exportDateEnd) {
                updateExportPeriod();
            }
        });
    }

    if (detailedCheckbox) {
        detailedCheckbox.addEventListener('change', () => {
            showDetailedExport = detailedCheckbox.checked;
            renderExportPreview();
        });
    }
}

// Initialiser les actions de partage
function initExportActions() {
    document.getElementById('btn-copy-recap').addEventListener('click', copyRecapToClipboard);
    document.getElementById('btn-email-recap').addEventListener('click', sendRecapByEmail);
    document.getElementById('btn-share-whatsapp').addEventListener('click', shareWhatsApp);
    document.getElementById('btn-download-csv').addEventListener('click', downloadCSV);
}

// Toggle apercu email
function initEmailPreviewToggle() {
    const toggle = document.getElementById('email-preview-toggle');
    const content = document.getElementById('email-preview-content');
    const icon = toggle.querySelector('.collapse-icon');

    toggle.addEventListener('click', () => {
        const isVisible = content.style.display !== 'none';
        content.style.display = isVisible ? 'none' : 'block';
        icon.textContent = isVisible ? '▶' : '▼';
        if (!isVisible) {
            renderEmailPreview();
        }
    });
}

// Calculer les dates de la période
function getExportDateRange() {
    const now = new Date();
    let start, end;

    switch (currentExportPeriod) {
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
        case 'all':
            start = new Date(2000, 0, 1);
            end = new Date(2100, 11, 31);
            break;
        case 'custom':
            start = exportDateStart ? new Date(exportDateStart) : new Date(now.getFullYear(), now.getMonth(), 1);
            end = exportDateEnd ? new Date(exportDateEnd) : new Date(now.getFullYear(), now.getMonth() + 1, 0);
            break;
        default:
            start = new Date(now.getFullYear(), now.getMonth(), 1);
            end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    }

    return { start, end };
}

// Mettre à jour la période et le rendu
function updateExportPeriod() {
    const { start, end } = getExportDateRange();

    // Afficher le label de la période
    const label = document.getElementById('export-period-label');
    const monthNames = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
                        'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

    switch (currentExportPeriod) {
        case 'this-month':
            label.textContent = `${monthNames[start.getMonth()]} ${start.getFullYear()}`;
            break;
        case 'last-month':
            label.textContent = `${monthNames[start.getMonth()]} ${start.getFullYear()}`;
            break;
        case 'last-3-months':
            label.textContent = `${monthNames[start.getMonth()]} - ${monthNames[end.getMonth()]} ${end.getFullYear()}`;
            break;
        case 'this-year':
            label.textContent = `Année ${start.getFullYear()}`;
            break;
        case 'all':
            label.textContent = `Toutes les présences`;
            break;
        case 'custom':
            label.textContent = `Du ${formatDateFR(start)} au ${formatDateFR(end)}`;
            break;
        default:
            label.textContent = `${monthNames[start.getMonth()]} ${start.getFullYear()}`;
    }

    renderExportPreview();
}

// Formater une date en français
function formatDateFR(date) {
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// Obtenir les présences filtrées pour l'export
// Utilise billing_month si défini, sinon la date réelle
function getExportPresences() {
    const { start, end } = getExportDateRange();
    const startMonth = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}`;
    const endMonth = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}`;

    return allPresences.filter(p => {
        // Si billing_month est défini, utiliser celui-ci pour le filtrage
        if (p.billing_month) {
            return p.billing_month >= startMonth && p.billing_month <= endMonth;
        }
        // Sinon, utiliser la date réelle
        const date = new Date(p.date);
        return date >= start && date <= end;
    });
}

// Générer le récapitulatif par client
function generateClientSummary() {
    const presences = getExportPresences();
    const summary = {};
    const monthNames = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
                        'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

    presences.forEach(p => {
        if (!summary[p.client]) {
            summary[p.client] = {
                total: 0,
                fullDays: [],
                halfDaysMorning: [],
                halfDaysAfternoon: [],
                byMonth: {}, // Détail par mois
                deferredDays: [] // Jours différés
            };
        }

        const date = new Date(p.date);
        const day = date.getDate();
        const originalMonthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

        // Utiliser billing_month si défini, sinon le mois réel
        const monthKey = p.billing_month || originalMonthKey;
        const [year, month] = monthKey.split('-');
        const monthLabel = `${monthNames[parseInt(month) - 1]} ${year}`;
        const dateStr = formatDateShort(p.date);

        // Marquer si c'est un jour différé (date originale différente du mois de facturation)
        const isDeferred = p.billing_month && p.billing_month !== originalMonthKey;

        // Initialiser le mois si nécessaire
        if (!summary[p.client].byMonth[monthKey]) {
            summary[p.client].byMonth[monthKey] = {
                label: monthLabel,
                total: 0,
                fullDays: [],
                halfDaysMorning: [],
                halfDaysAfternoon: [],
                deferredDays: [] // Jours différés pour ce mois
            };
        }

        // Pour les jours différés, ajouter l'info du mois d'origine
        const dayDisplay = isDeferred ? `${day}*` : day;
        const dayInfo = isDeferred ? { day, originalMonth: monthNames[date.getMonth()] } : null;

        if (p.duree === 'journee_complete' || p.duree === '1.0') {
            summary[p.client].total += 1;
            summary[p.client].fullDays.push(day);
            summary[p.client].byMonth[monthKey].total += 1;
            summary[p.client].byMonth[monthKey].fullDays.push(dayDisplay);
            if (isDeferred) {
                summary[p.client].byMonth[monthKey].deferredDays.push(dayInfo);
            }
        } else if (p.duree === 'demi_journee_matin') {
            summary[p.client].total += 0.5;
            summary[p.client].halfDaysMorning.push(dateStr);
            summary[p.client].byMonth[monthKey].total += 0.5;
            summary[p.client].byMonth[monthKey].halfDaysMorning.push(dayDisplay);
            if (isDeferred) {
                summary[p.client].byMonth[monthKey].deferredDays.push(dayInfo);
            }
        } else if (p.duree === 'demi_journee_aprem') {
            summary[p.client].total += 0.5;
            summary[p.client].halfDaysAfternoon.push(dateStr);
            summary[p.client].byMonth[monthKey].total += 0.5;
            summary[p.client].byMonth[monthKey].halfDaysAfternoon.push(dayDisplay);
            if (isDeferred) {
                summary[p.client].byMonth[monthKey].deferredDays.push(dayInfo);
            }
        }
    });

    return summary;
}

// Formater la date courte (ex: "22 nov")
function formatDateShort(dateStr) {
    const date = new Date(dateStr);
    const day = date.getDate();
    const monthShort = ['jan', 'fév', 'mar', 'avr', 'mai', 'juin',
                        'juil', 'août', 'sept', 'oct', 'nov', 'déc'][date.getMonth()];
    return `${day} ${monthShort}`;
}

// Rendre l'aperçu de l'export
function renderExportPreview() {
    const preview = document.getElementById('export-preview');
    const totalDiv = document.getElementById('export-total');
    const summary = generateClientSummary();
    const clients = Object.keys(summary).sort();

    if (clients.length === 0) {
        preview.innerHTML = '<p class="empty-state">Aucune presence pour cette periode</p>';
        totalDiv.innerHTML = '';
        return;
    }

    let html = '<table class="export-table"><thead><tr>';
    html += '<th>Client</th><th>Total</th><th>Dates travaillees</th>';
    html += '</tr></thead><tbody>';

    let grandTotal = 0;
    let hasDeferred = false;

    clients.forEach(client => {
        const data = summary[client];
        const color = getClientColor(client);
        grandTotal += data.total;

        // Grouper par mois pour afficher les dates
        const monthKeys = Object.keys(data.byMonth).sort();
        let datesHtml = '';

        monthKeys.forEach((monthKey, idx) => {
            const monthData = data.byMonth[monthKey];
            const monthName = monthData.label.split(' ')[0]; // Juste le nom du mois

            // Collecter tous les jours du mois
            let daysInfo = [];

            if (monthData.fullDays.length > 0) {
                const days = [...monthData.fullDays].sort((a, b) => {
                    const numA = typeof a === 'string' ? parseInt(a) : a;
                    const numB = typeof b === 'string' ? parseInt(b) : b;
                    return numA - numB;
                });
                daysInfo.push(days.join(', '));
            }
            if (monthData.halfDaysMorning.length > 0) {
                const days = [...monthData.halfDaysMorning].sort((a, b) => {
                    const numA = typeof a === 'string' ? parseInt(a) : a;
                    const numB = typeof b === 'string' ? parseInt(b) : b;
                    return numA - numB;
                });
                daysInfo.push(days.map(d => d + ' (AM)').join(', '));
            }
            if (monthData.halfDaysAfternoon.length > 0) {
                const days = [...monthData.halfDaysAfternoon].sort((a, b) => {
                    const numA = typeof a === 'string' ? parseInt(a) : a;
                    const numB = typeof b === 'string' ? parseInt(b) : b;
                    return numA - numB;
                });
                daysInfo.push(days.map(d => d + ' (PM)').join(', '));
            }

            // Verifier s'il y a des jours differes
            if (monthData.deferredDays && monthData.deferredDays.length > 0) {
                hasDeferred = true;
            }

            if (daysInfo.length > 0) {
                if (idx > 0) datesHtml += '<br>';
                datesHtml += `<strong>${monthName}:</strong> ${daysInfo.join(', ')}`;
            }
        });

        html += `<tr>`;
        html += `<td><span class="client-color-dot" style="background-color: ${color}"></span> ${client}</td>`;
        html += `<td class="days-cell">${data.total}j</td>`;
        html += `<td class="dates-cell">${datesHtml}</td>`;
        html += `</tr>`;
    });

    html += '</tbody></table>';

    // Ajouter la legende si des jours sont differes
    if (hasDeferred) {
        html += '<p class="deferred-legend">* Jour reporte du mois precedent</p>';
    }

    preview.innerHTML = html;

    totalDiv.innerHTML = `<strong>TOTAL : ${grandTotal} jour${grandTotal > 1 ? 's' : ''}</strong>`;
}

// Générer le texte du récap pour copie/partage
function generateRecapText() {
    const { start, end } = getExportDateRange();
    const monthNames = ['Janvier', 'Fevrier', 'Mars', 'Avril', 'Mai', 'Juin',
                        'Juillet', 'Aout', 'Septembre', 'Octobre', 'Novembre', 'Decembre'];

    // Determiner le label de periode
    let periodLabel;
    if (currentExportPeriod === 'this-month' || currentExportPeriod === 'last-month') {
        periodLabel = `${monthNames[start.getMonth()]} ${start.getFullYear()}`;
    } else if (currentExportPeriod === 'all') {
        periodLabel = 'TOUTES LES PRESENCES';
    } else {
        periodLabel = `${monthNames[start.getMonth()]} - ${monthNames[end.getMonth()]} ${end.getFullYear()}`;
    }

    const summary = generateClientSummary();
    const clients = Object.keys(summary).sort();

    let text = `RECAP PRESENCE CLIENT - ${periodLabel.toUpperCase()}\n`;
    text += `${'='.repeat(40)}\n\n`;

    let grandTotal = 0;

    clients.forEach(client => {
        const data = summary[client];
        grandTotal += data.total;

        text += `${client.toUpperCase()} : ${data.total} jour${data.total > 1 ? 's' : ''}\n`;

        // Detail par mois
        const monthKeys = Object.keys(data.byMonth).sort();
        monthKeys.forEach(monthKey => {
            const monthData = data.byMonth[monthKey];
            text += `\n  ${monthData.label} - ${monthData.total} jour${monthData.total > 1 ? 's' : ''}\n`;

            if (monthData.fullDays.length > 0) {
                text += `    Journees completes : ${monthData.fullDays.sort((a,b) => a-b).join(', ')}\n`;
            }
            if (monthData.halfDaysMorning.length > 0) {
                text += `    Demi-journees (matin) : ${monthData.halfDaysMorning.sort((a,b) => a-b).join(', ')}\n`;
            }
            if (monthData.halfDaysAfternoon.length > 0) {
                text += `    Demi-journees (apres-midi) : ${monthData.halfDaysAfternoon.sort((a,b) => a-b).join(', ')}\n`;
            }
        });
        text += '\n';
    });

    text += `${'='.repeat(40)}\n`;
    text += `TOTAL : ${grandTotal} jour${grandTotal > 1 ? 's' : ''}\n`;

    return text;
}

// Générer le contenu de l'email
function generateEmailContent() {
    const { start, end } = getExportDateRange();
    const monthNames = ['Janvier', 'Fevrier', 'Mars', 'Avril', 'Mai', 'Juin',
                        'Juillet', 'Aout', 'Septembre', 'Octobre', 'Novembre', 'Decembre'];

    // Determiner le label de periode
    let periodLabel;
    if (currentExportPeriod === 'this-month' || currentExportPeriod === 'last-month') {
        periodLabel = `${monthNames[start.getMonth()]} ${start.getFullYear()}`;
    } else if (currentExportPeriod === 'all') {
        periodLabel = 'toutes les presences';
    } else {
        periodLabel = `${monthNames[start.getMonth()]} - ${monthNames[end.getMonth()]} ${end.getFullYear()}`;
    }

    const summary = generateClientSummary();
    const clients = Object.keys(summary).sort();

    const assistantName = assistantSettings.name || '';
    const customMessage = assistantSettings.message || '';

    let body = '';

    if (assistantName) {
        body += `Bonjour ${assistantName},\n\n`;
    } else {
        body += `Bonjour,\n\n`;
    }

    if (customMessage) {
        body += `${customMessage}\n\n`;
    }

    body += `Voici le recapitulatif de mes presences client pour ${periodLabel} :\n\n`;

    let grandTotal = 0;

    clients.forEach(client => {
        const data = summary[client];
        grandTotal += data.total;

        body += `${client.toUpperCase()} : ${data.total} jour${data.total > 1 ? 's' : ''}\n`;

        // Detail par mois
        const monthKeys = Object.keys(data.byMonth).sort();
        monthKeys.forEach(monthKey => {
            const monthData = data.byMonth[monthKey];
            body += `\n  ${monthData.label} - ${monthData.total} jour${monthData.total > 1 ? 's' : ''}\n`;

            if (monthData.fullDays.length > 0) {
                body += `  - Journees completes : ${monthData.fullDays.sort((a,b) => a-b).join(', ')}\n`;
            }
            if (monthData.halfDaysMorning.length > 0) {
                body += `  - Demi-journees (matin) : ${monthData.halfDaysMorning.sort((a,b) => a-b).join(', ')}\n`;
            }
            if (monthData.halfDaysAfternoon.length > 0) {
                body += `  - Demi-journees (apres-midi) : ${monthData.halfDaysAfternoon.sort((a,b) => a-b).join(', ')}\n`;
            }
        });
        body += '\n';
    });

    body += `TOTAL : ${grandTotal} jour${grandTotal > 1 ? 's' : ''}\n\n`;
    body += `Merci de proceder a la saisie dans Abby.\n\n`;
    body += `Cordialement`;

    return {
        subject: `Recap presence client - ${periodLabel}`,
        body: body
    };
}

// Rendre l'aperçu email
function renderEmailPreview() {
    const preview = document.getElementById('email-preview');
    const email = generateEmailContent();

    preview.innerHTML = `
        <div class="email-subject"><strong>Objet :</strong> ${email.subject}</div>
        <div class="email-body"><pre>${email.body}</pre></div>
    `;
}

// Copier le récap dans le presse-papier
async function copyRecapToClipboard() {
    const text = generateRecapText();
    const status = document.getElementById('share-status');

    try {
        await navigator.clipboard.writeText(text);
        status.innerHTML = '<span class="status-success">✓ Copié dans le presse-papier !</span>';
        setTimeout(() => { status.innerHTML = ''; }, 3000);
    } catch (error) {
        // Fallback pour les navigateurs qui ne supportent pas clipboard API
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);

        status.innerHTML = '<span class="status-success">✓ Copié !</span>';
        setTimeout(() => { status.innerHTML = ''; }, 3000);
    }
}

// Envoyer par email
function sendRecapByEmail() {
    const email = generateEmailContent();
    const to = assistantSettings.email || '';

    const mailtoLink = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(email.subject)}&body=${encodeURIComponent(email.body)}`;

    window.location.href = mailtoLink;

    const status = document.getElementById('share-status');
    status.innerHTML = '<span class="status-info">📧 Ouverture du client email...</span>';
    setTimeout(() => { status.innerHTML = ''; }, 3000);
}

// Partage WhatsApp direct (fonctionne sans HTTPS)
function shareWhatsApp() {
    const email = generateEmailContent();
    const status = document.getElementById('share-status');

    // Construire le lien WhatsApp direct
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(email.body)}`;

    // Ouvrir WhatsApp
    window.open(whatsappUrl, '_blank');

    status.innerHTML = '<span class="status-success">Ouverture WhatsApp...</span>';
    setTimeout(() => { status.innerHTML = ''; }, 3000);
}

// Télécharger CSV
function downloadCSV() {
    const { start } = getExportDateRange();
    const summary = generateClientSummary();
    const clients = Object.keys(summary).sort();
    const monthNames = ['jan', 'fev', 'mar', 'avr', 'mai', 'juin',
                        'juil', 'aout', 'sept', 'oct', 'nov', 'dec'];

    let csv = 'Client,Nombre de jours,Journees completes,Demi-journees matin,Demi-journees apres-midi\n';

    clients.forEach(client => {
        const data = summary[client];
        csv += `"${client}",${data.total},"${data.fullDays.join(', ')}","${data.halfDaysMorning.join(', ')}","${data.halfDaysAfternoon.join(', ')}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `presence_client_${monthNames[start.getMonth()]}${start.getFullYear()}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    const status = document.getElementById('share-status');
    status.innerHTML = '<span class="status-success">✓ CSV téléchargé !</span>';
    setTimeout(() => { status.innerHTML = ''; }, 3000);
}
