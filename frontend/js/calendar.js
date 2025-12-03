// État du calendrier
let currentCalendarDate = new Date();

// Initialisation du calendrier
function initCalendar() {
    const prevBtn = document.getElementById('prev-month');
    const nextBtn = document.getElementById('next-month');

    // Enlever les anciens event listeners si ils existent
    const newPrevBtn = prevBtn.cloneNode(true);
    const newNextBtn = nextBtn.cloneNode(true);
    prevBtn.replaceWith(newPrevBtn);
    nextBtn.replaceWith(newNextBtn);

    newPrevBtn.addEventListener('click', () => {
        currentCalendarDate.setMonth(currentCalendarDate.getMonth() - 1);
        renderCalendar();
    });

    newNextBtn.addEventListener('click', () => {
        currentCalendarDate.setMonth(currentCalendarDate.getMonth() + 1);
        renderCalendar();
    });

    renderCalendar();
}

function renderCalendar() {
    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth();

    // Mettre à jour le titre
    const monthNames = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
                        'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
    document.getElementById('calendar-month').textContent = `${monthNames[month]} ${year}`;

    // Filtrer les présences du mois
    const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`;
    const monthPresences = allPresences.filter(p => p.date.startsWith(monthStr));

    // Calculer le total du mois
    const totalDays = calculateTotalDays(monthPresences);
    document.getElementById('calendar-month-total').textContent = `${totalDays.toFixed(1)} jours`;

    // Grouper les présences par date
    const presencesByDate = {};
    monthPresences.forEach(p => {
        if (!presencesByDate[p.date]) {
            presencesByDate[p.date] = [];
        }
        presencesByDate[p.date].push(p);
    });

    // Générer la grille
    const grid = document.getElementById('calendar-grid');
    grid.innerHTML = '';

    // Jours de la semaine
    const dayNames = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
    dayNames.forEach(day => {
        const header = document.createElement('div');
        header.className = 'calendar-header';
        header.textContent = day;
        grid.appendChild(header);
    });

    // Premier jour du mois (0 = Dimanche, 1 = Lundi, etc.)
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    // Ajuster pour commencer le lundi (firstDay: 0=Dim, 1=Lun, ...)
    const startOffset = firstDay === 0 ? 6 : firstDay - 1;

    // Jours du mois précédent
    for (let i = startOffset - 1; i >= 0; i--) {
        const day = daysInPrevMonth - i;
        const cell = createCalendarDay(day, true);
        grid.appendChild(cell);
    }

    // Jours du mois actuel
    const today = new Date();
    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const isToday = today.getFullYear() === year &&
                       today.getMonth() === month &&
                       today.getDate() === day;

        const cell = createCalendarDay(day, false, isToday, presencesByDate[dateStr], dateStr);
        grid.appendChild(cell);
    }

    // Jours du mois suivant pour compléter la grille
    const totalCells = grid.children.length - 7; // Soustraire les headers
    const remainingCells = (7 - (totalCells % 7)) % 7;
    for (let i = 1; i <= remainingCells; i++) {
        const cell = createCalendarDay(i, true);
        grid.appendChild(cell);
    }

    // Légende
    renderLegend(monthPresences);
}

function createCalendarDay(day, otherMonth, isToday = false, presences = null, dateStr = null) {
    const cell = document.createElement('div');
    cell.className = 'calendar-day';

    // Vérifier si c'est un jour de congés
    const isVacation = dateStr && isDateInVacation(dateStr);

    if (otherMonth) {
        cell.classList.add('other-month');
    }
    if (isToday) {
        cell.classList.add('today');
    }
    if (presences && presences.length > 0) {
        cell.classList.add('has-presence');
        cell.style.cursor = 'pointer';
    }
    if (isVacation) {
        cell.classList.add('vacation-day');
    }

    const number = document.createElement('div');
    number.className = 'calendar-day-number';
    number.textContent = day;
    cell.appendChild(number);

    // Ajouter icône congés
    if (isVacation) {
        const vacationIcon = document.createElement('div');
        vacationIcon.className = 'vacation-icon-small';
        vacationIcon.textContent = '🏖️';
        cell.appendChild(vacationIcon);
    }

    // Ajouter des badges pour chaque présence
    if (presences && presences.length > 0) {
        const badgesContainer = document.createElement('div');
        badgesContainer.className = 'calendar-day-badges';

        presences.forEach((presence, index) => {
            const badge = document.createElement('div');
            badge.className = 'presence-badge';

            const color = getClientColor(presence.client);
            badge.style.backgroundColor = color;

            // Déterminer le contenu du badge
            const clientInitial = presence.client.charAt(0).toUpperCase();
            const isFullDay = presence.duree === 'journee_complete' || presence.duree === '1.0';
            const isMorning = presence.duree === 'demi_journee_matin';
            const isAfternoon = presence.duree === 'demi_journee_aprem';

            if (isFullDay) {
                badge.textContent = clientInitial;
                badge.classList.add('full-day');
            } else if (isMorning) {
                badge.textContent = '½';
                badge.classList.add('half-day', 'morning');
            } else if (isAfternoon) {
                badge.textContent = '½';
                badge.classList.add('half-day', 'afternoon');
            } else {
                badge.textContent = clientInitial;
                badge.classList.add('full-day');
            }

            badgesContainer.appendChild(badge);
        });

        cell.appendChild(badgesContainer);

        // Ajouter un event listener pour ouvrir le modal au clic
        cell.addEventListener('click', () => {
            showDayDetails(dateStr, presences);
        });

        // Tooltip au survol
        let tooltip = presences.map(p => `${p.client} - ${formatDuration(p.duree)}`).join('\n');
        if (isVacation) {
            tooltip = '🏖️ Congés\n' + tooltip;
        }
        cell.title = tooltip;
    } else if (isVacation) {
        cell.title = '🏖️ Congés';
    }

    return cell;
}

function renderLegend(monthPresences) {
    const legend = document.getElementById('calendar-legend');
    legend.innerHTML = '';

    // Calculer les jours par client
    const clientStats = {};
    monthPresences.forEach(p => {
        if (!clientStats[p.client]) {
            clientStats[p.client] = 0;
        }
        clientStats[p.client] += getDurationValue(p.duree);
    });

    if (Object.keys(clientStats).length === 0) {
        legend.innerHTML = '<p style="color: var(--text-secondary); text-align: center; padding: 20px;">Aucune présence ce mois</p>';
        return;
    }

    // Calculer le total
    const totalDays = Object.values(clientStats).reduce((sum, days) => sum + days, 0);

    // Afficher le total en haut
    const totalHeader = document.createElement('div');
    totalHeader.className = 'legend-total';
    totalHeader.innerHTML = `<strong>Total: ${totalDays.toFixed(1)} jours</strong>`;
    legend.appendChild(totalHeader);

    // Container pour les clients
    const clientsContainer = document.createElement('div');
    clientsContainer.className = 'legend-clients';

    // Afficher chaque client avec sa couleur
    Object.entries(clientStats)
        .sort((a, b) => b[1] - a[1])
        .forEach(([client, days]) => {
            const item = document.createElement('div');
            item.className = 'legend-item';

            const colorSquare = document.createElement('div');
            colorSquare.className = 'legend-color-square';
            colorSquare.style.backgroundColor = getClientColor(client);

            const label = document.createElement('span');
            label.className = 'legend-label';
            label.textContent = `${client}`;

            const count = document.createElement('span');
            count.className = 'legend-count';
            count.textContent = `${days.toFixed(1)}j`;

            item.appendChild(colorSquare);
            item.appendChild(label);
            item.appendChild(count);
            clientsContainer.appendChild(item);
        });

    legend.appendChild(clientsContainer);
}

// Fonction pour afficher le modal de détails du jour
function showDayDetails(dateStr, presences) {
    const modal = document.getElementById('day-details-modal');
    const title = document.getElementById('day-details-title');
    const content = document.getElementById('day-details-content');

    // Mettre à jour le titre
    title.textContent = `Détails - ${formatDate(dateStr)}`;

    // Construire le contenu
    content.innerHTML = '';

    presences.forEach(presence => {
        const item = document.createElement('div');
        item.className = 'day-detail-item';

        const color = getClientColor(presence.client);

        // Déterminer le badge
        const isFullDay = presence.duree === 'journee_complete' || presence.duree === '1.0';
        const isMorning = presence.duree === 'demi_journee_matin';
        const isAfternoon = presence.duree === 'demi_journee_aprem';

        let durationBadge = '';
        if (isFullDay) {
            durationBadge = '<span class="detail-badge full">Journée complète</span>';
        } else if (isMorning) {
            durationBadge = '<span class="detail-badge half">Matin (0.5j)</span>';
        } else if (isAfternoon) {
            durationBadge = '<span class="detail-badge half">Après-midi (0.5j)</span>';
        }

        item.innerHTML = `
            <div class="detail-color-bar" style="background-color: ${color}"></div>
            <div class="detail-content">
                <div class="detail-client">${presence.client}</div>
                ${durationBadge}
                ${presence.notes ? `<div class="detail-notes">${presence.notes}</div>` : ''}
            </div>
            <div class="detail-actions">
                <button class="btn-primary btn-small" onclick="editPresence('${presence.id}')">✏️</button>
                <button class="btn-danger btn-small" onclick="deletePresence('${presence.id}')">🗑️</button>
            </div>
        `;

        content.appendChild(item);
    });

    // Afficher le modal
    modal.style.display = 'flex';

    // Gérer la fermeture
    const closeBtn = document.getElementById('day-details-close');
    closeBtn.onclick = () => {
        modal.style.display = 'none';
    };

    modal.onclick = (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    };
}
