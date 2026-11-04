// Configuration Supabase
const CONFIG = {
    // URL de l'instance Supabase
    SUPABASE_URL: 'https://supabase.mormagstudio.eu',

    // Cle publique anon (safe to expose)
    SUPABASE_ANON_KEY: 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc2NDg4MTM0MCwiZXhwIjo0OTIwNTU0OTQwLCJyb2xlIjoiYW5vbiJ9.b409MzL7-bPwjjJIkqN9OQeHLg0g1hj4d7briDqOGO4',

    // Cle publique VAPID des notifications push (la cle privee est en base, schema private)
    VAPID_PUBLIC_KEY: 'BLPLhwvpze0yImKh87OO9rtr5KX60M6D8EuH9nQMHyHkpJAwnzv33mdXnu6kk66MIaV59V3nFgnyp1hTzPEnszM',

    // Nom de l'application
    APP_NAME: 'Log My Job',

    // Version
    VERSION: '2.0.0'
};

// Freeze pour empecher les modifications
Object.freeze(CONFIG);

window.CONFIG = CONFIG;
