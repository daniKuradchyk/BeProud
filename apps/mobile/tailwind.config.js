/** @type {import('tailwindcss').Config} */

// Paleta BeProud (Fase 17). Definida una sola vez y reutilizada como `bp` y
// `brand` para retrocompatibilidad: durante la transición visual, las
// pantallas que aún usan clases brand-* heredan la nueva identidad violet
// sin tener que migrar imports masivamente.
//
// Tras feedback inicial: bajada de saturación frente al violet chillón
// (#6B3BF5). El nuevo tono sigue siendo distintivo pero más sobrio en
// superficies grandes y menos cansado en sesiones largas.
const bp = {
  50:  '#EFEBFA',
  100: '#D9D0F1',
  200: '#B5A6E0',
  300: '#9080CC',
  400: '#6F5BB7',
  500: '#5B45A3',  // base
  600: '#4A378A',
  700: '#3A2B6E',
  800: '#291F50',
  900: '#1B1438',
};

const surface = {
  0: '#0B0B16',
  1: '#13131F',
  2: '#1A1A2A',
  3: '#22223A',
};

const ink = {
  0: '#FFFFFF',
  1: '#F5F5FA',
  2: '#B8B8C8',
  3: '#7A7A8C',
  4: '#4A4A5C',
};

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
        bp,
        // Alias `brand` apunta a la misma paleta para no romper imports
        // brand-* existentes durante la transición visual.
        brand: bp,
        surface,
        ink,
        amber: {
          400: '#FFB547',
          500: '#F59A1F',
        },
        emerald: {
          400: '#10D9A0',
          500: '#0BB587',
        },
        coral: {
          400: '#FF7A7A',
          500: '#F25656',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      fontSize: {
        'display-xl': ['44px', { lineHeight: '48px', letterSpacing: '-0.02em', fontWeight: '800' }],
        'display':    ['32px', { lineHeight: '36px', letterSpacing: '-0.02em', fontWeight: '800' }],
        'heading':    ['24px', { lineHeight: '30px', fontWeight: '700' }],
        'subheading': ['20px', { lineHeight: '26px', fontWeight: '700' }],
        'body-lg':    ['17px', { lineHeight: '24px', fontWeight: '500' }],
        'body':       ['15px', { lineHeight: '22px', fontWeight: '500' }],
        'caption':    ['13px', { lineHeight: '18px', fontWeight: '500' }],
        'overline':   ['11px', { lineHeight: '14px', fontWeight: '700', letterSpacing: '0.08em' }],
      },
      spacing: {
        'tap-min': '44px',
        'gutter':  '16px',
      },
      borderRadius: {
        'xs':   '6px',
        'sm':   '10px',
        'md':   '14px',
        'lg':   '20px',
        'xl':   '28px',
        '2xl':  '36px',
        'pill': '9999px',
      },
      boxShadow: {
        'glow-bp': '0 0 0 1px rgba(91,69,163,0.4), 0 8px 24px -4px rgba(91,69,163,0.35)',
        'lift-1':  '0 1px 2px rgba(0,0,0,0.4)',
        'lift-2':  '0 4px 12px rgba(0,0,0,0.5)',
      },
    },
  },
  plugins: [],
};
