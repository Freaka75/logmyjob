# Log My Job - PWA

PWA de suivi des jours de presence client pour freelances.
Authentification et donnees dans **Supabase** (auto-heberge), frontend statique servi par nginx.

## Fonctionnalites

- Saisie rapide des jours de presence (journee complete, demi-journee matin / apres-midi)
- Facturation reportee au mois suivant
- Vue calendrier mensuelle avec codes couleur par client
- Historique complet avec filtres et recherche
- Statistiques detaillees avec graphiques
- Export CSV et partage WhatsApp / Email
- Gestion des conges
- Mode sombre, francais / anglais
- Sauvegarde / restauration (JSON)
- Connexion par mot de passe, lien magique ou code OTP
- Installation sur mobile (Android / iOS)

## Architecture

| Element | Role |
|---|---|
| `frontend/` | Application (HTML + JavaScript sans build, Tailwind / Chart.js / Supabase via CDN) |
| `frontend/js/config.js` | URL Supabase + cle publique `anon` (publique par nature, l'acces est protege par RLS) |
| `frontend/sw.js` | Service Worker (Workbox) : cache hors ligne, notifications |
| `supabase/schema.sql` | Tables `days`, `clients`, `holidays`, `user_settings` + politiques RLS |
| `nginx.conf` | Config du serveur web (cache HTTP, route SPA, `/api/health`) |
| `Dockerfile` | Image nginx:alpine servant `frontend/` |

### Base de donnees

Chaque utilisateur ne voit que ses donnees (Row Level Security sur `auth.uid() = user_id`).
Valeurs de `days.duration` : `journee_complete` (1 jour), `demi_journee_matin`, `demi_journee_aprem` (0,5 jour).
`days.billing_month` (`YYYY-MM`) : si renseigne, la journee est facturee ce mois-la.

Encore stockes dans le navigateur (`localStorage`) : couleurs des clients, reglages de notification,
assistante, theme, langue.

## Rappels (notifications push)

- L'appareil s'abonne quand on active « Rappels quotidiens » (`frontend/js/push.js`) ;
  l'abonnement est stocke dans `public.push_subscriptions`.
- `supabase/functions/send-reminders/` (Edge Function) est appelee toutes les 10 min par `pg_cron`
  (job `logmyjob-send-reminders`). Elle envoie un rappel si : rappels actives, jour coche, heure
  atteinte (fuseau de l'appareil), aucun jour saisi, pas en conges, pas deja envoye ce jour.
- Cles VAPID et secret du cron : table `private.push_config` (non exposee par l'API).
  La cle publique est aussi dans `frontend/js/config.js`.
- iPhone / iPad : l'application doit etre installee sur l'ecran d'accueil (iOS 16.4+).
- Migration : `supabase/migrations/2026-11-04-push-notifications.sql`.
- Deployer la fonction : copier `supabase/functions/send-reminders/index.ts` dans
  `/data/coolify/services/<uuid pile PWA>/volumes/functions/send-reminders/` (pris en compte a la requete suivante).

## Comptes

Inscriptions fermees (`DISABLE_SIGNUP=true` dans la pile Supabase) : ajouter un utilisateur depuis
Supabase Studio > Authentication > Add user / Invite.

## Lancer en local

```bash
docker compose up -d --build
# -> http://localhost:8080 (utilise la base Supabase de production definie dans config.js)
```

Sans Docker, n'importe quel serveur statique sur `frontend/` suffit
(ex. `python -m http.server 8080 -d frontend`), mais sans les en-tetes de `nginx.conf`.

## Deploiement

Voir [DEPLOY.md](DEPLOY.md).

**A chaque modification du frontend, incrementer `CACHE_VERSION` dans `frontend/sw.js`**,
sinon les applis installees continuent d'utiliser les fichiers en cache.

## License

MIT
