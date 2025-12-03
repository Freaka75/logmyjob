#!/usr/bin/env python3
"""
Générateur d'icônes simples pour la PWA
"""

from PIL import Image, ImageDraw, ImageFont
import os

# Couleur de fond (bleu principal de l'app)
BG_COLOR = (37, 99, 235)  # #2563eb
TEXT_COLOR = (255, 255, 255)  # blanc

# Tailles d'icônes à générer
SIZES = [72, 96, 128, 144, 152, 192, 384, 512]

def create_icon(size):
    """Crée une icône carrée simple avec la lettre 'P' pour Présence"""
    # Créer l'image
    img = Image.new('RGB', (size, size), BG_COLOR)
    draw = ImageDraw.Draw(img)

    # Calculer la taille de la police (environ 60% de la taille de l'icône)
    font_size = int(size * 0.6)

    # Utiliser une police par défaut
    try:
        # Essayer d'utiliser une police système
        font = ImageFont.truetype("arial.ttf", font_size)
    except:
        # Si pas disponible, utiliser la police par défaut
        font = ImageFont.load_default()

    # Texte à afficher
    text = "P"

    # Obtenir la taille du texte
    bbox = draw.textbbox((0, 0), text, font=font)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]

    # Centrer le texte
    x = (size - text_width) // 2
    y = (size - text_height) // 2 - bbox[1]

    # Dessiner le texte
    draw.text((x, y), text, fill=TEXT_COLOR, font=font)

    return img

def main():
    # Créer le dossier icons s'il n'existe pas
    icons_dir = os.path.join(os.path.dirname(__file__), 'icons')
    os.makedirs(icons_dir, exist_ok=True)

    print("Génération des icônes PWA...")

    for size in SIZES:
        icon_path = os.path.join(icons_dir, f'icon-{size}x{size}.png')
        icon = create_icon(size)
        icon.save(icon_path, 'PNG')
        print(f"[OK] Cree: icon-{size}x{size}.png")

    print(f"\nToutes les icones ont ete generees dans: {icons_dir}")

if __name__ == '__main__':
    main()
