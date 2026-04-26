/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
    './features/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#EEF4FB',
          100: '#D4E3F3',
          200: '#A9C6E8',
          300: '#7DA9DC',
          400: '#528DD1',
          500: '#2E75B6',
          600: '#1F4E79',
          700: '#17395A',
          800: '#0F253B',
          900: '#07121D',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
