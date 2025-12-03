from flask import Flask, request, jsonify, send_from_directory, send_file
from flask_cors import CORS
import database as db
import os

# Chemin vers le dossier frontend
FRONTEND_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'frontend')

app = Flask(__name__, static_folder=FRONTEND_DIR)
CORS(app)  # Active CORS pour le développement

# ============ ROUTES FRONTEND ============

@app.route('/')
def serve_index():
    """Sert la page principale"""
    return send_from_directory(FRONTEND_DIR, 'index.html')

@app.route('/index.html')
def serve_index_html():
    """Sert la page principale (alias)"""
    return send_from_directory(FRONTEND_DIR, 'index.html')

@app.route('/manifest.json')
def serve_manifest():
    """Sert le manifest PWA"""
    return send_from_directory(FRONTEND_DIR, 'manifest.json')

@app.route('/sw.js')
def serve_sw():
    """Sert le Service Worker"""
    response = send_from_directory(FRONTEND_DIR, 'sw.js')
    response.headers['Service-Worker-Allowed'] = '/'
    return response

@app.route('/css/<path:filename>')
def serve_css(filename):
    """Sert les fichiers CSS"""
    return send_from_directory(os.path.join(FRONTEND_DIR, 'css'), filename)

@app.route('/js/<path:filename>')
def serve_js(filename):
    """Sert les fichiers JavaScript"""
    return send_from_directory(os.path.join(FRONTEND_DIR, 'js'), filename)

@app.route('/icons/<path:filename>')
def serve_icons(filename):
    """Sert les icones"""
    return send_from_directory(os.path.join(FRONTEND_DIR, 'icons'), filename)

# ============ ROUTES API ============

@app.route('/api/health', methods=['GET'])
def health():
    """Endpoint de santé"""
    return jsonify({'status': 'ok'}), 200

@app.route('/api/days', methods=['POST'])
def create_day():
    """Crée un nouveau jour de présence"""
    data = request.get_json()

    # Validation des champs requis
    if not data or 'date' not in data or 'client' not in data or 'duree' not in data:
        return jsonify({'error': 'Champs requis manquants: date, client, duree'}), 400

    date = data['date']
    client = data['client']
    duree = data['duree']
    notes = data.get('notes', '')

    # Validation basique
    if not client.strip():
        return jsonify({'error': 'Le nom du client ne peut pas être vide'}), 400

    presence_id, error = db.create_presence(date, client, duree, notes)

    if error:
        return jsonify({'error': error}), 400

    return jsonify({
        'id': presence_id,
        'message': 'Jour créé avec succès'
    }), 201

@app.route('/api/days', methods=['GET'])
def get_days():
    """Récupère tous les jours avec filtres optionnels"""
    month = request.args.get('month')  # Format: YYYY-MM
    client = request.args.get('client')

    presences = db.get_all_presences(month=month, client=client)

    return jsonify({
        'count': len(presences),
        'presences': presences
    }), 200

@app.route('/api/days/<int:presence_id>', methods=['GET'])
def get_day(presence_id):
    """Récupère un jour spécifique"""
    presence = db.get_presence_by_id(presence_id)

    if not presence:
        return jsonify({'error': 'Jour non trouvé'}), 404

    return jsonify(presence), 200

@app.route('/api/days/<int:presence_id>', methods=['PUT'])
def update_day(presence_id):
    """Met à jour un jour de présence"""
    data = request.get_json()

    if not data or 'date' not in data or 'client' not in data or 'duree' not in data:
        return jsonify({'error': 'Champs requis manquants: date, client, duree'}), 400

    date = data['date']
    client = data['client']
    duree = data['duree']
    notes = data.get('notes', '')

    if not client.strip():
        return jsonify({'error': 'Le nom du client ne peut pas être vide'}), 400

    success, error = db.update_presence(presence_id, date, client, duree, notes)

    if error:
        return jsonify({'error': error}), 400

    if not success:
        return jsonify({'error': 'Jour non trouvé'}), 404

    return jsonify({'message': 'Jour mis à jour avec succès'}), 200

@app.route('/api/days/<int:presence_id>', methods=['DELETE'])
def delete_day(presence_id):
    """Supprime un jour de présence"""
    success = db.delete_presence(presence_id)

    if not success:
        return jsonify({'error': 'Jour non trouvé'}), 404

    return jsonify({'message': 'Jour supprimé avec succès'}), 200

@app.route('/api/stats/monthly', methods=['GET'])
def monthly_stats():
    """Récupère les statistiques mensuelles par client"""
    stats = db.get_monthly_stats()

    # Calculer les totaux par mois
    monthly_totals = {}
    for month, clients in stats.items():
        monthly_totals[month] = {
            'clients': clients,
            'total': sum(clients.values())
        }

    return jsonify(monthly_totals), 200

@app.route('/api/clients', methods=['GET'])
def get_clients():
    """Récupère la liste de tous les clients"""
    clients = db.get_all_clients()

    return jsonify({
        'count': len(clients),
        'clients': clients
    }), 200

@app.route('/api/backup', methods=['GET'])
def backup_data():
    """Exporte toutes les presences pour sauvegarde"""
    presences = db.get_all_presences_for_backup()
    return jsonify({
        'version': '1.0',
        'export_date': __import__('datetime').datetime.now().isoformat(),
        'presences_count': len(presences),
        'presences': presences
    }), 200

@app.route('/api/restore', methods=['POST'])
def restore_data():
    """Restaure les presences depuis une sauvegarde"""
    data = request.get_json()

    if not data or 'presences' not in data:
        return jsonify({'error': 'Format de sauvegarde invalide'}), 400

    presences = data['presences']
    clear_existing = data.get('clear_existing', True)

    success, result = db.restore_presences(presences, clear_existing)

    if success:
        return jsonify({
            'message': 'Restauration reussie',
            'presences_restored': result
        }), 200
    else:
        return jsonify({'error': f'Erreur de restauration: {result}'}), 500

@app.route('/api/reset', methods=['POST'])
def reset_all_data():
    """Supprime toutes les presences de la base de donnees"""
    try:
        success, count = db.delete_all_presences()
        if success:
            return jsonify({
                'message': 'Reinitialisation reussie',
                'deleted_count': count
            }), 200
        else:
            return jsonify({'error': 'Erreur lors de la reinitialisation'}), 500
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Endpoint non trouve'}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({'error': 'Erreur interne du serveur'}), 500

if __name__ == '__main__':
    print("Serveur Flask demarre sur http://localhost:5000")
    print("API disponible a http://localhost:5000/api/")
    app.run(debug=True, host='0.0.0.0', port=5000)
