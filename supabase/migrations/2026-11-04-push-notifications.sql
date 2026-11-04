-- Notifications push (rappels quotidiens)
-- A executer en tant que supabase_admin. Les secrets (cles VAPID, secret du cron) sont
-- inseres a part dans private.push_config, ils ne sont pas dans le depot.

-- Abonnements push des navigateurs (un par appareil)
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL UNIQUE,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    timezone TEXT NOT NULL DEFAULT 'Europe/Paris',
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user ON public.push_subscriptions(user_id);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own push subscriptions" ON public.push_subscriptions;
CREATE POLICY "Users manage own push subscriptions" ON public.push_subscriptions
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_subscriptions TO authenticated;

-- Schema prive (non expose par l'API REST) : configuration et journal d'envoi
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;

CREATE TABLE IF NOT EXISTS private.push_config (
    id BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (id),  -- une seule ligne
    vapid_public_key TEXT NOT NULL,
    vapid_private_key TEXT NOT NULL,
    vapid_subject TEXT NOT NULL,
    cron_secret TEXT NOT NULL
);

-- Un rappel au plus par utilisateur et par jour (date locale de l'utilisateur)
CREATE TABLE IF NOT EXISTS private.reminder_log (
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    sent_on DATE NOT NULL,
    sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, sent_on)
);

-- L'Edge Function se connecte avec le role postgres (SUPABASE_DB_URL)
GRANT USAGE ON SCHEMA private TO postgres;
GRANT SELECT ON private.push_config TO postgres;
GRANT SELECT, INSERT, DELETE ON private.reminder_log TO postgres;

-- Planification : toutes les 10 minutes, appel de l'Edge Function send-reminders
CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'logmyjob-send-reminders';
SELECT cron.schedule(
    'logmyjob-send-reminders',
    '*/10 * * * *',
    $$
    SELECT net.http_post(
        url := 'http://supabase-edge-functions:9000/send-reminders',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'x-cron-secret', (SELECT cron_secret FROM private.push_config)
        ),
        body := '{}'::jsonb,
        timeout_milliseconds := 30000
    );
    $$
);

NOTIFY pgrst, 'reload schema';
