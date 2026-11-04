// Edge Function : rappels quotidiens par notification push.
//
// Deux modes :
// - Cron (header x-cron-secret) : appele toutes les 10 min par pg_cron. Pour chaque
//   utilisateur abonne, envoie un rappel si : rappels actives, jour coche, heure atteinte
//   (heure locale de l'appareil), aucun jour saisi aujourd'hui, pas en conges, et pas deja
//   envoye aujourd'hui. Body { "dryRun": true } : calcule sans envoyer.
// - Test (Authorization: Bearer <jeton utilisateur>, body { "test": true }) : envoie
//   immediatement une notification a tous les appareils de cet utilisateur.
//
// Deploiement : copier ce dossier dans
//   /data/coolify/services/<uuid pile PWA>/volumes/functions/send-reminders/
// (le routeur "main" sert /functions/v1/send-reminders et http://supabase-edge-functions:9000/send-reminders).

import webpush from "npm:web-push@3.6.7";
import postgres from "npm:postgres@3.4.5";
import * as jose from "https://deno.land/x/jose@v4.14.4/index.ts";

type NotificationSettings = { enabled?: boolean; time?: string; weekdays?: number[] };
type Subscription = { id: string; endpoint: string; p256dh: string; auth: string; timezone: string };

const sql = postgres(Deno.env.get("SUPABASE_DB_URL")!, { max: 2, idle_timeout: 20 });

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });
}

async function loadConfig() {
  const [config] = await sql`select vapid_public_key, vapid_private_key, vapid_subject, cron_secret from private.push_config`;
  if (!config) throw new Error("private.push_config vide");
  webpush.setVapidDetails(config.vapid_subject, config.vapid_public_key, config.vapid_private_key);
  return config;
}

// Date (YYYY-MM-DD), jour de semaine (0 = dimanche) et minutes depuis minuit dans un fuseau.
function localNow(timezone: string) {
  let tz = timezone;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
  } catch {
    tz = "Europe/Paris";
  }
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", hourCycle: "h23", weekday: "short",
    }).formatToParts(new Date()).map((p) => [p.type, p.value]),
  );
  const weekday = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(parts.weekday);
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    weekday,
    minutes: Number(parts.hour) * 60 + Number(parts.minute),
  };
}

function parseSettings(preferences: unknown): NotificationSettings {
  try {
    const raw = (preferences as { values?: Record<string, string> })?.values?.notificationSettings;
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

// Envoie a tous les appareils ; supprime les abonnements expires (404 / 410).
async function sendToAll(subs: Subscription[], payload: Record<string, unknown>) {
  let sent = 0;
  let removed = 0;
  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify(payload),
        { TTL: 6 * 3600 },
      );
      sent++;
    } catch (error) {
      const status = (error as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) {
        await sql`delete from public.push_subscriptions where id = ${sub.id}`;
        removed++;
      } else {
        console.error("send-reminders: echec envoi", status, (error as Error).message);
      }
    }
  }
  return { sent, removed };
}

const REMINDER = {
  title: "Log My Job",
  body: "Pense à logger ta journée client 📝",
  url: "/?action=log",
  tag: "daily-reminder",
};

async function runCron(dryRun: boolean) {
  const rows = await sql`
    select s.id, s.user_id, s.endpoint, s.p256dh, s.auth, s.timezone, s.updated_at, us.preferences
    from public.push_subscriptions s
    left join public.user_settings us on us.user_id = s.user_id
    order by s.user_id, s.updated_at desc`;

  const byUser = new Map<string, { subs: Subscription[]; preferences: unknown }>();
  for (const r of rows) {
    const entry = byUser.get(r.user_id) ?? { subs: [], preferences: r.preferences };
    entry.subs.push({ id: r.id, endpoint: r.endpoint, p256dh: r.p256dh, auth: r.auth, timezone: r.timezone });
    byUser.set(r.user_id, entry);
  }

  const report: Record<string, unknown>[] = [];
  for (const [userId, { subs, preferences }] of byUser) {
    const settings = parseSettings(preferences);
    const now = localNow(subs[0].timezone); // fuseau de l'appareil le plus recemment mis a jour
    const [h, m] = (settings.time || "18:00").split(":").map(Number);
    const weekdays = settings.weekdays ?? [1, 2, 3, 4, 5];

    let reason = "";
    if (!settings.enabled) reason = "rappels desactives";
    else if (!weekdays.includes(now.weekday)) reason = "jour non coche";
    else if (now.minutes < h * 60 + m) reason = "heure non atteinte";
    else {
      const [already] = await sql`select 1 from private.reminder_log where user_id = ${userId} and sent_on = ${now.date}`;
      const [logged] = await sql`select 1 from public.days where user_id = ${userId} and date = ${now.date} limit 1`;
      const [holiday] = await sql`select 1 from public.holidays where user_id = ${userId}
                                  and ${now.date}::date between start_date and end_date limit 1`;
      if (already) reason = "deja envoye aujourd'hui";
      else if (logged) reason = "journee deja saisie";
      else if (holiday) reason = "en conges";
    }

    if (reason) {
      report.push({ user: userId.slice(0, 8), skip: reason });
      continue;
    }
    if (dryRun) {
      report.push({ user: userId.slice(0, 8), would_send: subs.length });
      continue;
    }

    // Journal avant envoi : un echec reseau ne provoque pas de rafale de rappels.
    await sql`insert into private.reminder_log (user_id, sent_on) values (${userId}, ${now.date}) on conflict do nothing`;
    const result = await sendToAll(subs, REMINDER);
    report.push({ user: userId.slice(0, 8), ...result });
  }
  return report;
}

async function userIdFromToken(req: Request): Promise<string | null> {
  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return null;
  try {
    const { payload } = await jose.jwtVerify(token, new TextEncoder().encode(Deno.env.get("JWT_SECRET")));
    return payload.role === "authenticated" && typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "POST") return json({ error: "POST attendu" }, 405);

  try {
    const config = await loadConfig();
    const body = await req.json().catch(() => ({}));

    if (req.headers.get("x-cron-secret")) {
      if (req.headers.get("x-cron-secret") !== config.cron_secret) return json({ error: "secret invalide" }, 401);
      return json({ ok: true, report: await runCron(body.dryRun === true) });
    }

    if (body.test === true) {
      const userId = await userIdFromToken(req);
      if (!userId) return json({ error: "non authentifie" }, 401);
      const subs = await sql<Subscription[]>`
        select id, endpoint, p256dh, auth, timezone from public.push_subscriptions where user_id = ${userId}`;
      if (subs.length === 0) return json({ error: "aucun appareil abonne" }, 404);
      const result = await sendToAll(subs, { ...REMINDER, body: "Notification de test : les rappels fonctionnent ✅", tag: "test" });
      return json({ ok: true, ...result });
    }

    return json({ error: "requete non reconnue" }, 400);
  } catch (error) {
    console.error("send-reminders:", error);
    return json({ error: (error as Error).message }, 500);
  }
});
