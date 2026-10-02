/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        marble: {
          cream: '#FAF7F2',
          light: '#F4EEE5',
          border: '#E6DFD5',
          navy: '#162347',
          darkNavy: '#0F1830',
          powderBlue: '#BED6EE',
          skyBlue: '#D5E5F5',
          gold: '#C5A880'
        }
      },
      fontFamily: {
        sans: ['Montserrat', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        script: ['Cambria', 'Cambria Math', 'Georgia', 'Times New Roman', 'serif'],
        iconic: ['Cambria', 'Cambria Math', 'Georgia', 'Times New Roman', 'serif'],
        display: ['Cambria', 'Georgia', 'serif'],
        curve: ['Alex Brush', 'cursive'],
        editorial: ['Cinzel', 'Playfair Display', 'Cormorant Garamond', 'Georgia', 'serif'],
        cormorant: ['Cormorant Garamond', 'Georgia', 'serif'],
        mono: ['JetBrains Mono', 'monospace'],
        comic: ['"Comic Sans MS"', '"Comic Neue"', 'cursive', 'sans-serif'],
        story: ['"Comic Sans MS"', '"Comic Neue"', 'cursive', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
