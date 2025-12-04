// Client Supabase
// Necessite le SDK Supabase charge via CDN dans index.html

let supabaseClient = null;

function initSupabase() {
    if (!window.supabase) {
        console.error('Supabase SDK not loaded');
        return null;
    }

    if (!CONFIG.SUPABASE_URL || CONFIG.SUPABASE_URL === 'https://your-project.supabase.co') {
        console.error('Supabase URL not configured. Please update CONFIG in config.js');
        return null;
    }

    if (!CONFIG.SUPABASE_ANON_KEY || CONFIG.SUPABASE_ANON_KEY === 'your-anon-key') {
        console.error('Supabase anon key not configured. Please update CONFIG in config.js');
        return null;
    }

    supabaseClient = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY, {
        auth: {
            autoRefreshToken: true,
            persistSession: true,
            detectSessionInUrl: true
        }
    });

    return supabaseClient;
}

// Getter pour le client
function getSupabase() {
    if (!supabaseClient) {
        supabaseClient = initSupabase();
    }
    return supabaseClient;
}

window.getSupabase = getSupabase;
window.initSupabase = initSupabase;
