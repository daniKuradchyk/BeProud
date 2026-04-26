import { supabase } from './client';

const PLACEHOLDER_USERNAME_REGEX = /^user_[0-9a-f]{8}$/;

export type Profile = {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  is_private: boolean;
  total_points: number;
  streak_current: number;
  streak_best: number;
  level: number;
  created_at: string;
  updated_at: string;
  // Fase 11A — biometría opcional.
  birth_date:     string | null;
  biological_sex: 'male' | 'female' | 'other' | null;
  height_cm:      number | null;
  weight_kg:      number | null;
  primary_goal:   'lose_weight' | 'gain_muscle' | 'maintain' | 'performance' | 'general_health' | null;
  weekly_days:    number | null;
  daily_minutes:  number | null;
  equipment:      string[];
  restrictions:   string[];
};

export type BiometricsPatch = Partial<{
  birth_date:     string | null;
  biological_sex: 'male' | 'female' | 'other' | null;
  height_cm:      number | null;
  weight_kg:      number | null;
  primary_goal:   'lose_weight' | 'gain_muscle' | 'maintain' | 'performance' | 'general_health' | null;
  weekly_days:    number | null;
  daily_minutes:  number | null;
  equipment:      string[];
  restrictions:   string[];
}>;

/**
 * Upsert de campos biométricos del propio user. Se puede llamar al final del
 * wizard (con todos los campos) o desde Ajustes → Biometría (parcial).
 */
export async function updateBiometrics(patch: BiometricsPatch): Promise<Profile> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) throw new Error('Necesitas iniciar sesión.');

  const { data, error } = await supabase
    .from('profiles')
    .update(patch)
    .eq('id', userId)
    .select()
    .single();
  if (error) {
    console.warn('[profile] updateBiometrics error', error);
    throw new Error(error.message);
  }
  return data as Profile;
}

export async function fetchMyProfile(): Promise<Profile | null> {
  // La policy "select public fields" deja leer todos los profiles a cualquier
  // authenticated, así que filtramos explícitamente por auth.uid() para no
  // depender del azar de tener una sola fila en BBDD.
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  return (data as Profile | null) ?? null;
}

export async function setUsername(
  username: string,
  displayName: string,
): Promise<Profile> {
  if (PLACEHOLDER_USERNAME_REGEX.test(username)) {
    throw new Error('Ese username esta reservado.');
  }

  const { data, error } = await supabase
    .rpc('set_username', {
      new_username: username,
      new_display: displayName,
    })
    .single();
  if (error) {
    if (error.code === '23505') throw new Error('Ese username ya está en uso.');
    if (error.code === '22023') throw new Error('Username inválido. Solo minúsculas, números y guiones bajos (3-24 chars).');
    if (error.code === '42501') throw new Error('Necesitas iniciar sesión.');
    throw new Error(error.message);
  }
  return data as Profile;
}

export async function updateProfile(
  patch: Partial<Pick<Profile, 'display_name' | 'bio' | 'avatar_url' | 'is_private'>>,
): Promise<Profile> {
  // Filtramos por auth.uid() explícitamente: Postgres rechaza UPDATEs sin
  // WHERE (safe-update mode) aunque la RLS limite a la fila propia.
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) throw new Error('Necesitas iniciar sesión.');

  const { data, error } = await supabase
    .from('profiles')
    .update(patch)
    .eq('id', userId)
    .select()
    .single();
  if (error) throw error;
  return data as Profile;
}

/** El perfil necesita onboarding mientras el username sea el placeholder user_xxxx. */
export function needsOnboarding(profile: Profile | null): boolean {
  if (!profile) return true;
  return PLACEHOLDER_USERNAME_REGEX.test(profile.username);
}

/** Profile + counts + follow_status del caller. Para la pantalla /user/[username]. */
export type PublicProfile = Profile & {
  followers_count: number;
  following_count: number;
  posts_count: number;
  follow_status: 'pending' | 'accepted' | null;
  is_self: boolean;
};

/**
 * Carga un perfil por username con contadores y la relación con el caller.
 * Los counts son los visibles para el caller (las RLS de follows/posts
 * filtran las pending y los posts ocultos).
 */
export async function fetchProfileByUsername(
  username: string,
): Promise<PublicProfile | null> {
  const { data: userData } = await supabase.auth.getUser();
  const callerId = userData.user?.id ?? null;

  const { data: prof, error: profErr } = await supabase
    .from('profiles')
    .select('*')
    .eq('username', username)
    .maybeSingle();
  if (profErr) throw profErr;
  if (!prof) return null;
  const profile = prof as Profile;

  const [
    { count: followersCount },
    { count: followingCount },
    { count: postsCount },
    { data: myFollow },
  ] = await Promise.all([
    supabase
      .from('follows')
      .select('follower_id', { count: 'exact', head: true })
      .eq('followed_id', profile.id)
      .eq('status', 'accepted'),
    supabase
      .from('follows')
      .select('followed_id', { count: 'exact', head: true })
      .eq('follower_id', profile.id)
      .eq('status', 'accepted'),
    supabase
      .from('posts')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', profile.id),
    callerId && callerId !== profile.id
      ? supabase
          .from('follows')
          .select('status')
          .eq('follower_id', callerId)
          .eq('followed_id', profile.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  return {
    ...profile,
    followers_count: followersCount ?? 0,
    following_count: followingCount ?? 0,
    posts_count: postsCount ?? 0,
    follow_status:
      (myFollow as { status: 'pending' | 'accepted' } | null)?.status ?? null,
    is_self: callerId === profile.id,
  };
}
