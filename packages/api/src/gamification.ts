import { supabase } from './client';

// ── Tipos ────────────────────────────────────────────────────────────────────

export type League = {
  id: number;
  slug: string;
  name: string;
  tier: number;
  min_points_week: number;
  max_points_week: number | null;
  icon: string;
  color: string; // hex sin #
};

export type LeaderboardEntry = {
  user_id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  points: number;
  rank: number;
  league_id: number | null;
};

export type AchievementCategory =
  | 'completion'
  | 'streak'
  | 'social'
  | 'points'
  | 'group'
  | 'fasting';

export type Achievement = {
  id: number;
  slug: string;
  title: string;
  description: string;
  icon: string;
  category: AchievementCategory;
  tier: number;
  unlocked_at: string | null;
};

export type WeekHistoryEntry = {
  week: string; // ISO date (yyyy-mm-dd)
  points: number;
  rank: number;
  league: League | null;
};

export type MyLeaguePosition = {
  week: string;
  points: number;
  rank: number;
  league: League | null;
  next_league: League | null;
  prev_league: League | null;
  // Progreso 0..1 dentro de la franja [min, max] de la liga actual.
  progress: number;
};

// ── Helpers internos ─────────────────────────────────────────────────────────

function currentWeekStart(): string {
  // ISO: lunes como inicio de semana, igual que date_trunc('week', current_date) en Postgres.
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  const dow = (d.getUTCDay() + 6) % 7; // 0=lunes
  d.setUTCDate(d.getUTCDate() - dow);
  return d.toISOString().slice(0, 10);
}

function weekStartFromOffset(weekOffset: number): string {
  const start = new Date(currentWeekStart() + 'T00:00:00.000Z');
  start.setUTCDate(start.getUTCDate() - weekOffset * 7);
  return start.toISOString().slice(0, 10);
}

// ── Lecturas ─────────────────────────────────────────────────────────────────

export async function fetchAllLeagues(): Promise<League[]> {
  const { data, error } = await supabase
    .from('leagues')
    .select('id, slug, name, tier, min_points_week, max_points_week, icon, color')
    .order('tier', { ascending: true });
  if (error) {
    console.warn('[gamification] fetchAllLeagues error', error);
    throw new Error(error.message);
  }
  return (data ?? []) as League[];
}

export async function fetchMyLeaguePosition(): Promise<MyLeaguePosition | null> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) return null;

  const week = currentWeekStart();
  const [leaguesRes, entryRes] = await Promise.all([
    fetchAllLeagues(),
    supabase
      .from('weekly_leaderboards')
      .select('week, points, rank, league_id')
      .eq('user_id', userId)
      .eq('week', week)
      .is('group_id', null)
      .maybeSingle(),
  ]);

  if (entryRes.error) {
    console.warn('[gamification] fetchMyLeaguePosition error', entryRes.error);
    throw new Error(entryRes.error.message);
  }

  const leagues = leaguesRes.sort((a, b) => a.tier - b.tier);
  const entry = entryRes.data as
    | { week: string; points: number; rank: number; league_id: number | null }
    | null;

  // Si no tengo entry esta semana, devuelvo posición 0 puntos en bronce.
  const points = entry?.points ?? 0;
  const rank = entry?.rank ?? 0;
  const league =
    leagues.find(
      (l) =>
        points >= l.min_points_week &&
        (l.max_points_week === null || points <= l.max_points_week),
    ) ?? leagues[0] ?? null;

  const tier = league?.tier ?? 1;
  const prev_league = leagues.find((l) => l.tier === tier - 1) ?? null;
  const next_league = leagues.find((l) => l.tier === tier + 1) ?? null;

  let progress = 1;
  if (league) {
    const min = league.min_points_week;
    const max = league.max_points_week ?? min + 100;
    const span = Math.max(max - min, 1);
    progress = Math.max(0, Math.min(1, (points - min) / span));
  }

  return {
    week,
    points,
    rank,
    league,
    prev_league,
    next_league,
    progress,
  };
}

export async function fetchGlobalLeaderboard(
  weekOffset = 0,
  limit = 100,
): Promise<LeaderboardEntry[]> {
  const week = weekStartFromOffset(weekOffset);
  const { data, error } = await supabase
    .from('weekly_leaderboards')
    .select(
      'user_id, points, rank, league_id, ' +
        'profile:profiles!weekly_leaderboards_user_id_fkey(username, display_name, avatar_url)',
    )
    .eq('week', week)
    .is('group_id', null)
    .order('rank', { ascending: true })
    .limit(limit);

  if (error) {
    // El embed via FK específica puede fallar si la FK no está nombrada;
    // en ese caso hacemos fetch en dos pasos.
    if (error.code === 'PGRST200' || /relationship/i.test(error.message)) {
      return await fetchGlobalLeaderboardFallback(week, limit);
    }
    console.warn('[gamification] fetchGlobalLeaderboard error', error);
    throw new Error(error.message);
  }

  type Row = {
    user_id: string;
    points: number;
    rank: number;
    league_id: number | null;
    profile: {
      username: string;
      display_name: string;
      avatar_url: string | null;
    } | null;
  };
  return ((data ?? []) as unknown as Row[]).map((r) => ({
    user_id: r.user_id,
    points: r.points,
    rank: r.rank,
    league_id: r.league_id,
    username: r.profile?.username ?? '',
    display_name: r.profile?.display_name ?? 'Usuario',
    avatar_url: r.profile?.avatar_url ?? null,
  }));
}

async function fetchGlobalLeaderboardFallback(
  week: string,
  limit: number,
): Promise<LeaderboardEntry[]> {
  const { data, error } = await supabase
    .from('weekly_leaderboards')
    .select('user_id, points, rank, league_id')
    .eq('week', week)
    .is('group_id', null)
    .order('rank', { ascending: true })
    .limit(limit);
  if (error) {
    console.warn('[gamification] fetchGlobalLeaderboard fallback error', error);
    throw new Error(error.message);
  }
  const rows = (data ?? []) as Array<{
    user_id: string;
    points: number;
    rank: number;
    league_id: number | null;
  }>;
  if (rows.length === 0) return [];

  const userIds = rows.map((r) => r.user_id);
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, username, display_name, avatar_url')
    .in('id', userIds);

  const byId = new Map<
    string,
    { username: string; display_name: string; avatar_url: string | null }
  >();
  for (const p of (profiles ?? []) as Array<{
    id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
  }>) {
    byId.set(p.id, {
      username: p.username,
      display_name: p.display_name,
      avatar_url: p.avatar_url,
    });
  }

  return rows.map((r) => ({
    user_id: r.user_id,
    points: r.points,
    rank: r.rank,
    league_id: r.league_id,
    username: byId.get(r.user_id)?.username ?? '',
    display_name: byId.get(r.user_id)?.display_name ?? 'Usuario',
    avatar_url: byId.get(r.user_id)?.avatar_url ?? null,
  }));
}

export async function fetchWeekHistory(weeks = 8): Promise<WeekHistoryEntry[]> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) return [];

  const [leagues, entriesRes] = await Promise.all([
    fetchAllLeagues(),
    supabase
      .from('weekly_leaderboards')
      .select('week, points, rank, league_id')
      .eq('user_id', userId)
      .is('group_id', null)
      .order('week', { ascending: false })
      .limit(weeks),
  ]);

  if (entriesRes.error) {
    console.warn('[gamification] fetchWeekHistory error', entriesRes.error);
    throw new Error(entriesRes.error.message);
  }

  const byId = new Map(leagues.map((l) => [l.id, l]));
  return ((entriesRes.data ?? []) as Array<{
    week: string;
    points: number;
    rank: number;
    league_id: number | null;
  }>).map((r) => ({
    week: r.week,
    points: r.points,
    rank: r.rank,
    league: r.league_id ? byId.get(r.league_id) ?? null : null,
  }));
}

export async function fetchAllAchievements(): Promise<Achievement[]> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;

  const [catalogRes, mineRes] = await Promise.all([
    supabase
      .from('achievements')
      .select('id, slug, title, description, icon, category, tier')
      .order('id', { ascending: true }),
    userId
      ? supabase
          .from('user_achievements')
          .select('achievement_id, unlocked_at')
          .eq('user_id', userId)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (catalogRes.error) {
    console.warn('[gamification] fetchAllAchievements catalog error', catalogRes.error);
    throw new Error(catalogRes.error.message);
  }
  if ('error' in mineRes && mineRes.error) {
    console.warn('[gamification] fetchAllAchievements mine error', mineRes.error);
  }

  const unlocked = new Map<number, string>();
  for (const r of ((mineRes as { data: Array<{ achievement_id: number; unlocked_at: string }> })
    .data ?? [])) {
    unlocked.set(r.achievement_id, r.unlocked_at);
  }

  return ((catalogRes.data ?? []) as Array<Omit<Achievement, 'unlocked_at'>>).map((a) => ({
    ...a,
    unlocked_at: unlocked.get(a.id) ?? null,
  }));
}

export async function fetchUserAchievements(userId: string): Promise<Achievement[]> {
  const [catalogRes, theirsRes] = await Promise.all([
    supabase
      .from('achievements')
      .select('id, slug, title, description, icon, category, tier')
      .order('id', { ascending: true }),
    supabase
      .from('user_achievements')
      .select('achievement_id, unlocked_at')
      .eq('user_id', userId),
  ]);

  if (catalogRes.error) {
    console.warn('[gamification] fetchUserAchievements catalog error', catalogRes.error);
    throw new Error(catalogRes.error.message);
  }
  if (theirsRes.error) {
    // RLS bloquea si el perfil es privado o hay block. Devolvemos lista vacía.
    return [];
  }

  const unlocked = new Map<number, string>();
  for (const r of ((theirsRes.data ?? []) as Array<{
    achievement_id: number;
    unlocked_at: string;
  }>)) {
    unlocked.set(r.achievement_id, r.unlocked_at);
  }

  return ((catalogRes.data ?? []) as Array<Omit<Achievement, 'unlocked_at'>>)
    .filter((a) => unlocked.has(a.id))
    .map((a) => ({ ...a, unlocked_at: unlocked.get(a.id) ?? null }));
}

// ── Realtime ────────────────────────────────────────────────────────────────

export function subscribeUserAchievements(
  userId: string,
  callback: (achievementId: number) => void,
): () => void {
  const channel = supabase
    .channel(`user-achievements-${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'user_achievements',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        const row = payload.new as { achievement_id?: number } | null;
        if (row?.achievement_id != null) callback(row.achievement_id);
      },
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}

export function subscribeMyLeagueChange(
  userId: string,
  callback: (leagueId: number | null) => void,
): () => void {
  const channel = supabase
    .channel(`weekly-leaderboards-${userId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'weekly_leaderboards',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        const row = payload.new as
          | { league_id: number | null; group_id: string | null }
          | null;
        if (!row) return;
        // Solo nos interesan filas globales (group_id null) para cambio de liga.
        if (row.group_id !== null) return;
        callback(row.league_id);
      },
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}
