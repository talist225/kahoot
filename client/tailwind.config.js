/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        kahoot: {
          purple: '#46178F',
          'purple-light': '#864CBF',
          red: '#E21B3C',
          blue: '#1368CE',
          yellow: '#D89E00',
          green: '#26890C',
        },
      },
      fontFamily: {
        sans: ['Rubik', 'Segoe UI', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
