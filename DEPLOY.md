# Deploiement sur Coolify

Guide de deploiement de Log My Job sur Coolify.

## Pre-requis

- Serveur Coolify operationnel
- Acces au repository Git du projet
- Domaine configure (optionnel, pour SSL)

## Configuration Coolify

### 1. Creer une nouvelle application

1. Dans Coolify, cliquez sur **"New Resource"** > **"Application"**
2. Selectionnez **"Docker"** comme type
3. Connectez votre repository Git

### 2. Configuration du build

| Parametre | Valeur |
|-----------|--------|
| Build Pack | Dockerfile |
| Dockerfile Location | `./Dockerfile` |
| Docker Context | `.` |

### 3. Variables d'environnement

Ajoutez ces variables dans la section **"Environment Variables"** :

```env
FLASK_ENV=production
DATABASE_PATH=/app/data/presence.db
```

### 4. Configuration reseau

| Parametre | Valeur |
|-----------|--------|
| Port | `5000` |
| Protocol | HTTP |

### 5. Volume persistant (IMPORTANT)

Pour conserver la base de donnees entre les redemarrages :

1. Allez dans **"Storages"** ou **"Persistent Storage"**
2. Ajoutez un volume :
   - **Source** : `/app/data` (dans le container)
   - **Name** : `log-my-job-data` (ou autre nom)

### 6. Health Check

Coolify detecte automatiquement le health check depuis le Dockerfile.
Si besoin de configuration manuelle :

| Parametre | Valeur |
|-----------|--------|
| Health Check Path | `/api/health` |
| Health Check Port | `5000` |
| Health Check Method | GET |

### 7. Domaine et SSL

1. Dans **"Domains"**, ajoutez votre domaine (ex: `logmyjob.example.com`)
2. Activez **"Let's Encrypt"** pour SSL automatique
3. Forcez HTTPS si souhaite

## Deploiement

1. Cliquez sur **"Deploy"**
2. Suivez les logs de build
3. Verifiez que le health check passe au vert

## Verification post-deploiement

```bash
# Tester le health check
curl https://votre-domaine.com/api/health
# Reponse attendue: {"status":"ok"}

# Tester la page d'accueil
curl -I https://votre-domaine.com/
# Reponse attendue: HTTP/2 200
```

## Commandes utiles

### Voir les logs
Dans Coolify : Application > Logs

### Redemarrer l'application
Dans Coolify : Application > Restart

### Backup de la base de donnees
```bash
# Via l'interface de l'app
# Aller dans Reglages > Sauvegarde > Sauvegarder

# Ou via API
curl https://votre-domaine.com/api/backup > backup.json
```

### Restaurer une sauvegarde
```bash
curl -X POST -H "Content-Type: application/json" \
  -d @backup.json \
  https://votre-domaine.com/api/restore
```

## Structure des fichiers deployes

```
/app/
├── backend/
│   ├── app.py          # Application Flask
│   ├── database.py     # Gestion BDD
│   └── requirements.txt
├── frontend/
│   ├── index.html      # Interface web
│   ├── css/
│   ├── js/
│   ├── icons/
│   ├── manifest.json
│   └── sw.js
└── data/
    └── presence.db     # Base de donnees (volume persistant)
```

## Troubleshooting

### L'application ne demarre pas
1. Verifiez les logs dans Coolify
2. Assurez-vous que le port 5000 est bien configure
3. Verifiez que les variables d'environnement sont definies

### Base de donnees perdue apres redemarrage
- Assurez-vous que le volume persistant est configure pour `/app/data`

### Erreur 502 Bad Gateway
- Le container n'est pas encore pret
- Attendez que le health check passe au vert
- Verifiez les logs pour des erreurs

### PWA ne s'installe pas
- Assurez-vous que HTTPS est active
- Verifiez que le manifest.json est accessible
- Verifiez la console du navigateur pour des erreurs

## Performance

Le Dockerfile est configure avec :
- **2 workers Gunicorn** : adapte pour un usage leger
- Pour plus de trafic, modifiez le Dockerfile :
  ```dockerfile
  CMD ["gunicorn", "--bind", "0.0.0.0:5000", "--workers", "4", ...]
  ```

## Mise a jour

1. Poussez vos modifications sur Git
2. Coolify detecte automatiquement les changements (si webhook configure)
3. Ou cliquez manuellement sur **"Deploy"**

La base de donnees est preservee grace au volume persistant.
