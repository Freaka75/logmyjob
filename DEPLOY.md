# Deploiement sur Coolify

Guide de deploiement de Log My Job sur Coolify.

> **Note** : Cette application utilise localStorage pour stocker les donnees.
> Chaque utilisateur a ses propres donnees dans son navigateur.
> Pas de base de donnees serveur a configurer.

## Pre-requis

- Serveur Coolify operationnel
- Acces au repository Git du projet
- Domaine configure (optionnel, pour SSL)

## Configuration Coolify

### 1. Creer une nouvelle application

1. Dans Coolify, cliquez sur **"New Resource"** > **"Application"**
2. Selectionnez **"Docker"** comme type
3. Connectez votre repository Git : `https://github.com/Freaka75/logmyjob.git`

### 2. Configuration du build

| Parametre | Valeur |
|-----------|--------|
| Build Pack | Dockerfile |
| Dockerfile Location | `./Dockerfile` |
| Docker Context | `.` |

### 3. Variables d'environnement

```env
FLASK_ENV=production
```

> Pas besoin de DATABASE_PATH - les donnees sont en localStorage cote client.

### 4. Configuration reseau

| Parametre | Valeur |
|-----------|--------|
| Port | `5000` |
| Protocol | HTTP |

### 5. Health Check

Coolify detecte automatiquement le health check depuis le Dockerfile.
Si besoin de configuration manuelle :

| Parametre | Valeur |
|-----------|--------|
| Health Check Path | `/api/health` |
| Health Check Port | `5000` |
| Health Check Method | GET |

### 6. Domaine et SSL

1. Dans **"Domains"**, ajoutez votre domaine (ex: `logmyjob.example.com`)
2. Activez **"Let's Encrypt"** pour SSL automatique
3. Forcez HTTPS si souhaite

> **Important** : HTTPS est requis pour l'installation PWA sur mobile.

## Deploiement

1. Cliquez sur **"Deploy"**
2. Suivez les logs de build
3. Verifiez que le health check passe au vert

## Verification post-deploiement

```bash
# Tester le health check
curl https://votre-domaine.com/api/health
# Reponse attendue: {"status":"ok","storage":"localStorage"}

# Tester la page d'accueil
curl -I https://votre-domaine.com/
# Reponse attendue: HTTP/2 200
```

## Structure des fichiers deployes

```
/app/
├── backend/
│   ├── app.py          # Serveur Flask (fichiers statiques)
│   └── requirements.txt
└── frontend/
    ├── index.html      # Application SPA
    ├── css/
    ├── js/
    │   ├── storage.js  # Gestion localStorage
    │   ├── app.js
    │   └── ...
    ├── icons/
    ├── manifest.json
    └── sw.js
```

## Sauvegarde des donnees

Les donnees sont stockees dans le navigateur de chaque utilisateur.

### Pour sauvegarder
1. Ouvrir l'application
2. Aller dans **Reglages** > **Sauvegarde**
3. Cliquer sur **"Sauvegarder"**
4. Un fichier JSON est telecharge

### Pour restaurer
1. Aller dans **Reglages** > **Sauvegarde**
2. Cliquer sur **"Restaurer"**
3. Selectionner le fichier JSON

## Troubleshooting

### L'application ne demarre pas
1. Verifiez les logs dans Coolify
2. Assurez-vous que le port 5000 est bien configure

### Erreur 502 Bad Gateway
- Le container n'est pas encore pret
- Attendez que le health check passe au vert
- Verifiez les logs pour des erreurs

### PWA ne s'installe pas
- Assurez-vous que HTTPS est active
- Verifiez que le manifest.json est accessible
- Verifiez la console du navigateur pour des erreurs

### Donnees perdues
- Les donnees sont dans le navigateur (localStorage)
- Changer de navigateur = nouvelles donnees
- Vider le cache = perte des donnees
- **Solution** : Utiliser la fonction Sauvegarde regulierement

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

> Les donnees utilisateur ne sont pas affectees par les mises a jour
> (elles sont dans le navigateur, pas sur le serveur).
