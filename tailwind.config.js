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
        chess: {
          light:      '#eeeed2',
          dark:       '#769656',
          highlight:  '#f6f669',
          brilliant:  '#1BACA6',
          great:      '#5C8BB0',
          best:       '#96BC4B',
          excellent:  '#96BC4B',
          good:       '#7CB342',
          inaccuracy: '#F0C45D',
          miss:       '#F0A030',
          mistake:    '#E07832',
          blunder:    '#C93832',
          book:       '#9B59B6',
        },
      },
    },
  },
  plugins: [],
};
