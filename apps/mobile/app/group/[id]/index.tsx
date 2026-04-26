import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { useGlobalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';

import { fetchGroupById } from '@beproud/api';

type Card = {
  key: string;
  emoji: string;
  label: string;
  hint: string;
  href: string;
  modOnly?: boolean;
};

export default function GroupHome() {
  const router = useRouter();
  const { id } = useGlobalSearchParams<{ id: string }>();
  const group = useQuery({
    queryKey: ['group', id],
    queryFn: () => fetchGroupById(id),
    enabled: !!id,
  });

  if (group.isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-brand-800">
        <ActivityIndicator color="#A9C6E8" />
      </View>
    );
  }
  if (!group.data) {
    return (
      <View className="flex-1 items-center justify-center bg-brand-800 px-6">
        <Text className="text-base font-bold text-white">Grupo no encontrado</Text>
        <Text className="mt-1 text-center text-sm text-brand-200">
          No tienes acceso a este grupo o ya no existe.
        </Text>
      </View>
    );
  }

  const isMod =
    group.data.my_role === 'owner' || group.data.my_role === 'admin';

  const cards: Card[] = [
    { key: 'chat',        emoji: '💬', label: 'Chat',     hint: 'Habla con el grupo',         href: `/group/${id}/chat` },
    { key: 'leaderboard', emoji: '🏆', label: 'Ranking',  hint: 'Día · semana · mes',          href: `/group/${id}/leaderboard` },
    { key: 'members',     emoji: '👥', label: 'Miembros', hint: `${group.data.member_count} miembros`, href: `/group/${id}/members` },
    { key: 'invite',      emoji: '➕', label: 'Invitar',  hint: 'Añade gente con buscador',    href: `/group/${id}/invite`, modOnly: true },
    { key: 'settings',    emoji: '⚙️', label: 'Ajustes',  hint: 'Editar grupo + código',       href: `/group/${id}/settings`, modOnly: true },
  ];

  const visible = cards.filter((c) => !c.modOnly || isMod);

  return (
    <ScrollView
      className="flex-1 bg-brand-800"
      contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
    >
      {group.data.description && (
        <Text className="mb-4 text-sm text-brand-100">
          {group.data.description}
        </Text>
      )}

      <View className="flex-row flex-wrap" style={{ marginHorizontal: -4 }}>
        {visible.map((c) => (
          <View
            key={c.key}
            style={{ width: '50%', padding: 4 }}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={c.label}
              onPress={() => router.push(c.href as never)}
              className="rounded-2xl border border-brand-700 bg-brand-800/60 p-4 active:bg-brand-700/40"
              style={{ minHeight: 110 }}
            >
              <Text className="text-3xl">{c.emoji}</Text>
              <Text className="mt-2 text-base font-extrabold text-white">
                {c.label}
              </Text>
              <Text className="text-xs text-brand-300" numberOfLines={1}>
                {c.hint}
              </Text>
            </Pressable>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}
