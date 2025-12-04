-- Schema Supabase pour Log My Job
-- A executer dans le SQL Editor de Supabase

-- Table des jours de presence
CREATE TABLE days (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    client TEXT NOT NULL,
    duration TEXT NOT NULL CHECK (duration IN ('journee_complete', 'demi_journee_matin', 'demi_journee_aprem')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table des clients (pour autocompletion)
CREATE TABLE clients (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    color TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, name)
);

-- Table des conges
CREATE TABLE holidays (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('conges', 'rtt', 'ferie', 'autre')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table des preferences utilisateur
CREATE TABLE user_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    assistant_email TEXT,
    assistant_name TEXT,
    notification_hour INTEGER DEFAULT 18,
    notification_days INTEGER[] DEFAULT ARRAY[1,2,3,4,5],
    custom_message TEXT,
    dark_mode BOOLEAN DEFAULT false,
    language TEXT DEFAULT 'fr',
    auto_backup BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Row Level Security (RLS) - Chaque user voit uniquement ses donnees
ALTER TABLE days ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE holidays ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- Policies pour days
CREATE POLICY "Users can view own days" ON days FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own days" ON days FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own days" ON days FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own days" ON days FOR DELETE USING (auth.uid() = user_id);

-- Policies pour clients
CREATE POLICY "Users can view own clients" ON clients FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own clients" ON clients FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own clients" ON clients FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own clients" ON clients FOR DELETE USING (auth.uid() = user_id);

-- Policies pour holidays
CREATE POLICY "Users can view own holidays" ON holidays FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own holidays" ON holidays FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own holidays" ON holidays FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own holidays" ON holidays FOR DELETE USING (auth.uid() = user_id);

-- Policies pour user_settings
CREATE POLICY "Users can view own settings" ON user_settings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own settings" ON user_settings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own settings" ON user_settings FOR UPDATE USING (auth.uid() = user_id);

-- Index pour performances
CREATE INDEX idx_days_user_date ON days(user_id, date);
CREATE INDEX idx_days_user_client ON days(user_id, client);
CREATE INDEX idx_holidays_user_dates ON holidays(user_id, start_date, end_date);

-- Trigger pour mettre a jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_days_updated_at BEFORE UPDATE ON days
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_settings_updated_at BEFORE UPDATE ON user_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
