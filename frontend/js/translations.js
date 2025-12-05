// ============ TRANSLATIONS / TRADUCTIONS ============

const translations = {
    fr: {
        // Navigation
        nav_home: 'Accueil',
        nav_calendar: 'Calendrier',
        nav_history: 'Historique',
        nav_stats: 'Stats',
        nav_export: 'Partage',
        nav_settings: 'Reglages',

        // Page Accueil
        home_title: 'Log My Job',
        this_month: 'Ce mois',
        days: 'jours',
        day: 'jour',
        log_today: 'Logger aujourd\'hui',
        new_presence: 'Nouvelle presence',
        edit_presence: 'Modifier la presence',
        last_days: 'Derniers jours',
        no_recent: 'Aucune presence recente',

        // Formulaire
        form_date: 'Date',
        form_today: 'Aujourd\'hui',
        form_yesterday: 'Hier',
        form_before_yesterday: 'Avant-hier',
        form_client: 'Client',
        form_select_client: '-- Selectionner --',
        form_new_client: 'Ou saisir un nouveau client',
        form_duration: 'Duree',
        form_full_day: 'Journee',
        form_morning: 'Matin',
        form_afternoon: 'Apres-midi',
        form_notes: 'Notes (optionnel)',
        form_notes_placeholder: 'Contexte, projet, etc.',
        form_save: 'Enregistrer',
        form_cancel: 'Annuler',

        // Calendrier
        calendar_title: 'Calendrier',
        calendar_days_header: ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'],
        calendar_months: ['Janvier', 'Fevrier', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Aout', 'Septembre', 'Octobre', 'Novembre', 'Decembre'],
        day_details: 'Details du jour',

        // Historique
        history_title: 'Historique',
        period: 'Periode',
        period_all: 'Tous',
        period_this_month: 'Ce mois',
        period_last_month: 'Mois dernier',
        period_last_3_months: '3 derniers mois',
        period_this_year: 'Cette annee',
        period_custom: 'Personnalise',
        client: 'Client',
        all_clients: 'Tous',
        search: 'Recherche',
        search_placeholder: 'Client, notes...',
        from: 'Du',
        to: 'Au',
        apply: 'Appliquer',
        days_found: 'jours trouves',
        select_all: 'Tout',
        delete_selection: 'Suppr',
        no_results: 'Aucun resultat',

        // Stats
        stats_title: 'Statistiques',
        total_days: 'Jours',
        total_clients: 'Clients',
        avg_month: 'Moy/mois',
        half_days: 'Demi-j',
        monthly_evolution: 'Evolution mensuelle',
        client_distribution: 'Repartition par client',
        insights: 'Insights',
        monthly_detail: 'Detail mensuel',
        month: 'Mois',

        // Export
        export_title: 'Export & Partage',
        export_period: 'Periode',
        export_recap: 'Recapitulatif',
        show_detail: 'Afficher le detail',
        share: 'Partager',
        copy: 'Copier',
        email: 'Email',
        csv: 'CSV',
        email_preview: 'Apercu de l\'email',
        copied: 'Copie !',
        copy_error: 'Erreur de copie',

        // Reglages
        settings_title: 'Reglages',
        appearance: 'Apparence',
        language: 'Langue',
        french: 'Francais',
        english: 'English',
        dark_mode: 'Mode sombre',
        dark_mode_desc: 'Reduire la fatigue oculaire',
        theme_light: 'Clair',
        theme_dark: 'Sombre',
        theme_auto: 'Auto',

        application: 'Application',
        app_not_installed: 'Application non installee',
        app_not_installed_desc: 'Installez pour un acces rapide',
        install_on_device: 'Installer sur mon appareil',
        ios_installation: 'Installation sur iOS',
        ios_installation_desc: 'Suivez les etapes ci-dessous',
        ios_step1: 'Appuyez sur le bouton Partager',
        ios_step2: 'Selectionnez "Sur l\'ecran d\'accueil"',
        app_installed: 'Application installee',
        app_installed_desc: 'Acces rapide depuis votre ecran d\'accueil',

        notifications: 'Notifications',
        daily_reminders: 'Rappels quotidiens',
        daily_reminders_desc: 'Notification pour logger votre journee',
        notification_warning: 'Notifications HTTPS requises sur mobile. Fonctionne sur PC (localhost).',
        notification_time: 'Heure',
        notification_days: 'Jours',
        test_notification: 'Test notification',
        weekdays: ['D', 'L', 'M', 'M', 'J', 'V', 'S'],

        my_vacations: 'Mes conges',
        add_vacation: '+ Ajouter des conges',
        vacation_start: 'Date debut',
        vacation_end: 'Date fin',
        vacation_type: 'Type',
        vacation_types: {
            conges: 'Conges',
            rtt: 'RTT',
            ferie: 'Ferie',
            autre: 'Autre'
        },

        client_colors: 'Couleurs clients',
        client_colors_desc: 'Personnalisez la couleur de chaque client.',

        assistant: 'Assistante',
        assistant_email: 'Email',
        assistant_email_placeholder: 'assistante@example.com',
        assistant_name: 'Nom',
        assistant_name_placeholder: 'Prenom Nom',
        assistant_message: 'Message personnalise',
        assistant_message_placeholder: 'Message dans les emails...',

        backup: 'Sauvegarde',
        backup_desc: 'Sauvegardez ou restaurez vos donnees.',
        backup_btn: 'Sauvegarder',
        restore_btn: 'Restaurer',
        backup_success: 'Sauvegarde telechargee !',
        restore_success: 'Restauration reussie !',
        restore_error: 'Erreur de restauration',

        danger_zone: 'Zone de danger',
        danger_zone_desc: 'Cette action supprimera toutes vos donnees. Effectuez une sauvegarde avant !',
        reset_all: 'Reinitialiser toutes les donnees',
        reset_confirm: 'Etes-vous sur de vouloir supprimer TOUTES vos donnees ? Cette action est irreversible.',

        // Install banners
        install_app: 'Installer l\'application',
        install_quick_access: 'Acces rapide depuis votre ecran d\'accueil',
        install_btn: 'Installer',
        install_later: 'Plus tard',
        install_ios_title: 'Installer sur iPhone/iPad',
        install_ios_desc: 'Ajoutez l\'app a votre ecran d\'accueil',
        ios_share: '(Partager)',
        ios_add_home: '"Sur l\'ecran d\'accueil"',
        understood: 'J\'ai compris',

        // Vacation banner
        on_vacation: 'En conges',
        vacation_until: 'jusqu\'au',

        // Messages
        presence_saved: 'Presence enregistree !',
        presence_updated: 'Presence mise a jour !',
        presence_deleted: 'Presence supprimee !',
        error_occurred: 'Une erreur est survenue',
        confirm_delete: 'Supprimer cette presence ?',
        confirm_delete_multiple: 'Supprimer les presences selectionnees ?',

        // Misc
        edit: 'Modifier',
        delete: 'Supprimer',
        close: 'Fermer',
        save: 'Sauvegarder',
        loading: 'Chargement...',
        no_data: 'Aucune donnee',

        // Additional UI
        bill_next_month: 'Facturer le mois prochain',
        add_vacation_title: 'Ajouter des conges',
        details: 'Details',
        full_day: 'Journee complete',
        half_morning: 'Matin (0.5j)',
        half_afternoon: 'Apres-midi (0.5j)',
        deferred_from: 'Jour reporte du mois precedent',
        billed_in: 'Facture',
        no_entry_today: 'Aucune donnee pour ce jour'
    },

    en: {
        // Navigation
        nav_home: 'Home',
        nav_calendar: 'Calendar',
        nav_history: 'History',
        nav_stats: 'Stats',
        nav_export: 'Share',
        nav_settings: 'Settings',

        // Page Accueil
        home_title: 'Log My Job',
        this_month: 'This month',
        days: 'days',
        day: 'day',
        log_today: 'Log today',
        new_presence: 'New entry',
        edit_presence: 'Edit entry',
        last_days: 'Recent days',
        no_recent: 'No recent entries',

        // Formulaire
        form_date: 'Date',
        form_today: 'Today',
        form_yesterday: 'Yesterday',
        form_before_yesterday: 'Day before',
        form_client: 'Client',
        form_select_client: '-- Select --',
        form_new_client: 'Or enter new client',
        form_duration: 'Duration',
        form_full_day: 'Full day',
        form_morning: 'Morning',
        form_afternoon: 'Afternoon',
        form_notes: 'Notes (optional)',
        form_notes_placeholder: 'Context, project, etc.',
        form_save: 'Save',
        form_cancel: 'Cancel',

        // Calendrier
        calendar_title: 'Calendar',
        calendar_days_header: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        calendar_months: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
        day_details: 'Day details',

        // Historique
        history_title: 'History',
        period: 'Period',
        period_all: 'All',
        period_this_month: 'This month',
        period_last_month: 'Last month',
        period_last_3_months: 'Last 3 months',
        period_this_year: 'This year',
        period_custom: 'Custom',
        client: 'Client',
        all_clients: 'All',
        search: 'Search',
        search_placeholder: 'Client, notes...',
        from: 'From',
        to: 'To',
        apply: 'Apply',
        days_found: 'days found',
        select_all: 'All',
        delete_selection: 'Delete',
        no_results: 'No results',

        // Stats
        stats_title: 'Statistics',
        total_days: 'Days',
        total_clients: 'Clients',
        avg_month: 'Avg/month',
        half_days: 'Half-days',
        monthly_evolution: 'Monthly evolution',
        client_distribution: 'Client distribution',
        insights: 'Insights',
        monthly_detail: 'Monthly detail',
        month: 'Month',

        // Export
        export_title: 'Export & Share',
        export_period: 'Period',
        export_recap: 'Summary',
        show_detail: 'Show details',
        share: 'Share',
        copy: 'Copy',
        email: 'Email',
        csv: 'CSV',
        email_preview: 'Email preview',
        copied: 'Copied!',
        copy_error: 'Copy error',

        // Reglages
        settings_title: 'Settings',
        appearance: 'Appearance',
        language: 'Language',
        french: 'Francais',
        english: 'English',
        dark_mode: 'Dark mode',
        dark_mode_desc: 'Reduce eye strain',
        theme_light: 'Light',
        theme_dark: 'Dark',
        theme_auto: 'Auto',

        application: 'Application',
        app_not_installed: 'App not installed',
        app_not_installed_desc: 'Install for quick access',
        install_on_device: 'Install on my device',
        ios_installation: 'iOS Installation',
        ios_installation_desc: 'Follow the steps below',
        ios_step1: 'Tap the Share button',
        ios_step2: 'Select "Add to Home Screen"',
        app_installed: 'App installed',
        app_installed_desc: 'Quick access from your home screen',

        notifications: 'Notifications',
        daily_reminders: 'Daily reminders',
        daily_reminders_desc: 'Notification to log your day',
        notification_warning: 'HTTPS notifications required on mobile. Works on PC (localhost).',
        notification_time: 'Time',
        notification_days: 'Days',
        test_notification: 'Test notification',
        weekdays: ['S', 'M', 'T', 'W', 'T', 'F', 'S'],

        my_vacations: 'My vacations',
        add_vacation: '+ Add vacation',
        vacation_start: 'Start date',
        vacation_end: 'End date',
        vacation_type: 'Type',
        vacation_types: {
            conges: 'Vacation',
            rtt: 'RTT',
            ferie: 'Holiday',
            autre: 'Other'
        },

        client_colors: 'Client colors',
        client_colors_desc: 'Customize each client\'s color.',

        assistant: 'Assistant',
        assistant_email: 'Email',
        assistant_email_placeholder: 'assistant@example.com',
        assistant_name: 'Name',
        assistant_name_placeholder: 'First Last',
        assistant_message: 'Custom message',
        assistant_message_placeholder: 'Message in emails...',

        backup: 'Backup',
        backup_desc: 'Backup or restore your data.',
        backup_btn: 'Backup',
        restore_btn: 'Restore',
        backup_success: 'Backup downloaded!',
        restore_success: 'Restore successful!',
        restore_error: 'Restore error',

        danger_zone: 'Danger zone',
        danger_zone_desc: 'This will delete all your data. Make a backup first!',
        reset_all: 'Reset all data',
        reset_confirm: 'Are you sure you want to delete ALL your data? This action is irreversible.',

        // Install banners
        install_app: 'Install app',
        install_quick_access: 'Quick access from your home screen',
        install_btn: 'Install',
        install_later: 'Later',
        install_ios_title: 'Install on iPhone/iPad',
        install_ios_desc: 'Add app to your home screen',
        ios_share: '(Share)',
        ios_add_home: '"Add to Home Screen"',
        understood: 'Got it',

        // Vacation banner
        on_vacation: 'On vacation',
        vacation_until: 'until',

        // Messages
        presence_saved: 'Entry saved!',
        presence_updated: 'Entry updated!',
        presence_deleted: 'Entry deleted!',
        error_occurred: 'An error occurred',
        confirm_delete: 'Delete this entry?',
        confirm_delete_multiple: 'Delete selected entries?',

        // Misc
        edit: 'Edit',
        delete: 'Delete',
        close: 'Close',
        save: 'Save',
        loading: 'Loading...',
        no_data: 'No data',

        // Additional UI
        bill_next_month: 'Bill next month',
        add_vacation_title: 'Add vacation',
        details: 'Details',
        full_day: 'Full day',
        half_morning: 'Morning (0.5d)',
        half_afternoon: 'Afternoon (0.5d)',
        deferred_from: 'Day deferred from previous month',
        billed_in: 'Billed in',
        no_entry_today: 'No data for this day'
    }
};

// ============ LANGUAGE MANAGER ============

let currentLang = localStorage.getItem('app-language') || 'fr';

function t(key) {
    const keys = key.split('.');
    let value = translations[currentLang];
    for (const k of keys) {
        if (value && value[k] !== undefined) {
            value = value[k];
        } else {
            // Fallback to French
            value = translations.fr;
            for (const k2 of keys) {
                if (value && value[k2] !== undefined) {
                    value = value[k2];
                } else {
                    return key; // Return key if not found
                }
            }
            break;
        }
    }
    return value;
}

function setLanguage(lang) {
    if (translations[lang]) {
        currentLang = lang;
        localStorage.setItem('app-language', lang);
        applyTranslations();
        document.documentElement.lang = lang;

        // Dispatch event for other scripts
        window.dispatchEvent(new CustomEvent('languageChanged', { detail: { lang } }));
    }
}

function getCurrentLanguage() {
    return currentLang;
}

function applyTranslations() {
    // Navigation
    document.querySelectorAll('.nav-item').forEach(btn => {
        const page = btn.dataset.page;
        const span = btn.querySelector('span:last-child');
        if (span && page) {
            span.textContent = t(`nav_${page}`);
        }
    });

    // Elements with data-i18n attribute
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.dataset.i18n;
        const text = t(key);
        if (el.tagName === 'INPUT' && el.type !== 'button' && el.type !== 'submit') {
            el.placeholder = text;
        } else {
            el.textContent = text;
        }
    });

    // Elements with data-i18n-placeholder attribute
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.dataset.i18nPlaceholder;
        el.placeholder = t(key);
    });

    // Update select options for periods
    updateSelectOptions('filter-period', {
        'all': 'period_all',
        'this-month': 'period_this_month',
        'last-month': 'period_last_month',
        'last-3-months': 'period_last_3_months',
        'this-year': 'period_this_year',
        'custom': 'period_custom'
    });

    updateSelectOptions('stats-period', {
        'this-month': 'period_this_month',
        'last-3-months': 'period_last_3_months',
        'last-6-months': 'period_last_3_months',
        'this-year': 'period_this_year',
        'all': 'period_all'
    });

    updateSelectOptions('export-period', {
        'this-month': 'period_this_month',
        'last-month': 'period_last_month',
        'last-3-months': 'period_last_3_months',
        'this-year': 'period_this_year',
        'all': 'period_all',
        'custom': 'period_custom'
    });

    // Update language selector UI
    updateLanguageUI();

    // Trigger custom event for dynamic content
    window.dispatchEvent(new CustomEvent('translationsApplied'));
}

function updateSelectOptions(selectId, optionKeys) {
    const select = document.getElementById(selectId);
    if (!select) return;

    Array.from(select.options).forEach(option => {
        const key = optionKeys[option.value];
        if (key) {
            option.textContent = t(key);
        }
    });
}

function updateLanguageUI() {
    const langFr = document.getElementById('lang-fr');
    const langEn = document.getElementById('lang-en');

    if (langFr && langEn) {
        langFr.classList.toggle('border-blue-500', currentLang === 'fr');
        langFr.classList.toggle('bg-blue-50', currentLang === 'fr');
        langEn.classList.toggle('border-blue-500', currentLang === 'en');
        langEn.classList.toggle('bg-blue-50', currentLang === 'en');
    }
}

// Initialize language on load
function initLanguage() {
    const savedLang = localStorage.getItem('app-language');
    if (savedLang && translations[savedLang]) {
        currentLang = savedLang;
    } else {
        // Detect browser language
        const browserLang = navigator.language.split('-')[0];
        currentLang = translations[browserLang] ? browserLang : 'fr';
    }
    document.documentElement.lang = currentLang;

    // Apply translations after DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', applyTranslations);
    } else {
        applyTranslations();
    }
}

// Auto-init
initLanguage();
