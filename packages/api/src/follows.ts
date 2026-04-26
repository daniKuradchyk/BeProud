import { supabase } from './client';

export type FollowStatus = 'pending' | 'accepted' | null;

export type ProfileSearchResult = {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  is_private: boolean;
  total_points: number;
  follow_status: FollowStatus;
};

export type FollowEdge = {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  is_private: boolean;
  follow_status: FollowStatus;
  created_at: string;
};

export type PendingFollowRequest = {
  follower_id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  created_at: string;
};

// ── Búsqueda ────────────────────────────────────────────────────────────────

export async function searchProfiles(
  q: string,
): Promise<ProfileSearchResult[]> {
  const trimmed = q.trim();
  if (trimmed.length === 0) return [];

  const { data, error } = await supabase.rpc('search_profiles', { q: trimmed });
  if (error) {
    console.warn('[search] searchProfiles error', error);
    throw new Error(error.message);
  }
  return (data ?? []) as ProfileSearchResult[];
}

/**
 * Sugerencias de usuarios para la pantalla Buscar cuando la query está vacía:
 * top 10 por total_points, excluyendo al caller, a quien ya sigue y a los
 * bloqueos bidireccionales.
 */
export async function fetchSuggestions(): Promise<ProfileSearchResult[]> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) return [];

  // 1) profiles top por puntos.
  const { data: profiles, error: profilesErr } = await supabase
    .from('profiles')
    .select('id, username, display_name, avatar_url, is_private, total_points')
    .neq('id', userId)
    .order('total_points', { ascending: false })
    .limit(40);
  if (profilesErr) throw profilesErr;
  const all = (profiles ?? []) as Array<{
    id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
    is_private: boolean;
    total_points: number;
  }>;

  // 2) los que ya sigo (cualquier status) y los bloqueos bidireccionales.
  const [{ data: follows }, { data: blocksOut }, { data: blocksIn }] =
    await Promise.all([
      supabase.from('follows').select('followed_id, status').eq('follower_id', userId),
      supabase.from('blocks').select('blocked_id').eq('blocker_id', userId),
      supabase.from('blocks').select('blocker_id').eq('blocked_id', userId),
    ]);

  const followMap = new Map<string, FollowStatus>();
  for (const f of (follows ?? []) as Array<{
    followed_id: string;
    status: FollowStatus;
  }>) {
    followMap.set(f.followed_id, f.status);
  }
  const blocked = new Set<string>([
    ...((blocksOut ?? []) as Array<{ blocked_id: string }>).map((b) => b.blocked_id),
    ...((blocksIn ?? []) as Array<{ blocker_id: string }>).map((b) => b.blocker_id),
  ]);

  return all
    .filter((p) => !followMap.has(p.id) && !blocked.has(p.id))
    .slice(0, 10)
    .map<ProfileSearchResult>((p) => ({
      ...p,
      follow_status: null,
    }));
}

// ── Mutaciones ──────────────────────────────────────────────────────────────

export async function toggleFollow(
  followedId: string,
): Promise<{ action: 'inserted' | 'deleted'; status: FollowStatus }> {
  const { data, error } = await supabase.rpc('toggle_follow', {
    p_followed_id: followedId,
  });
  if (error) {
    console.warn('[follows] toggleFollow error', error);
    throw new Error(error.message);
  }
  const result = data as {
    action: 'inserted' | 'deleted';
    status: FollowStatus;
  };
  return result;
}

export async function respondFollowRequest(
  followerId: string,
  accept: boolean,
): Promise<void> {
  const { error } = await supabase.rpc('respond_follow_request', {
    p_follower_id: followerId,
    p_accept: accept,
  });
  if (error) {
    console.warn('[follows] respondFollowRequest error', error);
    throw new Error(error.message);
  }
}

// ── Lecturas ────────────────────────────────────────────────────────────────

export async function fetchPendingCount(): Promise<number> {
  const { data, error } = await supabase.rpc('count_pending_follow_requests');
  if (error) {
    console.warn('[follows] fetchPendingCount error', error);
    return 0;
  }
  return typeof data === 'number' ? data : 0;
}

export async function fetchPendingFollowRequests(): Promise<
  PendingFollowRequest[]
> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) return [];

  const { data, error } = await supabase
    .from('follows')
    .select(
      'follower_id, created_at, ' +
        'follower:profiles!follows_follower_id_profiles_fkey(username, display_name, avatar_url)',
    )
    .eq('followed_id', userId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });
  if (error) throw error;

  type Row = {
    follower_id: string;
    created_at: string;
    follower: {
      username: string;
      display_name: string;
      avatar_url: string | null;
    } | null;
  };
  const rows = (data ?? []) as unknown as Row[];
  return rows.map((r) => ({
    follower_id: r.follower_id,
    username: r.follower?.username ?? 'usuario',
    display_name: r.follower?.display_name ?? 'Usuario',
    avatar_url: r.follower?.avatar_url ?? null,
    created_at: r.created_at,
  }));
}

/**
 * Personas que siguen a `userId`. Solo trae accepted (la RLS oculta los
 * pending al resto del mundo). Hidrata follow_status del caller sobre cada uno.
 */
export async function fetchMyFollowers(userId: string): Promise<FollowEdge[]> {
  const { data, error } = await supabase
    .from('follows')
    .select(
      'follower_id, created_at, ' +
        'follower:profiles!follows_follower_id_profiles_fkey(id, username, display_name, avatar_url, is_private)',
    )
    .eq('followed_id', userId)
    .eq('status', 'accepted')
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw error;

  type Row = {
    follower_id: string;
    created_at: string;
    follower: {
      id: string;
      username: string;
      display_name: string;
      avatar_url: string | null;
      is_private: boolean;
    } | null;
  };
  const rows = (data ?? []) as unknown as Row[];
  const ids = rows.map((r) => r.follower_id);
  const myFollows = await fetchMyFollowStatusFor(ids);

  return rows
    .filter((r) => r.follower)
    .map<FollowEdge>((r) => ({
      id: r.follower!.id,
      username: r.follower!.username,
      display_name: r.follower!.display_name,
      avatar_url: r.follower!.avatar_url,
      is_private: r.follower!.is_private,
      follow_status: myFollows.get(r.follower!.id) ?? null,
      created_at: r.created_at,
    }));
}

export async function fetchMyFollowing(userId: string): Promise<FollowEdge[]> {
  const { data, error } = await supabase
    .from('follows')
    .select(
      'followed_id, created_at, ' +
        'followed:profiles!follows_followed_id_profiles_fkey(id, username, display_name, avatar_url, is_private)',
    )
    .eq('follower_id', userId)
    .eq('status', 'accepted')
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw error;

  type Row = {
    followed_id: string;
    created_at: string;
    followed: {
      id: string;
      username: string;
      display_name: string;
      avatar_url: string | null;
      is_private: boolean;
    } | null;
  };
  const rows = (data ?? []) as unknown as Row[];
  const ids = rows.map((r) => r.followed_id);
  const myFollows = await fetchMyFollowStatusFor(ids);

  return rows
    .filter((r) => r.followed)
    .map<FollowEdge>((r) => ({
      id: r.followed!.id,
      username: r.followed!.username,
      display_name: r.followed!.display_name,
      avatar_url: r.followed!.avatar_url,
      is_private: r.followed!.is_private,
      follow_status: myFollows.get(r.followed!.id) ?? null,
      created_at: r.created_at,
    }));
}

// ── helpers internos ────────────────────────────────────────────────────────

async function fetchMyFollowStatusFor(
  ids: string[],
): Promise<Map<string, FollowStatus>> {
  if (ids.length === 0) return new Map();
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) return new Map();

  const { data, error } = await supabase
    .from('follows')
    .select('followed_id, status')
    .eq('follower_id', userId)
    .in('followed_id', ids);
  if (error) {
    console.warn('[follows] fetchMyFollowStatusFor error', error);
    return new Map();
  }
  const map = new Map<string, FollowStatus>();
  for (const r of (data ?? []) as Array<{
    followed_id: string;
    status: FollowStatus;
  }>) {
    map.set(r.followed_id, r.status);
  }
  return map;
}
