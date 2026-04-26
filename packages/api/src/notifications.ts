import { supabase } from './client';

export type NotificationType =
  | 'new_like'
  | 'new_comment'
  | 'new_follower'
  | 'follow_request'
  | 'new_dm'
  | 'league_promotion'
  | 'achievement_unlocked'
  | 'daily_reminder';

export type Notification = {
  id: string;
  user_id: string;
  type: NotificationType;
  payload: Record<string, unknown>;
  read_at: string | null;
  sent_push_at: string | null;
  push_error: string | null;
  created_at: string;
};

export type NotificationPrefs = {
  new_like: boolean;
  new_comment: boolean;
  new_follower: boolean;
  follow_request: boolean;
  new_dm: boolean;
  league_promotion: boolean;
  achievement_unlocked: boolean;
  daily_reminder: boolean;
  quiet_start: string; // "HH:MM"
  quiet_end: string;
};

export const DEFAULT_PREFS: NotificationPrefs = {
  new_like: true,
  new_comment: true,
  new_follower: true,
  follow_request: true,
  new_dm: true,
  league_promotion: true,
  achievement_unlocked: true,
  daily_reminder: false,
  quiet_start: '23:00',
  quiet_end: '08:00',
};

// ── Push tokens ─────────────────────────────────────────────────────────────

export async function registerPushToken(
  token: string,
  platform: 'ios' | 'android' | 'web',
): Promise<void> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) return;
  const { error } = await supabase
    .from('push_tokens')
    .upsert(
      { user_id: userId, token, platform, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,token' },
    );
  if (error) {
    console.warn('[notifications] registerPushToken error', error);
    throw new Error(error.message);
  }
}

export async function removePushToken(token: string): Promise<void> {
  const { error } = await supabase.from('push_tokens').delete().eq('token', token);
  if (error) {
    console.warn('[notifications] removePushToken error', error);
  }
}

// ── Lectura de notificaciones ───────────────────────────────────────────────

export async function fetchMyNotifications(
  opts: { unreadOnly?: boolean; limit?: number } = {},
): Promise<Notification[]> {
  const limit = opts.limit ?? 50;
  let q = supabase
    .from('notifications')
    .select('id, user_id, type, payload, read_at, sent_push_at, push_error, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (opts.unreadOnly) q = q.is('read_at', null);

  const { data, error } = await q;
  if (error) {
    console.warn('[notifications] fetchMyNotifications error', error);
    throw new Error(error.message);
  }
  return (data ?? []) as Notification[];
}

export async function countUnreadNotifications(): Promise<number> {
  const { count, error } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .is('read_at', null);
  if (error) {
    console.warn('[notifications] countUnreadNotifications error', error);
    return 0;
  }
  return count ?? 0;
}

export async function markNotificationRead(id: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', id);
  if (error) {
    console.warn('[notifications] markNotificationRead error', error);
    throw new Error(error.message);
  }
}

export async function markAllNotificationsRead(): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .is('read_at', null);
  if (error) {
    console.warn('[notifications] markAllNotificationsRead error', error);
    throw new Error(error.message);
  }
}

export function subscribeMyNotifications(
  userId: string,
  callback: (n: Notification) => void,
): () => void {
  const channel = supabase
    .channel(`notifications-${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        const row = payload.new as Notification | null;
        if (row) callback(row);
      },
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}

// ── Preferencias y timezone ─────────────────────────────────────────────────

export async function fetchMyPrefs(): Promise<NotificationPrefs> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) return DEFAULT_PREFS;
  const { data, error } = await supabase
    .from('profiles')
    .select('notification_prefs')
    .eq('id', userId)
    .maybeSingle();
  if (error) {
    console.warn('[notifications] fetchMyPrefs error', error);
    return DEFAULT_PREFS;
  }
  return {
    ...DEFAULT_PREFS,
    ...((data?.notification_prefs ?? {}) as Partial<NotificationPrefs>),
  };
}

export async function updateMyPrefs(patch: Partial<NotificationPrefs>): Promise<NotificationPrefs> {
  const current = await fetchMyPrefs();
  const next = { ...current, ...patch };
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) throw new Error('No hay sesión.');
  const { error } = await supabase
    .from('profiles')
    .update({ notification_prefs: next })
    .eq('id', userId);
  if (error) {
    console.warn('[notifications] updateMyPrefs error', error);
    throw new Error(error.message);
  }
  return next;
}

export async function updateMyTimezone(tz: string): Promise<void> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) return;
  const { error } = await supabase
    .from('profiles')
    .update({ timezone: tz })
    .eq('id', userId);
  if (error) {
    console.warn('[notifications] updateMyTimezone error', error);
  }
}

// ── GDPR ────────────────────────────────────────────────────────────────────

export async function deleteMyAccount(): Promise<void> {
  const { error } = await supabase.rpc('delete_user_account');
  if (error) {
    console.warn('[notifications] deleteMyAccount error', error);
    throw new Error(error.message);
  }
}

export async function exportMyData(): Promise<Record<string, unknown>> {
  const { data, error } = await supabase.rpc('export_my_data');
  if (error) {
    console.warn('[notifications] exportMyData error', error);
    throw new Error(error.message);
  }
  return (data ?? {}) as Record<string, unknown>;
}
