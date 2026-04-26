import { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  Text,
  View,
} from 'react-native';
import { useGlobalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import Avatar from '@/components/Avatar';
import { useSession } from '@/lib/session';
import {
  fetchGroupById,
  fetchGroupMembers,
  kickMember,
  updateMemberRole,
  type GroupMember,
  type GroupRole,
} from '@beproud/api';

export default function GroupMembers() {
  const { id } = useGlobalSearchParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const { user } = useSession();

  const groupKey = ['group', id] as const;
  const membersKey = ['group-members', id] as const;

  const group = useQuery({
    queryKey: groupKey,
    queryFn: () => fetchGroupById(id),
    enabled: !!id,
  });
  const members = useQuery({
    queryKey: membersKey,
    queryFn: () => fetchGroupMembers(id),
    enabled: !!id,
  });

  const myRole = group.data?.my_role ?? null;
  const isMod = myRole === 'owner' || myRole === 'admin';

  const [menuFor, setMenuFor] = useState<GroupMember | null>(null);
  const [error, setError] = useState<string | null>(null);

  const kickMutation = useMutation({
    mutationFn: (userId: string) => kickMember(id, userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: membersKey });
      qc.invalidateQueries({ queryKey: groupKey });
    },
    onError: (e) => setError(e instanceof Error ? e.message : 'Error'),
  });
  const roleMutation = useMutation({
    mutationFn: (vars: { userId: string; role: GroupRole }) =>
      updateMemberRole(id, vars.userId, vars.role),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: membersKey });
    },
    onError: (e) => setError(e instanceof Error ? e.message : 'Error'),
  });

  if (members.isLoading || group.isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-brand-800">
        <ActivityIndicator color="#A9C6E8" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-brand-800">
      {error && (
        <Text className="px-4 pt-2 text-sm text-red-400" accessibilityLiveRegion="polite">
          {error}
        </Text>
      )}
      {isMod && (
        <View className="px-4 pt-3">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Invitar miembros"
            onPress={() => router.push(`/group/${id}/invite` as never)}
            className="rounded-full bg-brand-300 px-4 py-2 active:bg-brand-200"
          >
            <Text className="text-center text-xs font-extrabold text-brand-900">
              ＋ Invitar miembros
            </Text>
          </Pressable>
        </View>
      )}
      <FlatList
        data={members.data ?? []}
        keyExtractor={(m) => `${m.group_id}:${m.user_id}`}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        renderItem={({ item }) => (
          <View className="mb-2 flex-row items-center rounded-xl border border-brand-700 bg-brand-800/60 p-3">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Abrir perfil de ${item.profile?.display_name ?? 'usuario'}`}
              onPress={() => {
                if (item.profile?.username) {
                  router.push(`/user/${item.profile.username}` as never);
                }
              }}
              className="flex-1 flex-row items-center"
            >
              <Avatar
                url={item.profile?.avatar_url ?? null}
                name={item.profile?.display_name ?? '?'}
                size={40}
              />
              <View className="ml-3 flex-1">
                <Text className="text-sm font-bold text-white" numberOfLines={1}>
                  {item.profile?.display_name ?? 'Usuario'}
                </Text>
                <Text className="text-xs text-brand-300" numberOfLines={1}>
                  @{item.profile?.username ?? '—'}
                </Text>
              </View>
              <RoleBadge role={item.role} />
            </Pressable>
            {isMod && item.user_id !== user?.id && item.role !== 'owner' && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Más opciones"
                onPress={() => setMenuFor(item)}
                hitSlop={6}
                className="ml-2 px-2"
              >
                <Text className="text-base font-bold text-brand-200">⋯</Text>
              </Pressable>
            )}
          </View>
        )}
        ListEmptyComponent={
          <View className="items-center py-12">
            <Text className="text-sm text-brand-300">No hay miembros.</Text>
          </View>
        }
      />

      <MemberMenu
        member={menuFor}
        myRole={myRole}
        onClose={() => setMenuFor(null)}
        onPromote={() => {
          if (!menuFor) return;
          roleMutation.mutate({ userId: menuFor.user_id, role: 'admin' });
          setMenuFor(null);
        }}
        onDemote={() => {
          if (!menuFor) return;
          roleMutation.mutate({ userId: menuFor.user_id, role: 'member' });
          setMenuFor(null);
        }}
        onKick={() => {
          if (!menuFor) return;
          kickMutation.mutate(menuFor.user_id);
          setMenuFor(null);
        }}
      />
    </View>
  );
}

function RoleBadge({ role }: { role: GroupRole }) {
  const styles =
    role === 'owner'
      ? 'bg-amber-500/20 text-amber-200'
      : role === 'admin'
        ? 'bg-brand-300/20 text-brand-100'
        : 'bg-brand-700 text-brand-300';
  const label = role === 'owner' ? 'Owner' : role === 'admin' ? 'Admin' : 'Miembro';
  return (
    <View className={`rounded-full px-2 py-0.5 ${styles.split(' ')[0]}`}>
      <Text className={`text-[10px] font-extrabold ${styles.split(' ')[1]}`}>
        {label}
      </Text>
    </View>
  );
}

function MemberMenu({
  member,
  myRole,
  onClose,
  onPromote,
  onDemote,
  onKick,
}: {
  member: GroupMember | null;
  myRole: GroupRole | null;
  onClose: () => void;
  onPromote: () => void;
  onDemote: () => void;
  onKick: () => void;
}) {
  if (!member) return null;
  const canChangeRole = myRole === 'owner';
  const actions: Array<{ label: string; destructive?: boolean; onPress: () => void; disabled?: boolean }> = [];
  if (canChangeRole && member.role === 'member') {
    actions.push({ label: 'Hacer admin', onPress: onPromote });
  }
  if (canChangeRole && member.role === 'admin') {
    actions.push({ label: 'Quitar admin', onPress: onDemote });
  }
  actions.push({ label: 'Expulsar', destructive: true, onPress: onKick });

  return (
    <Modal visible={!!member} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Cerrar menú"
        onPress={onClose}
        className="flex-1 justify-end bg-black/60"
      >
        <View className="rounded-t-3xl border-t border-brand-700 bg-brand-800 px-6 pb-8 pt-4">
          <View className="mb-3 self-center h-1 w-10 rounded-full bg-brand-600" />
          <Text className="mb-2 text-center text-xs text-brand-300">
            @{member.profile?.username ?? 'usuario'}
          </Text>
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
