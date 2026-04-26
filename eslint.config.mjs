// BeProud · ESLint flat config (v9). Cubre todo el monorepo.
// Mínimo viable: reglas recomendadas de @eslint/js + typescript-eslint.
// Si más adelante queremos reglas específicas de React/RN, se añaden plugins aquí.

import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';

export default [
  {
    // Ignores globales — bundles, builds, configs JS de Expo/Metro/Babel
    // y los placeholders de tipos generados.
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.expo/**',
      '**/build/**',
      '**/coverage/**',
      '**/expo-env.d.ts',
      '**/database.types.ts',
      'apps/mobile/babel.config.js',
      'apps/mobile/metro.config.js',
      'apps/mobile/tailwind.config.js',
      'apps/mobile/app.config.ts',
    ],
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  {
    // En todos los .ts/.tsx del repo: parser de TS, JSX activado y globals
    // de browser+node (porque el cliente Supabase y validation se usan en
    // ambos entornos).
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    rules: {
      // RN/Expo y los tipos de Supabase usan a veces "_var" y firmas con
      // argumentos no usados; relajamos solo eso para no ahogar señal.
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
];
