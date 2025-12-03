# Log My Job - PWA

PWA de suivi des jours de presence client pour freelances - 100% offline avec localStorage

**100% offline** - Toutes les donnees sont stockees localement dans votre navigateur (localStorage).

## Fonctionnalites

- Saisie rapide des jours de presence
- Support des journees completes et demi-journees
- Vue calendrier mensuelle avec codes couleur par client
- Historique complet avec filtres et recherche
- Statistiques detaillees avec graphiques
- Export CSV et partage WhatsApp/Email
- Gestion des conges
- Mode sombre
- Changement de langue (FR/EN)
- Sauvegarde/Restauration des donnees (JSON)
- Mode offline complet grace a la PWA
- Installation sur mobile (Android/iOS)

## Avantages de l'architecture localStorage

- **100% offline** : Fonctionne sans connexion internet
- **Donnees privees** : Chaque utilisateur a ses propres donnees
- **Pas de conflit** : Pas de partage de donnees entre utilisateurs
- **Simple** : Pas de base de donnees a configurer ou maintenir
- **Rapide** : Acces instantane aux donnees

## Deploiement rapide avec Docker

### Option 1 : Docker Compose (recommande)

```bash
# Cloner le projet
git clone https://github.com/Freaka75/logmyjob.git
cd logmyjob

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
docker run -d -p 5000:5000 --name log-my-job log-my-job

# Acceder a l'application
open http://localhost:5000
```

### Deploiement sur Coolify

Voir le guide complet dans [DEPLOY.md](DEPLOY.md)

## Installation locale (developpement)

### Pre-requis

- Python 3.9+
- pip

### Lancer le serveur

```bash
cd backend
pip install -r requirements.txt
python app.py
```

Le serveur demarre sur `http://localhost:5000`

## Structure du projet

```
logmyjob/
├── backend/
│   ├── app.py              # Serveur Flask (sert les fichiers statiques)
│   └── requirements.txt    # Dependances Python
├── frontend/
│   ├── index.html          # Application SPA
│   ├── css/style.css       # Styles (Tailwind + custom)
│   ├── js/
│   │   ├── storage.js      # Gestion localStorage
│   │   ├── translations.js # Traductions FR/EN
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

## Stockage des donnees (localStorage)

Toutes les donnees sont stockees dans le navigateur :

| Cle | Description |
|-----|-------------|
| `logmyjob_days` | Tableau des jours de presence |
| `logmyjob_clients` | Liste des clients |
| `logmyjob_vacations` | Periodes de conges |
| `clientColors` | Couleurs personnalisees par client |
| `app-language` | Langue (fr/en) |
| `theme` | Theme (light/dark/auto) |

### Format des donnees

```json
{
  "id": "1701234567890abc",
  "date": "2025-01-15",
  "client": "Client A",
  "duree": "journee_complete",
  "notes": "Notes optionnelles",
  "created_at": "2025-01-15T10:00:00.000Z"
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
- Langue (Francais/English)
- Notifications de rappel
- Gestion des conges
- Couleurs personnalisees par client
- Configuration email assistante
- Sauvegarde/Restauration (JSON)
- Installation PWA

## Sauvegarde et Restauration

### Sauvegarder
1. Aller dans Reglages > Sauvegarde
2. Cliquer sur "Sauvegarder"
3. Un fichier JSON est telecharge

### Restaurer
1. Aller dans Reglages > Sauvegarde
2. Cliquer sur "Restaurer"
3. Selectionner le fichier JSON de sauvegarde

## Technologies

- **Backend** : Python, Flask, Gunicorn (serveur de fichiers statiques)
- **Frontend** : HTML5, Tailwind CSS, JavaScript ES6+
- **Stockage** : localStorage (100% client-side)
- **PWA** : Service Worker, Web App Manifest
- **Deploiement** : Docker, Coolify

## License

MIT
