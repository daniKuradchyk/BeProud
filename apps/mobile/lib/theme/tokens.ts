/**
 * Tokens del design system BeProud (Fase 17). Espejo en TS de los valores
 * declarados en tailwind.config.js. Úsalos cuando necesites un valor numérico
 * o un color hex en JS (ej. props de SVG, valores animados de Reanimated).
 *
 * Para estilos en JSX, prefiere las clases NativeWind (`bg-bp-500`, etc.)
 * en vez de leer estos tokens — mantiene los estilos cerca del markup.
 */

export const COLORS = {
  bp: {
    50:  '#EFEBFA',
    100: '#D9D0F1',
    200: '#B5A6E0',
    300: '#9080CC',
    400: '#6F5BB7',
    500: '#5B45A3',
    600: '#4A378A',
    700: '#3A2B6E',
    800: '#291F50',
    900: '#1B1438',
  },
  surface: {
    0: '#0B0B16',
    1: '#13131F',
    2: '#1A1A2A',
    3: '#22223A',
  },
  ink: {
    0: '#FFFFFF',
    1: '#F5F5FA',
    2: '#B8B8C8',
    3: '#7A7A8C',
    4: '#4A4A5C',
  },
  amber:   { 400: '#FFB547', 500: '#F59A1F' },
  emerald: { 400: '#10D9A0', 500: '#0BB587' },
  coral:   { 400: '#FF7A7A', 500: '#F25656' },
} as const;

export const RADIUS = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
  '2xl': 36,
  pill: 9999,
} as const;

export const SPACING = {
  TAP_MIN: 44,
  GUTTER: 16,
} as const;
