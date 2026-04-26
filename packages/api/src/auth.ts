import type { Session, User } from '@supabase/supabase-js';

import { supabase } from './client';

export type AuthResult = { error: string | null };

export async function signInWithPassword(
  email: string,
  password: string,
): Promise<AuthResult> {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  return { error: error ? translateAuthError(error.message) : null };
}

export async function signUpWithPassword(
  email: string,
  password: string,
): Promise<AuthResult> {
  const { error } = await supabase.auth.signUp({ email, password });
  return { error: error ? translateAuthError(error.message) : null };
}

export async function sendPasswordReset(
  email: string,
  redirectTo: string,
): Promise<AuthResult> {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo,
  });
  return { error: error ? translateAuthError(error.message) : null };
}

export async function signOut(): Promise<AuthResult> {
  const { error } = await supabase.auth.signOut();
  return { error: error?.message ?? null };
}

export async function getSession(): Promise<Session | null> {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export function onAuthStateChange(
  cb: (session: Session | null, user: User | null) => void,
) {
  return supabase.auth.onAuthStateChange((_event, session) => {
    cb(session, session?.user ?? null);
  });
}

/** Mensajes Supabase → mensajes en español para mostrar al usuario. */
function translateAuthError(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes('invalid login credentials')) return 'Email o contraseña incorrectos.';
  if (m.includes('user already registered')) return 'Este email ya está registrado.';
  if (m.includes('email not confirmed')) return 'Confirma tu email antes de iniciar sesión.';
  if (m.includes('password should be at least'))
    return 'La contraseña debe tener al menos 6 caracteres.';
  if (m.includes('rate limit')) return 'Demasiados intentos. Espera un minuto e inténtalo otra vez.';
  return msg;
}
