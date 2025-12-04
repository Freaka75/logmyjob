# Configuration Supabase

## Etapes pour deployer Supabase

### 1. Creer une instance Supabase

- Creez un compte sur [Supabase](https://supabase.com) ou deployez votre propre instance
- Creez un nouveau projet

### 2. Executer le schema

Allez dans l'editeur SQL de Supabase et executez le contenu de `schema.sql`.

Ce script va creer :
- Table `days` - Jours de presence
- Table `clients` - Liste des clients
- Table `holidays` - Periodes de conges
- Table `user_settings` - Parametres utilisateur
- Policies RLS pour l'isolation des donnees par utilisateur

### 3. Configurer l'authentification

1. Dans Supabase Dashboard > Authentication > Providers
2. Activez "Email" provider
3. Configurez les parametres SMTP pour les emails (optionnel mais recommande)

### 4. Recuperer les credentials

1. Dans Supabase Dashboard > Settings > API
2. Copiez l'URL du projet et la cle `anon` publique

### 5. Configurer l'application

Modifiez le fichier `frontend/js/config.js` :

```javascript
const CONFIG = {
    SUPABASE_URL: 'https://votre-projet.supabase.co',
    SUPABASE_ANON_KEY: 'votre-cle-anon-publique',
    APP_NAME: 'Log My Job',
    VERSION: '2.0.0'
};
```

### 6. Deployer

Le Dockerfile utilise nginx pour servir les fichiers statiques.
Le port expose est 80 (au lieu de 5000 avec Flask).

```bash
docker build -t logmyjob .
docker run -p 80:80 logmyjob
```

## Securite

- La cle `anon` est publique et peut etre exposee dans le frontend
- Les Row Level Security (RLS) policies garantissent que chaque utilisateur ne voit que ses propres donnees
- L'authentification est geree cote Supabase
