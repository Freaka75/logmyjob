// Configuration Supabase - A modifier selon l'environnement
const CONFIG = {
    // URL de ton instance Supabase
    SUPABASE_URL: 'https://your-project.supabase.co',

    // Cle publique anon (safe to expose)
    SUPABASE_ANON_KEY: 'your-anon-key',

    // Nom de l'application
    APP_NAME: 'Log My Job',

    // Version
    VERSION: '2.0.0'
};

// Freeze pour empecher les modifications
Object.freeze(CONFIG);

window.CONFIG = CONFIG;
