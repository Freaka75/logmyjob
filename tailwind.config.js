// Genere frontend/css/tailwind.css (fichier commite, pas d'etape de build au deploiement).
// Apres modification des classes dans frontend/ :
//   npx tailwindcss@3 -c tailwind.config.js -i tailwind.input.css -o frontend/css/tailwind.css --minify
const colors = require('tailwindcss/colors');

module.exports = {
  content: ['./frontend/**/*.{html,js}'],
  theme: {
    extend: {
      colors: {
        primary: '#4f46e5',
        // Palette de l'application : "blue" = indigo, "gray" = ardoise.
        blue: colors.indigo,
        gray: colors.slate
      }
    }
  },
  plugins: []
};
