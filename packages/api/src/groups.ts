import { supabase } from './client';

export type GroupRole = 'owner' | 'admin' | 'member';

export type Group = {
  id: string;
  owner_id: string;
  name: string;
  description: string | null;
  cover_url: string | null;
  is_private: boolean;
  invite_code: string;
  created_at: string;
  updated_at: string;
};

export type GroupWithCounts = Group & {
  member_count: number;
  my_role: GroupRole | null;
};

export type GroupMember = {
  group_id: string;
  user_id: string;
  role: GroupRole;
  joined_at: string;
  profile: {
    username: string;
    display_name: string;
    avatar_url: string | null;
  } | null;
};

export type GroupLeaderboardEntry = {
  user_id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  points: number;
  rank: number;
};

export type GroupPreview = {
  id: string;
  name: string;
  description: string | null;
  cover_url: string | null;
  is_private: boolean;
  member_count: number;
  owner_username: string;
};

const COVER_BUCKET = 'group-covers';

// ── Lecturas ────────────────────────────────────────────────────────────────

export async function fetchMyGroups(): Promise<GroupWithCounts[]> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) return [];

  // 1) Mis membresías con el grupo embebido + el role.
  const { data, error } = await supabase
    .from('group_members')
    .select('role, group:groups(*)')
    .eq('user_id', userId);
  if (error) {
    console.warn('[groups] fetchMyGroups error', error);
    throw new Error(error.message);
  }
  type Row = { role: GroupRole; group: Group | null };
  const rows = (data ?? []) as unknown as Row[];
  const groups = rows.filter((r) => r.group).map((r) => ({ group: r.group!, role: r.role }));
  if (groups.length === 0) return [];

  // 2) Member counts en paralelo (PostgrestBuilder es PromiseLike, no Promise:
  // Promise.all lo resuelve igualmente; controlamos errores en el then).
  const counts = await Promise.all(
    groups.map(async (g) => {
      try {
        const r = await supabase
          .from('group_members')
          .select('user_id', { count: 'exact', head: true })
          .eq('group_id', g.group.id);
        return r.count ?? 0;
      } catch {
        return 0;
      }
    }),
  );

  return groups.map(({ group, role }, i) => ({
    ...group,
    member_count: counts[i] ?? 0,
    my_role: role,
  }));
}

export async function fetchGroupById(
  groupId: string,
): Promise<GroupWithCounts | null> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id ?? null;

  const { data: group, error } = await supabase
    .from('groups')
    .select('*')
    .eq('id', groupId)
    .maybeSingle();
  if (error) throw error;
  if (!group) return null;

  const [{ count }, { data: meRow }] = await Promise.all([
    supabase
      .from('group_members')
      .select('user_id', { count: 'exact', head: true })
      .eq('group_id', groupId),
    userId
      ? supabase
          .from('group_members')
          .select('role')
          .eq('group_id', groupId)
          .eq('user_id', userId)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  return {
    ...(group as Group),
    member_count: count ?? 0,
    my_role: (meRow as { role: GroupRole } | null)?.role ?? null,
  };
}

export async function fetchGroupByCode(code: string): Promise<GroupPreview | null> {
  const { data, error } = await supabase
    .rpc('find_group_by_code', { p_code: code })
    .maybeSingle();
  if (error) {
    console.warn('[groups] fetchGroupByCode error', error);
    throw new Error(error.message);
  }
  return (data as GroupPreview | null) ?? null;
}

export async function fetchGroupMembers(groupId: string): Promise<GroupMember[]> {
  const { data, error } = await supabase
    .from('group_members')
    .select(
      'group_id, user_id, role, joined_at, ' +
        'profile:profiles!group_members_user_id_profiles_fkey(username, display_name, avatar_url)',
    )
    .eq('group_id', groupId)
    .order('role', { ascending: true })
    .order('joined_at', { ascending: true });
  if (error) {
    console.warn('[groups] fetchGroupMembers error', error);
    throw new Error(error.message);
  }
  type Row = Omit<GroupMember, 'profile'> & {
    profile: GroupMember['profile'];
  };
  const rows = (data ?? []) as unknown as Row[];
  // Re-orden manual: owner → admin → member.
  const order: Record<GroupRole, number> = { owner: 0, admin: 1, member: 2 };
  rows.sort(
    (a, b) =>
      order[a.role] - order[b.role] ||
      a.joined_at.localeCompare(b.joined_at),
  );
  return rows;
}

export async function getGroupThreadId(groupId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('threads')
    .select('id')
    .eq('group_id', groupId)
    .eq('type', 'group')
    .maybeSingle();
  if (error) {
    console.warn('[groups] getGroupThreadId error', error);
    return null;
  }
  return (data as { id: string } | null)?.id ?? null;
}

export async function fetchGroupLeaderboard(
  groupId: string,
  period: 'day' | 'week' | 'month',
): Promise<GroupLeaderboardEntry[]> {
  const { data, error } = await supabase.rpc('group_leaderboard', {
    p_group_id: groupId,
    p_period: period,
  });
  if (error) {
    console.warn('[groups] fetchGroupLeaderboard error', error);
    throw new Error(error.message);
  }
  return (data ?? []) as GroupLeaderboardEntry[];
}

// ── Mutaciones ──────────────────────────────────────────────────────────────

export async function createGroup(input: {
  name: string;
  description?: string | null;
  isPrivate?: boolean;
  coverUrl?: string | null;
}): Promise<string> {
  const { data, error } = await supabase.rpc('create_group', {
    p_name: input.name.trim(),
    p_description: input.description?.trim() || null,
    p_cover_url: input.coverUrl ?? null,
    p_is_private: !!input.isPrivate,
  });
  if (error) {
    console.warn('[groups] createGroup error', error);
    throw new Error(error.message);
  }
  if (typeof data !== 'string') {
    throw new Error('Respuesta inesperada del servidor.');
  }
  return data;
}

export async function addMemberToGroup(
  groupId: string,
  userId: string,
): Promise<{ group_id: string; action: 'added' | 'already_member' }> {
  const { data, error } = await supabase.rpc('add_group_member', {
    p_group_id: groupId,
    p_user_id: userId,
  });
  if (error) {
    console.warn('[groups] addMemberToGroup error', error);
    throw new Error(error.message);
  }
  return data as { group_id: string; action: 'added' | 'already_member' };
}

export async function joinGroupByCode(
  code: string,
): Promise<{ group_id: string; action: 'joined' | 'already_member' }> {
  const { data, error } = await supabase.rpc('join_group_by_code', {
    p_code: code.trim(),
  });
  if (error) {
    console.warn('[groups] joinGroupByCode error', error);
    throw new Error(error.message);
  }
  return data as { group_id: string; action: 'joined' | 'already_member' };
}

export async function leaveGroup(groupId: string): Promise<void> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) return;
  const { error } = await supabase
    .from('group_members')
    .delete()
    .eq('group_id', groupId)
    .eq('user_id', userId);
  if (error) throw error;
}

export async function kickMember(
  groupId: string,
  userId: string,
): Promise<void> {
  const { error } = await supabase
    .from('group_members')
    .delete()
    .eq('group_id', groupId)
    .eq('user_id', userId);
  if (error) throw error;
}

export async function updateMemberRole(
  groupId: string,
  userId: string,
  newRole: GroupRole,
): Promise<void> {
  const { error } = await supabase
    .from('group_members')
    .update({ role: newRole })
    .eq('group_id', groupId)
    .eq('user_id', userId);
  if (error) throw error;
}

export async function updateGroup(
  groupId: string,
  patch: Partial<Pick<Group, 'name' | 'description' | 'cover_url' | 'is_private'>>,
): Promise<Group> {
  const { data, error } = await supabase
    .from('groups')
    .update(patch)
    .eq('id', groupId)
    .select()
    .single();
  if (error) throw error;
  return data as Group;
}

export async function regenerateInviteCode(groupId: string): Promise<string> {
  // Forzamos null para que el trigger genere uno nuevo.
  const { data, error } = await supabase
    .from('groups')
    .update({ invite_code: null })
    .eq('id', groupId)
    .select('invite_code')
    .single();
  if (error) throw error;
  return (data as { invite_code: string }).invite_code;
}

export async function deleteGroup(groupId: string): Promise<void> {
  const { error } = await supabase.from('groups').delete().eq('id', groupId);
  if (error) throw error;
}

export async function uploadGroupCover(
  groupId: string,
  fileBlob: Blob,
  ext: string,
): Promise<string> {
  const safeExt = ext.replace(/[^a-z0-9]/gi, '').toLowerCase() || 'jpg';
  const path = `${groupId}/cover.${safeExt}`;
  const { error } = await supabase.storage
    .from(COVER_BUCKET)
    .upload(path, fileBlob, {
      upsert: true,
      contentType: blobMimeForExt(safeExt),
      cacheControl: '3600',
    });
  if (error) {
    console.warn('[groups] uploadGroupCover error', error);
    throw new Error(error.message);
  }
  const { data } = supabase.storage.from(COVER_BUCKET).getPublicUrl(path);
  return `${data.publicUrl}?t=${Date.now()}`;
}

function blobMimeForExt(ext: string): string {
  switch (ext) {
    case 'png':
      return 'image/png';
    case 'webp':
      return 'image/webp';
    case 'jpg':
    case 'jpeg':
    default:
      return 'image/jpeg';
  }
}
