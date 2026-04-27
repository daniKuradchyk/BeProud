import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import Avatar from '@/components/Avatar';
import FollowButton from '@/features/follows/components/FollowButton';
import { useSession } from '@/lib/session';
import { backOrReplace } from '@/lib/navigation/back';
import {
  blockUser,
  createReport,
  fetchProfileByUsername,
  fetchUserAchievements,
  getOrCreateDm,
  getSignedPhotoUrl,
  supabase,
  type Achievement,
  type PublicProfile,
} from '@beproud/api';

type PostThumb = {
  id: string;
  photo_path: string;
  task_title: string;
  signed_url: string | null;
};

export default function UserProfileScreen() {
  const router = useRouter();
  const { username } = useLocalSearchParams<{ username: string }>();
  const { user } = useSession();
  const qc = useQueryClient();
  const profileKey = ['profile', username] as const;
  const postsKey = ['profile-posts', username] as const;

  const [menuOpen, setMenuOpen] = useState(false);

  const profile = useQuery({
    queryKey: profileKey,
    queryFn: () => fetchProfileByUsername(username),
    enabled: !!username,
  });

  const canSeePosts =
    profile.data &&
    (profile.data.is_self ||
      !profile.data.is_private ||
      profile.data.follow_status === 'accepted');

  const posts = useQuery({
    queryKey: postsKey,
    queryFn: () => fetchUserPostsThumbs(profile.data!.id),
    enabled: !!profile.data && !!canSeePosts,
  });

  // Logros desbloqueados (Fase 8). RLS los oculta si la cuenta es privada
  // y no nos siguen, o si hay block mutuo → la query devuelve [].
  const achievementsKey = ['user-achievements', profile.data?.id] as const;
  const achievements = useQuery({
    queryKey: achievementsKey,
    queryFn: () => fetchUserAchievements(profile.data!.id),
    enabled: !!profile.data,
  });

  const reportMutation = useMutation({
    mutationFn: (targetId: string) =>
      createReport({ targetType: 'user', targetId }),
  });
  const blockMutation = useMutation({
    mutationFn: (targetId: string) => blockUser(targetId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: profileKey });
      backOrReplace(router, '/(tabs)/search' as never);
    },
  });

  return (
    <SafeAreaView className="flex-1 bg-brand-800">
      <View className="flex-row items-center px-4 py-3">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Volver"
          onPress={() => backOrReplace(router, '/(tabs)/search' as never)}
          hitSlop={12}
          className="px-2 py-1"
        >
          <Text className="text-base font-semibold text-brand-200">‹ Atrás</Text>
        </Pressable>
        <View className="flex-1 items-center">
          <Text
            className="text-base font-bold text-white"
            numberOfLines={1}
          >
            @{username}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Más opciones"
          onPress={() => setMenuOpen(true)}
          hitSlop={12}
          className="px-2 py-1"
        >
          <Text className="text-xl font-bold text-brand-200">⋯</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {profile.isLoading && (
          <View className="items-center py-12">
            <ActivityIndicator color="#A9C6E8" />
          </View>
        )}

        {!profile.isLoading && !profile.data && (
          <View className="items-center py-12">
            <Text className="text-sm text-brand-300">
              Este perfil no existe o ya no está disponible.
            </Text>
          </View>
        )}

        {profile.data && (
          <>
            <View className="items-center">
              <Avatar
                url={profile.data.avatar_url}
                name={profile.data.display_name}
                size={96}
              />
              <Text className="mt-3 text-xl font-extrabold text-white">
                {profile.data.display_name}
              </Text>
              <Text className="text-sm text-brand-300">
                @{profile.data.username}
                {profile.data.is_private ? ' · privada' : ''}
              </Text>
              {profile.data.bio && (
                <Text className="mt-3 text-center text-sm text-brand-100">
                  {profile.data.bio}
                </Text>
              )}
            </View>

            <View className="mt-5 flex-row justify-around rounded-xl border border-brand-700 bg-brand-800/60 py-3">
              <Stat label="Puntos" value={profile.data.total_points} />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Ver seguidores"
                onPress={() =>
                  router.push(`/user/${username}/followers` as never)
                }
                className="items-center"
              >
                <Text className="text-xl font-extrabold text-white">
                  {profile.data.followers_count}
                </Text>
                <Text className="text-xs text-brand-300">Seguidores</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Ver siguiendo"
                onPress={() =>
                  router.push(`/user/${username}/following` as never)
                }
                className="items-center"
              >
                <Text className="text-xl font-extrabold text-white">
                  {profile.data.following_count}
                </Text>
                <Text className="text-xs text-brand-300">Siguiendo</Text>
              </Pressable>
            </View>

            <View className="mt-5 flex-row items-center gap-2">
              <View className="flex-1">
                <FollowButton
                  targetId={profile.data.id}
                  targetIsPrivate={profile.data.is_private}
                  followStatus={profile.data.follow_status}
                  isOwn={profile.data.is_self}
                  invalidateKeys={[profileKey, postsKey]}
                />
              </View>
              {!profile.data.is_self && (
                <SendMessageButton
                  targetUserId={profile.data.id}
                />
              )}
            </View>

            <AchievementsSection
              list={achievements.data ?? []}
              loading={achievements.isLoading}
            />

            <Text className="mt-6 mb-2 text-xs uppercase tracking-wider text-brand-300">
              Publicaciones · {profile.data.posts_count}
            </Text>

            {!canSeePosts ? (
              <View className="items-center rounded-2xl border border-dashed border-brand-600 bg-brand-800/40 p-6">
                <Text className="text-base font-bold text-white">
                  Cuenta privada
                </Text>
                <Text className="mt-1 text-center text-sm text-brand-200">
                  Sigue al usuario para ver sus publicaciones.
                </Text>
              </View>
            ) : posts.isLoading ? (
              <ActivityIndicator color="#A9C6E8" />
            ) : (
              <View className="flex-row flex-wrap" style={{ marginHorizontal: -2 }}>
                {(posts.data ?? []).map((p) => (
                  <Pressable
                    key={p.id}
                    accessibilityRole="button"
                    accessibilityLabel={`Abrir post de ${p.task_title}`}
                    onPress={() => router.push(`/post/${p.id}` as never)}
                    style={{ width: '33.3333%', padding: 2 }}
                  >
                    <View className="overflow-hidden rounded-md bg-brand-900">
                      {p.signed_url ? (
                        <Image
                          source={{ uri: p.signed_url }}
                          style={{ width: '100%', aspectRatio: 1 }}
                          resizeMode="cover"
                        />
                      ) : (
                        <View
                          style={{ width: '100%', aspectRatio: 1 }}
                          className="items-center justify-center"
                        >
                          <Text className="text-xs text-brand-400">sin foto</Text>
                        </View>
                      )}
                    </View>
                  </Pressable>
                ))}
                {(posts.data ?? []).length === 0 && (
                  <Text className="px-2 text-sm text-brand-300">
                    Aún no ha publicado nada.
                  </Text>
                )}
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* Menú ⋯ */}
      <UserMenu
        visible={menuOpen}
        isSelf={!!profile.data?.is_self}
        onClose={() => setMenuOpen(false)}
        onReport={() => {
          if (profile.data) reportMutation.mutate(profile.data.id);
        }}
        onBlock={() => {
          if (profile.data) blockMutation.mutate(profile.data.id);
        }}
        onShare={async () => {
          if (typeof navigator !== 'undefined' && 'clipboard' in navigator) {
            const url =
              typeof window !== 'undefined'
                ? `${window.location.origin}/user/${username}`
                : `beproud://user/${username}`;
            try {
              await (navigator as Navigator).clipboard?.writeText(url);
            } catch {
              /* ignored */
            }
          }
        }}
      />

      {/* Helper: pre-resolvemos user.id de la sesión actual para evitar warnings TS */}
      <Hidden>{user?.id ?? ''}</Hidden>
    </SafeAreaView>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <View className="items-center">
      <Text className="text-xl font-extrabold text-white">{value}</Text>
      <Text className="text-xs text-brand-300">{label}</Text>
    </View>
  );
}

function UserMenu({
  visible,
  isSelf,
  onClose,
  onReport,
  onBlock,
  onShare,
}: {
  visible: boolean;
  isSelf: boolean;
  onClose: () => void;
  onReport: () => void;
  onBlock: () => void;
  onShare: () => void;
}) {
  const actions: Array<{ label: string; destructive?: boolean; onPress: () => void }> =
    isSelf
      ? [{ label: 'Compartir perfil', onPress: () => { onClose(); onShare(); } }]
      : [
          { label: 'Compartir perfil', onPress: () => { onClose(); onShare(); } },
          { label: 'Reportar usuario', onPress: () => { onClose(); onReport(); } },
          { label: 'Bloquear usuario', destructive: true, onPress: () => { onClose(); onBlock(); } },
        ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Cerrar menú"
        onPress={onClose}
        className="flex-1 justify-end bg-black/60"
      >
        <View className="rounded-t-3xl border-t border-brand-700 bg-brand-800 px-6 pb-8 pt-4">
          <View className="mb-3 self-center h-1 w-10 rounded-full bg-brand-600" />
          {actions.map((a) => (
            <Pressable
              key={a.label}
              accessibilityRole="button"
              accessibilityLabel={a.label}
              onPress={a.onPress}
              className="rounded-xl bg-brand-700/60 px-4 py-3 active:bg-brand-600/60"
              style={{ marginBottom: 8 }}
            >
              <Text
                className={`text-center text-base font-bold ${
                  a.destructive ? 'text-red-300' : 'text-white'
                }`}
              >
                {a.label}
              </Text>
            </Pressable>
          ))}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Cancelar"
            onPress={onClose}
            className="mt-1 rounded-xl px-4 py-3"
          >
            <Text className="text-center text-base font-bold text-brand-200">
              Cancelar
            </Text>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
}

function Hidden({ children: _children }: { children: string }) {
  return null;
}

function AchievementsSection({
  list,
  loading,
}: {
  list: Achievement[];
  loading: boolean;
}) {
  // El sort viene del backend por id; los más recientes primero por unlocked_at.
  const sorted = [...list].sort((a, b) => {
    const ta = a.unlocked_at ? Date.parse(a.unlocked_at) : 0;
    const tb = b.unlocked_at ? Date.parse(b.unlocked_at) : 0;
    return tb - ta;
  });
  const visible = sorted.slice(0, 6);
  const hasMore = sorted.length > 6;

  if (loading) return null;
  if (sorted.length === 0) return null;

  return (
    <View className="mt-6">
      <Text className="mb-2 text-xs uppercase tracking-wider text-brand-300">
        Logros · {sorted.length}
      </Text>
      <View className="flex-row flex-wrap" style={{ marginHorizontal: -4 }}>
        {visible.map((a) => (
          <View key={a.id} style={{ width: '33.3333%', padding: 4 }}>
            <View className="items-center rounded-2xl border border-amber-300/40 bg-amber-300/10 p-3">
              <Text style={{ fontSize: 22 }}>{a.icon}</Text>
              <Text
                className="mt-1 text-center text-[11px] font-extrabold text-white"
                numberOfLines={2}
              >
                {a.title}
              </Text>
            </View>
          </View>
        ))}
      </View>
      {hasMore && (
        <Text className="mt-2 text-center text-xs text-brand-300">
          + {sorted.length - 6} más
        </Text>
      )}
    </View>
  );
}

/**
 * Botón "Enviar mensaje" que crea u obtiene un DM y navega al thread.
 * Si la RPC rechaza por block bidireccional, mostramos "No disponible".
 */
function SendMessageButton({ targetUserId }: { targetUserId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const mutation = useMutation({
    mutationFn: () => getOrCreateDm(targetUserId),
    onSuccess: (threadId) => {
      router.push(`/messages/${threadId}` as never);
    },
    onError: (e) => {
      setError(e instanceof Error ? e.message : 'No disponible');
    },
  });
  const blocked = error === 'No disponible.' || error === 'No disponible';
  return (
    <View className="items-end">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={blocked ? 'No disponible' : 'Enviar mensaje'}
        disabled={mutation.isPending || blocked}
        onPress={() => {
          setError(null);
          mutation.mutate();
        }}
        className={`rounded-full px-4 py-2 ${
          blocked
            ? 'bg-brand-700/60'
            : 'bg-brand-700 active:bg-brand-600'
        }`}
      >
        <Text
          className={`text-xs font-extrabold ${
            blocked ? 'text-brand-300' : 'text-white'
          }`}
        >
          {blocked ? 'No disponible' : mutation.isPending ? '…' : 'Enviar mensaje'}
        </Text>
      </Pressable>
    </View>
  );
}

async function fetchUserPostsThumbs(userId: string): Promise<PostThumb[]> {
  // Usamos la vista feed_for_user (joins + visibilidad ya resueltos server-side)
  // en lugar de un embed sobre posts→task_completions, que PostgREST a veces
  // devuelve como array y rompe el acceso a photo_path.
  const { data, error } = await supabase
    .from('feed_for_user')
    .select('id, photo_path, task_title')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(30);
  if (error) throw error;

  type Row = { id: string; photo_path: string; task_title: string };
  const rows = (data ?? []) as Row[];

  const signed = await Promise.all(
    rows.map((r) => getSignedPhotoUrl(r.photo_path).catch(() => null)),
  );

  return rows.map((r, idx) => ({
    id: r.id,
    photo_path: r.photo_path,
    task_title: r.task_title,
    signed_url: signed[idx] ?? null,
  }));
}

// Tipo no exportado, solo para forzar import correcto en build.
export type { PublicProfile };
