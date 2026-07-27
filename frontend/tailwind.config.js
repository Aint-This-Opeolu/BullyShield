/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Lexend', 'system-ui', 'sans-serif'],
      },
      colors: {
        brand: {
          50: '#eef4ff',
          100: '#dbe6fe',
          200: '#bfd3fe',
          300: '#93b5fd',
          400: '#608dfa',
          500: '#3b66f5',
          600: '#2547ea',
          700: '#1e37d6',
          800: '#202fad',
          900: '#202c88',
        },
      },
    },
  },
  plugins: [],
};
