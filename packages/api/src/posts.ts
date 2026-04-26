import { supabase } from './client';
import { getSignedPhotoUrl } from './completions';

export type Post = {
  id: string;
  completion_id: string;
  user_id: string;
  caption: string | null;
  likes_count: number;
  comments_count: number;
  created_at: string;
};

/** Fila tal cual la devuelve la vista feed_for_user, ya hidratada con autor + tarea. */
export type FeedItem = Post & {
  username: string;
  display_name: string;
  avatar_url: string | null;
  is_private: boolean;
  photo_path: string;
  points_awarded: number;
  task_title: string;
  task_icon: string | null;
  task_category: string;
  /** URL firmada lista para `<Image source>`. Puede ser null si falla la firma. */
  signed_url: string | null;
  /** True si el usuario actual ya le ha dado like. */
  liked_by_me: boolean;
};

export type Comment = {
  id: string;
  post_id: string;
  user_id: string;
  parent_id: string | null;
  text: string;
  created_at: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
};

/** Comentario top-level + sus respuestas inmediatas. La app solo soporta 1 nivel. */
export type CommentTreeNode = Comment & { replies: Comment[] };

const PAGE_SIZE = 20;

// ── Feed ────────────────────────────────────────────────────────────────────

/**
 * Trae una página del feed (paginación por cursor `created_at < cursor`).
 * Hidrata signed URLs y marca `liked_by_me` resolviendo en una sola query
 * los likes del usuario sobre los ids de la página.
 */
export async function fetchFeedPage(opts?: {
  cursor?: string;
  limit?: number;
}): Promise<{ items: FeedItem[]; nextCursor: string | null }> {
  const limit = opts?.limit ?? PAGE_SIZE;

  let q = supabase
    .from('feed_for_user')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (opts?.cursor) q = q.lt('created_at', opts.cursor);

  const { data, error } = await q;
  if (error) {
    console.warn('[feed] fetchFeedPage error', error);
    throw new Error(error.message);
  }

  const rows = (data ?? []) as Array<Omit<FeedItem, 'signed_url' | 'liked_by_me'>>;
  const items = await hydrateFeedItems(rows);

  const last = items[items.length - 1];
  const nextCursor =
    items.length === limit && last ? last.created_at : null;

  return { items, nextCursor };
}

/** Carga un único post con todos los joins, listo para la pantalla de detalle. */
export async function fetchPostById(postId: string): Promise<FeedItem | null> {
  const { data, error } = await supabase
    .from('feed_for_user')
    .select('*')
    .eq('id', postId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const [item] = await hydrateFeedItems([
    data as Omit<FeedItem, 'signed_url' | 'liked_by_me'>,
  ]);
  return item ?? null;
}

// ── Likes ───────────────────────────────────────────────────────────────────

/**
 * Toggle del like del usuario actual sobre un post. Si ya existía → DELETE,
 * si no → INSERT. Devuelve el nuevo estado: { liked }.
 */
export async function togglePostLike(
  postId: string,
): Promise<{ liked: boolean }> {
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr) throw userErr;
  const userId = userData.user?.id;
  if (!userId) throw new Error('Necesitas iniciar sesión.');

  const { data: existing, error: selErr } = await supabase
    .from('likes')
    .select('post_id')
    .eq('post_id', postId)
    .eq('user_id', userId)
    .maybeSingle();
  if (selErr) throw selErr;

  if (existing) {
    const { error } = await supabase
      .from('likes')
      .delete()
      .eq('post_id', postId)
      .eq('user_id', userId);
    if (error) throw error;
    return { liked: false };
  }

  const { error } = await supabase
    .from('likes')
    .insert({ post_id: postId, user_id: userId });
  if (error) throw error;
  return { liked: true };
}

// ── Comments ────────────────────────────────────────────────────────────────

/**
 * Devuelve los comentarios del post organizados en árbol top-level + respuestas
 * (1 nivel). Top-level por `created_at asc`; replies igual, anidadas dentro.
 */
export async function fetchPostComments(
  postId: string,
): Promise<CommentTreeNode[]> {
  const { data, error } = await supabase
    .from('comments')
    .select(
      'id, post_id, user_id, parent_id, text, created_at, ' +
        'author:profiles!comments_user_id_profiles_fkey(username, display_name, avatar_url)',
    )
    .eq('post_id', postId)
    .order('created_at', { ascending: true });
  if (error) {
    console.warn('[posts] fetchPostComments error', error);
    throw new Error(error.message);
  }

  type Row = {
    id: string;
    post_id: string;
    user_id: string;
    parent_id: string | null;
    text: string;
    created_at: string;
    author: {
      username: string;
      display_name: string;
      avatar_url: string | null;
    } | null;
  };

  // PostgREST tipa los joins embebidos como `GenericStringError | T`;
  // forzamos el cast vía unknown porque el shape real lo conocemos.
  const rows = (data ?? []) as unknown as Row[];
  const flat: Comment[] = rows.map((r) => ({
    id: r.id,
    post_id: r.post_id,
    user_id: r.user_id,
    parent_id: r.parent_id,
    text: r.text,
    created_at: r.created_at,
    username: r.author?.username ?? 'usuario',
    display_name: r.author?.display_name ?? 'Usuario',
    avatar_url: r.author?.avatar_url ?? null,
  }));

  const tops = flat.filter((c) => c.parent_id === null);
  return tops.map<CommentTreeNode>((t) => ({
    ...t,
    replies: flat.filter((c) => c.parent_id === t.id),
  }));
}

export async function createComment(
  postId: string,
  text: string,
  parentId: string | null = null,
): Promise<Comment> {
  const trimmed = text.trim();
  if (trimmed.length < 1 || trimmed.length > 500) {
    throw new Error('El comentario debe tener entre 1 y 500 caracteres.');
  }

  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr) throw userErr;
  const userId = userData.user?.id;
  if (!userId) throw new Error('Necesitas iniciar sesión.');

  const { data, error } = await supabase
    .from('comments')
    .insert({
      post_id: postId,
      user_id: userId,
      parent_id: parentId,
      text: trimmed,
    })
    .select(
      'id, post_id, user_id, parent_id, text, created_at, ' +
        'author:profiles!comments_user_id_profiles_fkey(username, display_name, avatar_url)',
    )
    .single();
  if (error) {
    console.warn('[posts] createComment error', error);
    throw new Error(error.message);
  }

  // Mismo motivo que en fetchPostComments: cast vía unknown por el join embed.
  const row = data as unknown as {
    id: string;
    post_id: string;
    user_id: string;
    parent_id: string | null;
    text: string;
    created_at: string;
    author: {
      username: string;
      display_name: string;
      avatar_url: string | null;
    } | null;
  };
  return {
    id: row.id,
    post_id: row.post_id,
    user_id: row.user_id,
    parent_id: row.parent_id,
    text: row.text,
    created_at: row.created_at,
    username: row.author?.username ?? 'usuario',
    display_name: row.author?.display_name ?? 'Usuario',
    avatar_url: row.author?.avatar_url ?? null,
  };
}

export async function deleteComment(commentId: string): Promise<void> {
  const { error } = await supabase
    .from('comments')
    .delete()
    .eq('id', commentId);
  if (error) throw error;
}

// ── Posts (autor) ───────────────────────────────────────────────────────────

export async function deletePost(postId: string): Promise<void> {
  const { error } = await supabase.from('posts').delete().eq('id', postId);
  if (error) throw error;
}

// ── Reports ─────────────────────────────────────────────────────────────────

export type ReportTargetType = 'post' | 'comment' | 'user';

export async function createReport(input: {
  targetType: ReportTargetType;
  targetId: string;
  reason?: string | null;
}): Promise<void> {
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr) throw userErr;
  const userId = userData.user?.id;
  if (!userId) throw new Error('Necesitas iniciar sesión.');

  const { error } = await supabase.from('reports').insert({
    reporter_id: userId,
    target_type: input.targetType,
    target_id: input.targetId,
    reason: input.reason ?? null,
  });
  if (error) {
    console.warn('[posts] createReport error', error);
    throw new Error(error.message);
  }
}

// ── Blocks ──────────────────────────────────────────────────────────────────

export async function blockUser(blockedId: string): Promise<void> {
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr) throw userErr;
  const userId = userData.user?.id;
  if (!userId) throw new Error('Necesitas iniciar sesión.');
  if (userId === blockedId) throw new Error('No puedes bloquearte a ti mismo.');

  const { error } = await supabase
    .from('blocks')
    .insert({ blocker_id: userId, blocked_id: blockedId });
  if (error && error.code !== '23505') {
    // 23505 = unique_violation: ya estaba bloqueado, ok.
    throw error;
  }
}

export async function unblockUser(blockedId: string): Promise<void> {
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr) throw userErr;
  const userId = userData.user?.id;
  if (!userId) return;

  const { error } = await supabase
    .from('blocks')
    .delete()
    .eq('blocker_id', userId)
    .eq('blocked_id', blockedId);
  if (error) throw error;
}

export async function fetchMyBlocks(): Promise<string[]> {
  const { data, error } = await supabase.from('blocks').select('blocked_id');
  if (error) throw error;
  return ((data ?? []) as Array<{ blocked_id: string }>).map((r) => r.blocked_id);
}

// ── helpers internos ────────────────────────────────────────────────────────

async function hydrateFeedItems(
  rows: Array<Omit<FeedItem, 'signed_url' | 'liked_by_me'>>,
): Promise<FeedItem[]> {
  if (rows.length === 0) return [];

  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id ?? null;

  const [signed, myLikes] = await Promise.all([
    Promise.all(
      rows.map((r) => getSignedPhotoUrl(r.photo_path).catch(() => null)),
    ),
    fetchMyLikesForPosts(rows.map((r) => r.id), userId),
  ]);

  return rows.map((r, idx) => ({
    ...r,
    signed_url: signed[idx] ?? null,
    liked_by_me: myLikes.has(r.id),
  }));
}

async function fetchMyLikesForPosts(
  postIds: string[],
  userId: string | null,
): Promise<Set<string>> {
  if (!userId || postIds.length === 0) return new Set();
  const { data, error } = await supabase
    .from('likes')
    .select('post_id')
    .eq('user_id', userId)
    .in('post_id', postIds);
  if (error) {
    console.warn('[feed] fetchMyLikesForPosts error', error);
    return new Set();
  }
  return new Set(
    ((data ?? []) as Array<{ post_id: string }>).map((r) => r.post_id),
  );
}
