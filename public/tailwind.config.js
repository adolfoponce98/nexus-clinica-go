/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  theme: {
    extend: {
      colors: {
        // Colores personalizados para que coincidan con tu imagen
        zinc: {
          950: '#09090b',
        }
      }
    },
  },
  plugins: [],
}
