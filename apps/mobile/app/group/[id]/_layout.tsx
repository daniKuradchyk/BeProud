import { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Tabs, useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  fetchGroupById,
  leaveGroup,
  type GroupRole,
} from '@beproud/api';

export default function GroupTabsLayout() {
  const router = useRouter();
  const qc = useQueryClient();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [confirmLeave, setConfirmLeave] = useState(false);

  const group = useQuery({
    queryKey: ['group', id],
    queryFn: () => fetchGroupById(id),
    enabled: !!id,
  });

  const leaveMutation = useMutation({
    mutationFn: () => leaveGroup(id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['my-groups'] });
      router.replace('/groups' as never);
    },
  });

  const isMod: GroupRole | null = group.data?.my_role ?? null;
  const showSettings = isMod === 'owner' || isMod === 'admin';

  return (
    <SafeAreaView className="flex-1 bg-brand-800" edges={['top']}>
      {/* Header del grupo */}
      <View className="flex-row items-center px-4 py-3">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Volver"
          onPress={() => router.replace('/groups' as never)}
          hitSlop={12}
          className="px-2 py-1"
        >
          <Text className="text-base font-semibold text-brand-200">‹ Atrás</Text>
        </Pressable>
        <View className="flex-1 flex-row items-center pl-2">
          {group.data?.cover_url ? (
            <Image
              source={{ uri: group.data.cover_url }}
              style={{ width: 32, height: 32, borderRadius: 8 }}
              resizeMode="cover"
            />
          ) : (
            <View
              style={{ width: 32, height: 32, borderRadius: 8 }}
              className="items-center justify-center bg-brand-700"
            >
              <Text>👥</Text>
            </View>
          )}
          <View className="ml-2 flex-1">
            <Text className="text-sm font-bold text-white" numberOfLines={1}>
              {group.data?.name ?? 'Grupo'}
            </Text>
            <Text className="text-[11px] text-brand-300">
              {group.data?.member_count ?? 0} miembros
              {group.data?.is_private ? ' · privado' : ''}
            </Text>
          </View>
        </View>
        {!group.isLoading && group.data && isMod !== 'owner' && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Salir del grupo"
            onPress={() => setConfirmLeave(true)}
            hitSlop={6}
            className="rounded-full bg-brand-700 px-3 py-1.5 active:bg-brand-600"
          >
            <Text className="text-xs font-bold text-brand-200">Salir</Text>
          </Pressable>
        )}
      </View>

      {group.isLoading && (
        <View className="items-center py-4">
          <ActivityIndicator color="#A9C6E8" />
        </View>
      )}

      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: '#0B2238',
            borderTopColor: '#1F4E79',
            borderTopWidth: 1,
          },
          tabBarActiveTintColor: '#A9C6E8',
          tabBarInactiveTintColor: '#5A88B8',
          tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Inicio',
            tabBarIcon: ({ color }) => <TabIcon emoji="🏠" color={color} />,
          }}
        />
        <Tabs.Screen
          name="chat"
          options={{
            title: 'Chat',
            tabBarIcon: ({ color }) => <TabIcon emoji="💬" color={color} />,
          }}
        />
        <Tabs.Screen
          name="leaderboard"
          options={{
            title: 'Ranking',
            tabBarIcon: ({ color }) => <TabIcon emoji="🏆" color={color} />,
          }}
        />
        <Tabs.Screen
          name="members"
          options={{
            title: 'Miembros',
            tabBarIcon: ({ color }) => <TabIcon emoji="👥" color={color} />,
          }}
        />
        <Tabs.Screen
          name="invite"
          options={{
            // Acceso indirecto desde Inicio o desde Miembros; sin tab visible.
            href: null,
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: 'Ajustes',
            tabBarIcon: ({ color }) => <TabIcon emoji="⚙️" color={color} />,
            href: showSettings ? undefined : null,
          }}
        />
      </Tabs>

      <Modal
        visible={confirmLeave}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmLeave(false)}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Cerrar diálogo"
          onPress={() => setConfirmLeave(false)}
          className="flex-1 items-center justify-center bg-black/60 px-6"
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-2xl border border-brand-700 bg-brand-800 p-5"
          >
            <Text className="mb-1 text-base font-extrabold text-white">
              Salir del grupo
            </Text>
            <Text className="mb-4 text-sm text-brand-200">
              Perderás acceso al chat y al ranking. Si vuelves a entrar te
              añadirá como miembro nuevo.
            </Text>
            <View className="flex-row gap-2">
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Cancelar"
                onPress={() => setConfirmLeave(false)}
                className="flex-1 rounded-full bg-brand-700 py-2 active:bg-brand-600"
              >
                <Text className="text-center text-sm font-bold text-white">
                  Cancelar
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Salir"
                disabled={leaveMutation.isPending}
                onPress={() => leaveMutation.mutate()}
                className="flex-1 rounded-full bg-red-500/30 py-2 active:bg-red-500/50"
              >
                <Text className="text-center text-sm font-bold text-red-100">
                  {leaveMutation.isPending ? '…' : 'Salir'}
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

function TabIcon({ emoji, color }: { emoji: string; color: string }) {
  return (
    <Text style={{ fontSize: 18, color, lineHeight: 20 }}>{emoji}</Text>
  );
}
