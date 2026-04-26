/**
 * Acceso centralizado a variables EXPO_PUBLIC_*. Metro inlinea estas vars
 * en build, así que `process.env.EXPO_PUBLIC_X` está disponible en cliente
 * (web + nativo) tras `expo export` o `eas build`. Las variables sin prefijo
 * EXPO_PUBLIC_ NO llegan al cliente: son solo para Edge Functions y scripts.
 *
 * Las claves obligatorias hacen throw al primer acceso si faltan; las
 * opcionales devuelven '' y el caller decide qué hacer.
 */

function required(key: string, value: string | undefined): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(
      `Missing required env: ${key}. Configure it in .env.local for dev, ` +
      `or via "eas secret:create" for builds.`,
    );
  }
  return value;
}

function optional(value: string | undefined): string {
  return typeof value === 'string' ? value : '';
}

export const ENV = {
  SUPABASE_URL:      required('EXPO_PUBLIC_SUPABASE_URL', process.env.EXPO_PUBLIC_SUPABASE_URL),
  SUPABASE_ANON_KEY: required('EXPO_PUBLIC_SUPABASE_ANON_KEY', process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY),
  SENTRY_DSN:        optional(process.env.EXPO_PUBLIC_SENTRY_DSN),
  POSTHOG_KEY:       optional(process.env.EXPO_PUBLIC_POSTHOG_KEY),
  POSTHOG_HOST:      optional(process.env.EXPO_PUBLIC_POSTHOG_HOST),
};
