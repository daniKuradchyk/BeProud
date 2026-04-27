import { useEffect, useState } from 'react';
import {
  Image,
  Modal,
  Pressable,
  Text,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import Screen from '@/components/Screen';
import Input from '@/components/Input';
import Button from '@/components/Button';
import Avatar from '@/components/Avatar';
import { useSession } from '@/lib/session';
import {
  countUnread,
  countUnreadNotifications,
  fetchMyFollowers,
  fetchMyFollowing,
  fetchMyLeaguePosition,
  fetchMyMonthlyStats,
  fetchMyRecentCompletions,
  fetchPendingFollowRequests,
  getCurrentStreak,
  respondFollowRequest,
  signOut,
  supabase,
  updateProfile,
  uploadAvatar,
  type TaskCompletionWithCatalog,
} from '@beproud/api';

export default function ProfileScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const { profile, user, refreshProfile, refreshRoutine } = useSession();
  const [regenerating, setRegenerating] = useState(false);

  // Solicitudes de follow pendientes (sección "Solicitudes" arriba).
  const requestsKey = ['follow-requests'] as const;
  const requests = useQuery({
    queryKey: requestsKey,
    queryFn: fetchPendingFollowRequests,
    enabled: !!user,
  });
  const respondMutation = useMutation({
    mutationFn: (vars: { followerId: string; accept: boolean }) =>
      respondFollowRequest(vars.followerId, vars.accept),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: requestsKey });
      qc.invalidateQueries({ queryKey: ['follow-requests-count'] });
      qc.invalidateQueries({ queryKey: ['followers', user?.id] });
    },
  });

  // Mensajes sin leer (para badge en el botón "Mensajes").
  const unread = useQuery({
    queryKey: ['unread-count'],
    queryFn: countUnread,
    enabled: !!user,
    refetchInterval: 60_000,
  });

  // Contadores de followers/following del propio usuario.
  const followersKey = ['followers', user?.id] as const;
  const followingKey = ['following', user?.id] as const;
  const myFollowers = useQuery({
    queryKey: followersKey,
    queryFn: () => fetchMyFollowers(user!.id),
    enabled: !!user,
  });
  const myFollowing = useQuery({
    queryKey: followingKey,
    queryFn: () => fetchMyFollowing(user!.id),
    enabled: !!user,
  });

  // Liga semanal actual (Fase 8).
  const myLeague = useQuery({
    queryKey: ['my-league-position'],
    queryFn: fetchMyLeaguePosition,
    enabled: !!user,
    refetchInterval: 60_000,
  });

  // Badge de notifications sin leer (Fase 10).
  const unreadNotifs = useQuery({
    queryKey: ['notifications-unread-count'],
    queryFn: countUnreadNotifications,
    enabled: !!user,
    refetchInterval: 60_000,
  });

  const [displayName, setDisplayName] = useState(profile?.display_name ?? '');
  const [bio, setBio] = useState(profile?.bio ?? '');
  const [isPrivate, setIsPrivate] = useState(profile?.is_private ?? false);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  // Datos de Fase 3.
  const [streak, setStreak] = useState<number | null>(null);
  const [photos, setPhotos] = useState<TaskCompletionWithCatalog[]>([]);
  const [monthly, setMonthly] = useState<Record<string, number>>({});
  const [previewing, setPreviewing] =
    useState<TaskCompletionWithCatalog | null>(null);

  // Sincroniza si el perfil cambia desde fuera (tras refresh).
  useEffect(() => {
    if (!profile) return;
    setDisplayName(profile.display_name);
    setBio(profile.bio ?? '');
    setIsPrivate(profile.is_private);
  }, [profile?.id, profile?.display_name, profile?.bio, profile?.is_private]);

  // Carga racha + fotos + estadísticas mensuales cuando cambia el usuario o
  // cuando profile.total_points cambia (un completion nuevo lo muta).
  useEffect(() => {
    if (!user) return;
    let cancel = false;
    (async () => {
      try {
        const [s, p, m] = await Promise.all([
          getCurrentStreak(),
          fetchMyRecentCompletions(30),
          fetchMyMonthlyStats(),
        ]);
        if (cancel) return;
        setStreak(s);
        setPhotos(p);
        setMonthly(m);
      } catch (e) {
        console.warn('[profile] no pude cargar stats', e);
      }
    })();
    return () => {
      cancel = true;
    };
  }, [user?.id, profile?.total_points]);

  async function onSave() {
    setError(null);
    setSaving(true);
    try {
      await updateProfile({
        display_name: displayName.trim(),
        bio: bio.trim() || null,
        is_private: isPrivate,
      });
      await refreshProfile();
      setSavedAt(Date.now());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  }

  async function onPickAvatar() {
    setError(null);
    if (!user) return;
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      setError('Permiso de galería denegado.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];

    setUploadingAvatar(true);
    try {
      // expo-image-picker da un URI local. Lo convertimos a Blob.
      const res = await fetch(asset.uri);
      const blob = await res.blob();
      const ext = (asset.uri.split('.').pop() ?? 'jpg').split('?')[0] ?? 'jpg';
      const publicUrl = await uploadAvatar(user.id, blob, ext);
      await updateProfile({ avatar_url: publicUrl });
      await refreshProfile();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo subir el avatar');
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function onSignOut() {
    await signOut();
  }

  async function onRegenerateRoutine() {
    if (!user) return;
    setError(null);
    setRegenerating(true);
    try {
      // Desactivamos la rutina activa actual para forzar el wizard.
      // El RouteGuard nos llevará a /(onboarding)/step-1-welcome.
      await supabase
        .from('routines')
        .update({ is_active: false })
        .eq('user_id', user.id)
        .eq('is_active', true);
      await refreshRoutine();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo reiniciar la rutina');
    } finally {
      setRegenerating(false);
    }
  }

  if (!profile) {
    return (
      <Screen>
        <View className="flex-1 items-center justify-center">
          <Text className="text-base text-brand-200">Cargando perfil…</Text>
        </View>
      </Screen>
    );
  }

  const dirty =
    displayName.trim() !== profile.display_name ||
    (bio.trim() || null) !== (profile.bio ?? null) ||
    isPrivate !== profile.is_private;

  // Avisamos en banner llamativo si falta biometría — sin estos datos
  // /nutrition no puede calcular targets ni /fasting personalizar nada.
  const missingBiometrics =
    !profile.birth_date ||
    !profile.biological_sex ||
    !profile.height_cm ||
    !profile.weight_kg;

  return (
    <Screen scroll>
      {missingBiometrics && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Completar biometría"
          onPress={() => router.push('/settings/biometrics' as never)}
          className="mb-4 flex-row items-center rounded-2xl border border-amber-500/40 bg-amber-500/10 p-3 active:bg-amber-500/20"
        >
          <Text className="mr-3 text-2xl" style={{ lineHeight: 26 }}>📏</Text>
          <View className="flex-1">
            <Text className="text-sm font-extrabold text-amber-200">
              Completa tus datos biométricos
            </Text>
            <Text className="text-xs text-amber-100/80">
              Peso, altura y fecha de nacimiento — los necesitamos para Nutrición y Ayuno.
            </Text>
          </View>
          <Text className="text-base font-bold text-amber-200">›</Text>
        </Pressable>
      )}

      <View className="mb-4 flex-row items-center justify-between">
        <View className="flex-1">
          <Text className="text-3xl font-extrabold text-white">Tu perfil</Text>
          <Text className="text-sm text-brand-200">@{profile.username}</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Notificaciones"
          onPress={() => router.push('/notifications' as never)}
          className="ml-3 h-11 w-11 items-center justify-center rounded-full bg-brand-700 active:bg-brand-600"
        >
          <Text className="text-lg">🔔</Text>
          {(unreadNotifs.data ?? 0) > 0 && (
            <View className="absolute -top-1 -right-1 min-w-[18px] items-center rounded-full bg-brand-300 px-1">
              <Text className="text-[10px] font-extrabold text-brand-900">
                {unreadNotifs.data}
              </Text>
            </View>
          )}
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Mensajes"
          onPress={() => router.push('/messages' as never)}
          className="ml-2 h-11 w-11 items-center justify-center rounded-full bg-brand-700 active:bg-brand-600"
        >
          <Text className="text-lg">✉️</Text>
          {(unread.data ?? 0) > 0 && (
            <View className="absolute -top-1 -right-1 min-w-[18px] items-center rounded-full bg-brand-300 px-1">
              <Text className="text-[10px] font-extrabold text-brand-900">
                {unread.data}
              </Text>
            </View>
          )}
        </Pressable>
      </View>

      {(requests.data ?? []).length > 0 && (
        <View className="mb-6 rounded-xl border border-brand-700 bg-brand-800/60 p-4">
          <Text className="mb-3 text-xs uppercase tracking-wider text-brand-300">
            Solicitudes ({requests.data!.length})
          </Text>
          {requests.data!.map((r) => (
            <View key={r.follower_id} className="mb-2 flex-row items-center">
              <Avatar url={r.avatar_url} name={r.display_name} size={36} />
              <View className="ml-3 flex-1">
                <Text className="text-sm font-bold text-white" numberOfLines={1}>
                  {r.display_name}
                </Text>
                <Text className="text-xs text-brand-300" numberOfLines={1}>
                  @{r.username}
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Aceptar a ${r.username}`}
                onPress={() =>
                  respondMutation.mutate({
                    followerId: r.follower_id,
                    accept: true,
                  })
                }
                className="mr-2 rounded-full bg-brand-300 px-3 py-1.5 active:bg-brand-200"
              >
                <Text className="text-xs font-extrabold text-brand-900">
                  Aceptar
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Rechazar a ${r.username}`}
                onPress={() =>
                  respondMutation.mutate({
                    followerId: r.follower_id,
                    accept: false,
                  })
                }
                className="rounded-full bg-brand-700 px-3 py-1.5 active:bg-brand-600"
              >
                <Text className="text-xs font-bold text-brand-200">
                  Rechazar
                </Text>
              </Pressable>
            </View>
          ))}
        </View>
      )}

      <View className="mb-6 flex-row justify-around rounded-xl border border-brand-700 bg-brand-800/60 py-3">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Ver mis seguidores"
          onPress={() => router.push(`/user/${profile.username}/followers` as never)}
          className="items-center"
        >
          <Text className="text-xl font-extrabold text-white">
            {myFollowers.data?.length ?? 0}
          </Text>
          <Text className="text-xs text-brand-300">Seguidores</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Ver a quién sigo"
          onPress={() => router.push(`/user/${profile.username}/following` as never)}
          className="items-center"
        >
          <Text className="text-xl font-extrabold text-white">
            {myFollowing.data?.length ?? 0}
          </Text>
          <Text className="text-xs text-brand-300">Siguiendo</Text>
        </Pressable>
      </View>

      <View className="mb-6 items-center">
        <Avatar url={profile.avatar_url} name={profile.display_name} size={112} />
        <Pressable
          onPress={onPickAvatar}
          disabled={uploadingAvatar}
          accessibilityRole="button"
          className="mt-3"
        >
          <Text className="text-sm font-semibold text-brand-100 underline">
            {uploadingAvatar ? 'Subiendo…' : 'Cambiar foto'}
          </Text>
        </Pressable>
      </View>

      <Input
        label="Nombre visible"
        value={displayName}
        onChangeText={setDisplayName}
        placeholder="Tu nombre"
        maxLength={40}
      />

      <Input
        label="Bio"
        value={bio}
        onChangeText={setBio}
        placeholder="Cuenta algo sobre ti (opcional)"
        multiline
        numberOfLines={3}
        maxLength={200}
        hint={`${bio.length}/200`}
        className="min-h-[88px] py-3"
      />

      <Pressable
        onPress={() => setIsPrivate(!isPrivate)}
        accessibilityRole="switch"
        accessibilityState={{ checked: isPrivate }}
        className="mb-6 flex-row items-center justify-between rounded-xl border border-brand-600 bg-brand-700/50 px-4 py-3"
      >
        <View className="flex-1 pr-3">
          <Text className="text-base font-semibold text-white">Cuenta privada</Text>
          <Text className="text-xs text-brand-300">
            Solo tus amigos verán tus posts.
          </Text>
        </View>
        <View
          className={`h-6 w-11 justify-center rounded-full p-0.5 ${
            isPrivate ? 'bg-brand-300' : 'bg-brand-600'
          }`}
        >
          <View
            className={`h-5 w-5 rounded-full bg-white ${
              isPrivate ? 'ml-auto' : ''
            }`}
          />
        </View>
      </Pressable>

      {error && (
        <Text className="mb-3 text-sm text-red-400" accessibilityLiveRegion="polite">
          {error}
        </Text>
      )}
      {savedAt && !dirty && !error && (
        <Text className="mb-3 text-sm text-emerald-300">Guardado ✓</Text>
      )}

      <Button
        title="Guardar cambios"
        onPress={onSave}
        loading={saving}
        disabled={!dirty}
      />

      <View className="mt-8 rounded-xl border border-brand-700 bg-brand-800/60 p-4">
        <Text className="mb-2 text-xs uppercase tracking-wider text-brand-300">
          Estadísticas
        </Text>
        <View className="flex-row justify-between">
          <Stat label="Puntos" value={profile.total_points} />
          <Stat label="Racha" value={streak ?? 0} />
          <Stat label="Mejor racha" value={profile.streak_best} />
          <Stat label="Nivel" value={profile.level} />
        </View>
        <View className="mt-3 flex-row items-center rounded-xl bg-brand-700/30 px-3 py-2">
          {myLeague.data?.league ? (
            <>
              <View
                className="h-9 w-9 items-center justify-center rounded-lg"
                style={{ backgroundColor: `#${myLeague.data.league.color}33` }}
              >
                <Text style={{ fontSize: 20 }}>
                  {myLeague.data.league.icon}
                </Text>
              </View>
              <View className="ml-3 flex-1">
                <Text className="text-[10px] font-extrabold uppercase tracking-wider text-brand-300">
                  Liga semanal
                </Text>
                <Text className="text-sm font-extrabold text-white">
                  {myLeague.data.league.name} · {myLeague.data.points} pts
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Ver rankings"
                onPress={() => router.push('/(tabs)/rankings' as never)}
              >
                <Text className="text-xs font-bold text-brand-200">Ver ›</Text>
              </Pressable>
            </>
          ) : (
            <Text className="text-xs text-brand-300">
              Aún sin liga esta semana — completa tareas y aparecerás en Bronce.
            </Text>
          )}
        </View>
      </View>

      <PhotoGrid photos={photos} onPick={setPreviewing} />
      <MonthlyCalendar monthly={monthly} />

      <Button
        title="Datos biométricos"
        onPress={() => router.push('/settings/biometrics' as never)}
        className="mt-6"
      />

      <Button
        title="Logros"
        variant="secondary"
        onPress={() => router.push('/profile/achievements' as never)}
        className="mt-3"
      />

      <Button
        title="Gimnasio"
        variant="secondary"
        onPress={() => router.push('/gym' as never)}
        className="mt-3"
      />

      <Button
        title="Mis grupos"
        variant="secondary"
        onPress={() => router.push('/groups' as never)}
        className="mt-3"
      />

      <Button
        title="Ajustes"
        variant="secondary"
        onPress={() => router.push('/settings' as never)}
        className="mt-3"
      />

      <Button
        title="Regenerar mi rutina"
        variant="secondary"
        onPress={onRegenerateRoutine}
        loading={regenerating}
        className="mt-3"
      />
      <Text className="mt-2 text-center text-xs text-brand-300">
        Vuelve al cuestionario y crea una rutina desde cero.
      </Text>

      <Button
        title="Cerrar sesión"
        variant="ghost"
        onPress={onSignOut}
        className="mt-6"
      />

      <Text className="mt-4 text-center text-xs text-brand-300">{user?.email}</Text>

      <PhotoPreview
        completion={previewing}
        onClose={() => setPreviewing(null)}
      />
    </Screen>
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

function PhotoGrid({
  photos,
  onPick,
}: {
  photos: TaskCompletionWithCatalog[];
  onPick: (c: TaskCompletionWithCatalog) => void;
}) {
  return (
    <View className="mt-8">
      <Text className="mb-3 text-xs uppercase tracking-wider text-brand-300">
        Mis fotos
      </Text>
      {photos.length === 0 ? (
        <View className="rounded-2xl border border-dashed border-brand-600 bg-brand-800/40 p-6">
          <Text className="text-center text-sm text-brand-200">
            Aún no has completado ninguna tarea con foto.
          </Text>
        </View>
      ) : (
        <View className="flex-row flex-wrap" style={{ marginHorizontal: -2 }}>
          {photos.map((c) => (
            <Pressable
              key={c.id}
              accessibilityRole="button"
              accessibilityLabel={`Ver foto de ${c.task?.title ?? 'tarea'}`}
              onPress={() => onPick(c)}
              style={{ width: '33.3333%', padding: 2 }}
            >
              <View className="overflow-hidden rounded-md bg-brand-900">
                {c.signed_url ? (
                  <Image
                    source={{ uri: c.signed_url }}
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
        </View>
      )}
    </View>
  );
}

function MonthlyCalendar({ monthly }: { monthly: Record<string, number> }) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0..11
  const monthName = now.toLocaleDateString('es-ES', { month: 'long' });
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  // Lunes-first: getDay() devuelve 0=domingo, 1=lunes…; transformamos.
  const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7;
  const cells: Array<number | null> = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const today = now.getDate();

  return (
    <View className="mt-8">
      <Text className="mb-3 text-xs uppercase tracking-wider text-brand-300">
        Este mes · {monthName}
      </Text>
      <View className="rounded-2xl border border-brand-700 bg-brand-800/60 p-3">
        <View className="mb-2 flex-row">
          {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((d) => (
            <View key={d} style={{ width: `${100 / 7}%` }} className="items-center">
              <Text className="text-[10px] font-bold text-brand-300">{d}</Text>
            </View>
          ))}
        </View>
        <View className="flex-row flex-wrap">
          {cells.map((d, i) => {
            if (d === null) {
              return (
                <View
                  key={`b${i}`}
                  style={{ width: `${100 / 7}%` }}
                  className="aspect-square p-0.5"
                />
              );
            }
            const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(
              d,
            ).padStart(2, '0')}`;
            const hit = (monthly[key] ?? 0) > 0;
            const isToday = d === today;
            return (
              <View
                key={key}
                style={{ width: `${100 / 7}%` }}
                className="aspect-square p-0.5"
              >
                <View
                  className={`flex-1 items-center justify-center rounded-md ${
                    hit ? 'bg-brand-300' : 'bg-brand-700/50'
                  } ${isToday ? 'border-2 border-brand-100' : ''}`}
                >
                  <Text
                    className={`text-xs font-bold ${
                      hit ? 'text-brand-900' : 'text-brand-200'
                    }`}
                  >
                    {d}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      </View>
    </View>
  );
}

function PhotoPreview({
  completion,
  onClose,
}: {
  completion: TaskCompletionWithCatalog | null;
  onClose: () => void;
}) {
  return (
    <Modal
      visible={!!completion}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Cerrar foto"
        onPress={onClose}
        className="flex-1 items-center justify-center bg-black/90 p-6"
      >
        {completion?.signed_url && (
          <Image
            source={{ uri: completion.signed_url }}
            style={{ width: '100%', aspectRatio: 1 }}
            resizeMode="contain"
            accessibilityLabel={`Foto de ${completion.task?.title ?? 'tarea'}`}
          />
        )}
        {completion && (
          <View className="mt-4 items-center">
            <Text className="text-base font-bold text-white">
              {completion.task?.title ?? 'Tarea'}
            </Text>
            <Text className="mt-1 text-xs text-brand-300">
              {new Date(completion.created_at).toLocaleString('es-ES')}
              {' · +'}
              {completion.points_awarded} pts
            </Text>
          </View>
        )}
      </Pressable>
    </Modal>
  );
}
