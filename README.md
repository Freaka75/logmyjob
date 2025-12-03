# Log My Job - PWA

PWA de suivi des jours de presence client pour freelances - 100% offline avec localStorage

## Fonctionnalites

- Saisie rapide des jours de presence
- Support des journees completes et demi-journees
- Vue calendrier mensuelle avec codes couleur par client
- Historique complet avec filtres et recherche
- Statistiques detaillees avec graphiques
- Export CSV et partage WhatsApp/Email
- Gestion des conges
- Mode sombre
- Sauvegarde/Restauration des donnees
- Mode offline grace a la PWA
- Installation sur mobile (Android/iOS)

## Deploiement rapide avec Docker

### Option 1 : Docker Compose (recommande)

```bash
# Cloner le projet
git clone <url-du-repo>
cd presence-tracker-pwa

# Lancer avec Docker Compose
docker-compose up -d

# Acceder a l'application
open http://localhost:5000
```

### Option 2 : Docker seul

```bash
# Build l'image
docker build -t log-my-job .

# Lancer le container
docker run -d -p 5000:5000 -v log-my-job-data:/app/data --name log-my-job log-my-job

# Acceder a l'application
open http://localhost:5000
```

### Deploiement sur Coolify

Voir le guide complet dans [DEPLOY.md](DEPLOY.md)

## Installation locale (developpement)

### Pre-requis

- Python 3.9+
- pip

### Backend

```bash
cd backend
pip install -r requirements.txt
python app.py
```

Le serveur demarre sur `http://localhost:5000`

### Frontend (optionnel, pour dev separe)

```bash
cd frontend
python -m http.server 8080
```

## Structure du projet

```
presence-tracker-pwa/
├── backend/
│   ├── app.py              # API Flask + serveur frontend
│   ├── database.py         # Gestion SQLite
│   └── requirements.txt    # Dependances Python
├── frontend/
│   ├── index.html          # Application SPA
│   ├── css/style.css       # Styles (Tailwind + custom)
│   ├── js/
│   │   ├── app.js          # Logique principale
│   │   ├── calendar.js     # Vue calendrier
│   │   ├── history.js      # Vue historique
│   │   ├── export.js       # Export et partage
│   │   └── stats.js        # Statistiques
│   ├── manifest.json       # Configuration PWA
│   ├── sw.js               # Service Worker
│   └── icons/              # Icones PWA
├── Dockerfile              # Image Docker
├── docker-compose.yml      # Config Docker Compose
├── DEPLOY.md               # Guide deploiement Coolify
└── README.md
```

## API Backend

### Endpoints principaux

| Methode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/health` | Health check |
| POST | `/api/days` | Creer un jour |
| GET | `/api/days` | Liste des jours |
| PUT | `/api/days/<id>` | Modifier un jour |
| DELETE | `/api/days/<id>` | Supprimer un jour |
| GET | `/api/clients` | Liste des clients |
| GET | `/api/stats/monthly` | Statistiques mensuelles |
| GET | `/api/backup` | Export des donnees |
| POST | `/api/restore` | Restauration |
| POST | `/api/reset` | Reinitialisation |

### Modele de donnees

```json
{
  "id": 1,
  "date": "2025-01-15",
  "client": "Client A",
  "duree": "journee_complete",
  "notes": "Notes optionnelles",
  "created_at": "2025-01-15T10:00:00"
}
```

### Valeurs de duree

- `journee_complete` - Journee complete (1 jour)
- `demi_journee_matin` - Demi-journee matin (0.5 jour)
- `demi_journee_aprem` - Demi-journee apres-midi (0.5 jour)

## Fonctionnalites detaillees

### Calendrier
- Vue mensuelle avec navigation
- Codes couleur par client
- Indicateur des conges
- Legende dynamique

### Historique
- Vue liste, timeline, ou groupee par mois
- Filtres par periode et client
- Recherche textuelle
- Selection multiple pour suppression

### Statistiques
- Total jours par periode
- Distribution par client (graphique)
- Tendances mensuelles
- Export CSV

### Reglages
- Mode sombre (auto/manuel)
- Notifications de rappel
- Gestion des conges
- Couleurs personnalisees par client
- Configuration email assistante
- Sauvegarde/Restauration
- Installation PWA

## Variables d'environnement

| Variable | Description | Defaut |
|----------|-------------|--------|
| `FLASK_ENV` | Environnement | `development` |
| `DATABASE_PATH` | Chemin base de donnees | `./presence.db` |

## Technologies

- **Backend** : Python, Flask, Gunicorn, SQLite
- **Frontend** : HTML5, Tailwind CSS, JavaScript ES6+
- **PWA** : Service Worker, Web App Manifest
- **Deploiement** : Docker, Coolify

## License

MIT
