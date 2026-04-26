import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Metro inlinea EXPO_PUBLIC_* en build time. Si faltan al ejecutar, fail-fast:
// es preferible un crash claro al boot que llamadas misteriosas a Supabase con
// claves vacías.
const SUPABASE_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    '[@beproud/api] Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY. ' +
      'Configure them in .env.local for dev or via "eas secret:create" for builds.',
  );
}

export const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
