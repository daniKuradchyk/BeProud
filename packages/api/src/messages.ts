import { supabase } from './client';

export type Thread = {
  id: string;
  type: 'dm' | 'group';
  group_id: string | null;
  last_message_at: string | null;
  created_at: string;
};

export type Message = {
  id: string;
  thread_id: string;
  sender_id: string;
  content: string | null;
  media_url: string | null;
  media_signed_url?: string | null;
  created_at: string;
};

export type ThreadOtherUser = {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
};

export type ThreadWithLastMessage = Thread & {
  other_user: ThreadOtherUser | null;
  last_message: Message | null;
  unread: boolean;
};

const BUCKET = 'message-media';

// ── RPCs ────────────────────────────────────────────────────────────────────

export async function getOrCreateDm(otherUserId: string): Promise<string> {
  const { data, error } = await supabase.rpc('get_or_create_dm', {
    p_other_user_id: otherUserId,
  });
  if (error) {
    console.warn('[messages] getOrCreateDm error', error);
    throw new Error(error.message);
  }
  if (typeof data !== 'string') {
    throw new Error('Respuesta inesperada del servidor.');
  }
  return data;
}

export async function markThreadRead(threadId: string): Promise<void> {
  const { error } = await supabase.rpc('mark_thread_read', {
    p_thread_id: threadId,
  });
  if (error) {
    console.warn('[messages] markThreadRead error', error);
  }
}

export async function countUnread(): Promise<number> {
  const { data, error } = await supabase.rpc('count_unread_threads');
  if (error) {
    console.warn('[messages] countUnread error', error);
    return 0;
  }
  return typeof data === 'number' ? data : 0;
}

// ── Lecturas ────────────────────────────────────────────────────────────────

/**
 * Mis threads ordenados por last_message_at desc, hidratados con el otro
 * miembro (para DMs) y el último mensaje. `unread` se calcula comparando
 * `last_message.created_at` con `last_read_at` del caller.
 */
export async function fetchMyThreads(): Promise<ThreadWithLastMessage[]> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) return [];

  // 1) Mis membresías con el last_read_at + el thread.
  const { data: myRows, error: myErr } = await supabase
    .from('thread_members')
    .select('thread_id, last_read_at, thread:threads(id, type, group_id, last_message_at, created_at)')
    .eq('user_id', userId);
  if (myErr) {
    console.warn('[messages] fetchMyThreads myRows error', myErr);
    throw new Error(myErr.message);
  }

  type MyRow = {
    thread_id: string;
    last_read_at: string | null;
    thread: Thread | null;
  };
  const mine = (myRows ?? []) as unknown as MyRow[];
  const threads = mine
    .filter((r) => r.thread)
    .map((r) => ({ thread: r.thread!, last_read_at: r.last_read_at }));
  if (threads.length === 0) return [];

  const threadIds = threads.map((t) => t.thread.id);

  // 2) Para cada thread: el "otro miembro" (si es DM) y el último mensaje.
  const [otherMembersRes, lastMessagesRes] = await Promise.all([
    supabase
      .from('thread_members')
      .select(
        'thread_id, user_id, member:profiles!thread_members_user_id_profiles_fkey(id, username, display_name, avatar_url)',
      )
      .in('thread_id', threadIds)
      .neq('user_id', userId),
    supabase
      .from('messages')
      .select('id, thread_id, sender_id, content, media_url, created_at')
      .in('thread_id', threadIds)
      .order('created_at', { ascending: false }),
  ]);
  if (otherMembersRes.error) {
    console.warn('[messages] fetchMyThreads other members error', otherMembersRes.error);
    throw new Error(otherMembersRes.error.message);
  }
  if (lastMessagesRes.error) {
    console.warn('[messages] fetchMyThreads last messages error', lastMessagesRes.error);
    throw new Error(lastMessagesRes.error.message);
  }

  type OtherRow = {
    thread_id: string;
    user_id: string;
    member: ThreadOtherUser | null;
  };
  const otherByThread = new Map<string, ThreadOtherUser | null>();
  for (const r of (otherMembersRes.data ?? []) as unknown as OtherRow[]) {
    if (!otherByThread.has(r.thread_id) && r.member) {
      otherByThread.set(r.thread_id, r.member);
    }
  }

  const lastByThread = new Map<string, Message>();
  for (const m of (lastMessagesRes.data ?? []) as Message[]) {
    if (!lastByThread.has(m.thread_id)) {
      lastByThread.set(m.thread_id, m);
    }
  }

  const out: ThreadWithLastMessage[] = threads.map(({ thread, last_read_at }) => {
    const lastMessage = lastByThread.get(thread.id) ?? null;
    const unread =
      !!lastMessage &&
      lastMessage.sender_id !== userId &&
      (!last_read_at || lastMessage.created_at > last_read_at);
    return {
      ...thread,
      other_user: otherByThread.get(thread.id) ?? null,
      last_message: lastMessage,
      unread,
    };
  });

  out.sort((a, b) => {
    const ta = a.last_message_at ?? a.created_at;
    const tb = b.last_message_at ?? b.created_at;
    return tb.localeCompare(ta);
  });
  return out;
}

/**
 * Mensajes de un thread paginados por cursor (created_at < cursor).
 * Hidrata `media_signed_url` para los que tienen media_url.
 */
export async function fetchThreadMessages(
  threadId: string,
  opts?: { cursor?: string; limit?: number },
): Promise<{ items: Message[]; nextCursor: string | null }> {
  const limit = opts?.limit ?? 30;
  let q = supabase
    .from('messages')
    .select('id, thread_id, sender_id, content, media_url, created_at')
    .eq('thread_id', threadId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (opts?.cursor) q = q.lt('created_at', opts.cursor);

  const { data, error } = await q;
  if (error) {
    console.warn('[messages] fetchThreadMessages error', error);
    throw new Error(error.message);
  }
  const rows = (data ?? []) as Message[];

  const signed = await Promise.all(
    rows.map((m) =>
      m.media_url
        ? getMessageMediaSignedUrl(m.media_url).catch(() => null)
        : Promise.resolve(null),
    ),
  );
  const items: Message[] = rows.map((m, idx) => ({
    ...m,
    media_signed_url: signed[idx] ?? null,
  }));

  const last = items[items.length - 1];
  const nextCursor = items.length === limit && last ? last.created_at : null;
  return { items, nextCursor };
}

// ── Mutaciones ──────────────────────────────────────────────────────────────

export async function sendMessage(
  threadId: string,
  payload: { content?: string; mediaPath?: string },
): Promise<Message> {
  const content = payload.content?.trim() || null;
  const mediaPath = payload.mediaPath ?? null;
  if (!content && !mediaPath) {
    throw new Error('El mensaje no puede estar vacío.');
  }

  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) throw new Error('Necesitas iniciar sesión.');

  const { data, error } = await supabase
    .from('messages')
    .insert({
      thread_id: threadId,
      sender_id: userId,
      content,
      media_url: mediaPath,
    })
    .select('id, thread_id, sender_id, content, media_url, created_at')
    .single();
  if (error) {
    console.warn('[messages] sendMessage error', error);
    if (error.code === '42501') {
      throw new Error('No disponible.');
    }
    throw new Error(error.message);
  }
  return data as Message;
}

export async function uploadMessageMedia(
  threadId: string,
  fileBlob: Blob,
  ext: string,
): Promise<string> {
  const safeExt = ext.replace(/[^a-z0-9]/gi, '').toLowerCase() || 'jpg';
  const uuid = cryptoRandomUuid();
  const path = `${threadId}/${uuid}.${safeExt}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, fileBlob, {
      upsert: false,
      contentType: blobMimeForExt(safeExt),
      cacheControl: '3600',
    });
  if (error) {
    console.warn('[messages] uploadMessageMedia error', error);
    throw new Error(error.message);
  }
  return path;
}

// ── helpers ─────────────────────────────────────────────────────────────────

export async function getMessageMediaSignedUrl(
  path: string,
  ttlSec = 3600,
): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, ttlSec);
  if (error) {
    console.warn('[messages] getMessageMediaSignedUrl error', error);
    return null;
  }
  return data.signedUrl;
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

function cryptoRandomUuid(): string {
  const c: { randomUUID?: () => string } | undefined =
    typeof globalThis !== 'undefined'
      ? (globalThis as { crypto?: { randomUUID?: () => string } }).crypto
      : undefined;
  if (c?.randomUUID) return c.randomUUID();
  const rand = Math.random().toString(16).slice(2, 10);
  return `${Date.now().toString(16)}-${rand}`;
}
