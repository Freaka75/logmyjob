import sqlite3
from datetime import datetime
import os

# Utiliser la variable d'environnement DATABASE_PATH si definie
# Sinon, utiliser le chemin par defaut dans le dossier backend
DB_PATH = os.environ.get('DATABASE_PATH', os.path.join(os.path.dirname(__file__), 'presence.db'))

# S'assurer que le dossier parent existe
db_dir = os.path.dirname(DB_PATH)
if db_dir and not os.path.exists(db_dir):
    os.makedirs(db_dir, exist_ok=True)

def init_db():
    """Initialise la base de données"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS presences (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date TEXT NOT NULL,
            client TEXT NOT NULL,
            duree TEXT NOT NULL,
            notes TEXT,
            created_at TEXT NOT NULL
        )
    ''')

    cursor.execute('''
        CREATE INDEX IF NOT EXISTS idx_date ON presences(date)
    ''')

    cursor.execute('''
        CREATE INDEX IF NOT EXISTS idx_client ON presences(client)
    ''')

    conn.commit()
    conn.close()

def get_connection():
    """Retourne une connexion à la base de données"""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def validate_duree(duree):
    """Valide le format de la durée"""
    valid_durees = ['journee_complete', 'demi_journee_matin', 'demi_journee_aprem']
    try:
        # Vérifie si c'est une valeur numérique valide (1.0 ou 0.5)
        float_val = float(duree)
        if float_val in [1.0, 0.5]:
            return True
    except ValueError:
        pass

    return duree in valid_durees

def check_overlap(date, duree, exclude_id=None):
    """
    Vérifie s'il y a un chevauchement pour une date donnée
    Retourne True s'il y a un problème, False sinon
    """
    conn = get_connection()
    cursor = conn.cursor()

    if exclude_id:
        cursor.execute('SELECT duree FROM presences WHERE date = ? AND id != ?', (date, exclude_id))
    else:
        cursor.execute('SELECT duree FROM presences WHERE date = ?', (date,))

    existing = cursor.fetchall()
    conn.close()

    # Si journée complète, pas d'autre entrée possible
    if duree in ['journee_complete', '1.0', 1.0]:
        return len(existing) > 0

    # Pour les demi-journées, vérifier les chevauchements
    if duree in ['demi_journee_matin', 'demi_journee_aprem', '0.5', 0.5]:
        for row in existing:
            existing_duree = row['duree']

            # Si une journée complète existe déjà
            if existing_duree in ['journee_complete', '1.0']:
                return True

            # Si même demi-journée existe déjà
            if duree == 'demi_journee_matin' and existing_duree == 'demi_journee_matin':
                return True
            if duree == 'demi_journee_aprem' and existing_duree == 'demi_journee_aprem':
                return True

            # Maximum 2 demi-journées par jour
            if len(existing) >= 2:
                return True

    return False

def create_presence(date, client, duree, notes=''):
    """Crée une nouvelle entrée de présence"""
    if not validate_duree(duree):
        return None, "Durée invalide"

    if check_overlap(date, duree):
        return None, "Chevauchement détecté pour cette date"

    conn = get_connection()
    cursor = conn.cursor()
    created_at = datetime.now().isoformat()

    cursor.execute('''
        INSERT INTO presences (date, client, duree, notes, created_at)
        VALUES (?, ?, ?, ?, ?)
    ''', (date, client, duree, notes, created_at))

    conn.commit()
    presence_id = cursor.lastrowid
    conn.close()

    return presence_id, None

def get_all_presences(month=None, client=None):
    """Récupère toutes les présences avec filtres optionnels"""
    conn = get_connection()
    cursor = conn.cursor()

    query = 'SELECT * FROM presences WHERE 1=1'
    params = []

    if month:
        query += ' AND strftime("%Y-%m", date) = ?'
        params.append(month)

    if client:
        query += ' AND client = ?'
        params.append(client)

    query += ' ORDER BY date DESC, created_at DESC'

    cursor.execute(query, params)
    rows = cursor.fetchall()
    conn.close()

    presences = []
    for row in rows:
        presences.append({
            'id': row['id'],
            'date': row['date'],
            'client': row['client'],
            'duree': row['duree'],
            'notes': row['notes'],
            'created_at': row['created_at']
        })

    return presences

def get_presence_by_id(presence_id):
    """Récupère une présence par son ID"""
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute('SELECT * FROM presences WHERE id = ?', (presence_id,))
    row = cursor.fetchone()
    conn.close()

    if row:
        return {
            'id': row['id'],
            'date': row['date'],
            'client': row['client'],
            'duree': row['duree'],
            'notes': row['notes'],
            'created_at': row['created_at']
        }
    return None

def update_presence(presence_id, date, client, duree, notes=''):
    """Met à jour une présence"""
    if not validate_duree(duree):
        return False, "Durée invalide"

    if check_overlap(date, duree, exclude_id=presence_id):
        return False, "Chevauchement détecté pour cette date"

    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute('''
        UPDATE presences
        SET date = ?, client = ?, duree = ?, notes = ?
        WHERE id = ?
    ''', (date, client, duree, notes, presence_id))

    conn.commit()
    affected = cursor.rowcount
    conn.close()

    return affected > 0, None

def delete_presence(presence_id):
    """Supprime une présence"""
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute('DELETE FROM presences WHERE id = ?', (presence_id,))

    conn.commit()
    affected = cursor.rowcount
    conn.close()

    return affected > 0

def get_monthly_stats():
    """Récupère les statistiques par mois et par client"""
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute('''
        SELECT
            strftime('%Y-%m', date) as month,
            client,
            duree,
            COUNT(*) as count
        FROM presences
        GROUP BY month, client, duree
        ORDER BY month DESC, client
    ''')

    rows = cursor.fetchall()
    conn.close()

    # Organiser les stats par mois
    stats = {}
    for row in rows:
        month = row['month']
        client = row['client']
        duree = row['duree']
        count = row['count']

        if month not in stats:
            stats[month] = {}

        if client not in stats[month]:
            stats[month][client] = 0.0

        # Calculer les jours
        if duree in ['journee_complete', '1.0']:
            stats[month][client] += count * 1.0
        elif duree in ['demi_journee_matin', 'demi_journee_aprem', '0.5']:
            stats[month][client] += count * 0.5
        else:
            try:
                stats[month][client] += count * float(duree)
            except ValueError:
                stats[month][client] += count * 1.0

    return stats

def get_all_clients():
    """Récupère la liste unique de tous les clients"""
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute('SELECT DISTINCT client FROM presences ORDER BY client')
    rows = cursor.fetchall()
    conn.close()

    return [row['client'] for row in rows]

def get_all_presences_for_backup():
    """Recupere toutes les presences pour sauvegarde (sans filtre)"""
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute('SELECT * FROM presences ORDER BY date, created_at')
    rows = cursor.fetchall()
    conn.close()

    presences = []
    for row in rows:
        presences.append({
            'id': row['id'],
            'date': row['date'],
            'client': row['client'],
            'duree': row['duree'],
            'notes': row['notes'],
            'created_at': row['created_at']
        })

    return presences

def restore_presences(presences, clear_existing=True):
    """Restaure les presences depuis une sauvegarde"""
    conn = get_connection()
    cursor = conn.cursor()

    try:
        if clear_existing:
            cursor.execute('DELETE FROM presences')

        for p in presences:
            cursor.execute('''
                INSERT INTO presences (date, client, duree, notes, created_at)
                VALUES (?, ?, ?, ?, ?)
            ''', (p['date'], p['client'], p['duree'], p.get('notes', ''), p.get('created_at', datetime.now().isoformat())))

        conn.commit()
        conn.close()
        return True, len(presences)
    except Exception as e:
        conn.rollback()
        conn.close()
        return False, str(e)

def delete_all_presences():
    """Supprime toutes les presences de la base de donnees"""
    conn = get_connection()
    cursor = conn.cursor()

    try:
        cursor.execute('SELECT COUNT(*) FROM presences')
        count = cursor.fetchone()[0]

        cursor.execute('DELETE FROM presences')
        conn.commit()
        conn.close()
        return True, count
    except Exception as e:
        conn.rollback()
        conn.close()
        return False, str(e)

# Initialiser la DB au chargement du module
init_db()
