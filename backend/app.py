from flask import Flask, jsonify, send_from_directory
from flask_cors import CORS
import os

# ============ LOG MY JOB - BACKEND SIMPLIFIE ============
# Sert uniquement les fichiers frontend statiques
# Toutes les donnees sont stockees en localStorage cote client

# Chemin vers le dossier frontend
FRONTEND_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'frontend')

app = Flask(__name__, static_folder=FRONTEND_DIR)
CORS(app)

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

# ============ HEALTH CHECK ============

@app.route('/api/health', methods=['GET'])
def health():
    """Endpoint de sante pour Coolify/Docker"""
    return jsonify({'status': 'ok', 'storage': 'localStorage'}), 200

# ============ ERROR HANDLERS ============

@app.errorhandler(404)
def not_found(error):
    """Redirige vers index.html pour le routing SPA"""
    return send_from_directory(FRONTEND_DIR, 'index.html')

@app.errorhandler(500)
def internal_error(error):
    return jsonify({'error': 'Erreur interne du serveur'}), 500

if __name__ == '__main__':
    print("=" * 50)
    print("LOG MY JOB - Serveur demarre")
    print("=" * 50)
    print("URL: http://localhost:5000")
    print("Stockage: localStorage (100% client-side)")
    print("=" * 50)
    app.run(debug=True, host='0.0.0.0', port=5000)
