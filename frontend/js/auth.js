// Module d'authentification Supabase

const auth = {
    // Inscription avec email et mot de passe
    async signUp(email, password) {
        const supabase = getSupabase();
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                emailRedirectTo: window.location.origin
            }
        });

        if (error) throw error;
        return data;
    },

    // Connexion avec email et mot de passe
    async signIn(email, password) {
        const supabase = getSupabase();
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error) throw error;
        return data;
    },

    // Connexion avec Magic Link (sans mot de passe)
    async signInWithMagicLink(email) {
        const supabase = getSupabase();
        const { data, error } = await supabase.auth.signInWithOtp({
            email,
            options: {
                emailRedirectTo: window.location.origin
            }
        });

        if (error) throw error;
        return data;
    },

    // Deconnexion
    async signOut() {
        const supabase = getSupabase();
        const { error } = await supabase.auth.signOut();
        if (error) throw error;

        // Rediriger vers la page de connexion
        window.location.href = '/auth.html';
    },

    // Recuperer l'utilisateur actuel
    async getCurrentUser() {
        const supabase = getSupabase();
        const { data: { user } } = await supabase.auth.getUser();
        return user;
    },

    // Recuperer la session actuelle
    async getSession() {
        const supabase = getSupabase();
        const { data: { session } } = await supabase.auth.getSession();
        return session;
    },

    // Verifier si l'utilisateur est connecte
    async isAuthenticated() {
        const session = await this.getSession();
        return !!session;
    },

    // Ecouter les changements d'authentification
    onAuthStateChange(callback) {
        const supabase = getSupabase();
        return supabase.auth.onAuthStateChange((event, session) => {
            callback(event, session);
        });
    },

    // Reinitialiser le mot de passe
    async resetPassword(email) {
        const supabase = getSupabase();
        const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/auth.html?mode=reset`
        });

        if (error) throw error;
        return data;
    },

    // Mettre a jour le mot de passe (apres reset)
    async updatePassword(newPassword) {
        const supabase = getSupabase();
        const { data, error } = await supabase.auth.updateUser({
            password: newPassword
        });

        if (error) throw error;
        return data;
    },

    // Verifier l'authentification et rediriger si necessaire
    async requireAuth() {
        const isAuth = await this.isAuthenticated();
        if (!isAuth) {
            window.location.href = '/auth.html';
            return false;
        }
        return true;
    }
};

window.auth = auth;
