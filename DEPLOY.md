# Deploiement sur Coolify

L'application est deployee sur Coolify (projet **PWA**) depuis la branche `main` de
`Freaka75/logmyjob`, et utilise la pile Supabase du meme projet (`https://supabase.mormagstudio.eu`).

## Configuration de l'application Coolify

| Parametre | Valeur |
|---|---|
| Build Pack | Dockerfile |
| Dockerfile Location | `/Dockerfile` |
| Base Directory | `/` |
| Port expose | `80` |
| Domaine | `https://logmyjob.mormagstudio.eu` |

Aucune variable d'environnement : la configuration Supabase est dans `frontend/js/config.js`.
Le health check est defini dans le `Dockerfile` (`GET /api/health`).

## Mettre a jour

1. Incrementer `CACHE_VERSION` dans `frontend/sw.js`.
2. Pousser sur `main`.
3. Redeployer dans Coolify (ou automatiquement si le webhook est configure).

Verification :

```bash
curl https://logmyjob.mormagstudio.eu/api/health
# {"status": "ok", "storage": "supabase"}
curl -sI https://logmyjob.mormagstudio.eu/js/app.js | grep -i cache-control
# Cache-Control: no-cache
```

## Cache HTTP (`nginx.conf`)

- HTML / JS / CSS / JSON : `no-cache` (le navigateur revalide a chaque chargement, ETag).
  Les noms de fichiers ne sont pas versionnes, un cache long empecherait les mises a jour.
- `sw.js` : `no-store`.
- Images et icones : 30 jours.

## Base Supabase

Schema initial : `supabase/schema.sql` (a executer dans le SQL Editor de Supabase Studio).

## Depannage

- **PWA ne s'installe pas** : HTTPS requis, verifier que `/manifest.json` est accessible.
- **Ancienne version affichee sur mobile** : verifier que `CACHE_VERSION` a bien ete incremente,
  puis fermer completement l'appli et la rouvrir.
