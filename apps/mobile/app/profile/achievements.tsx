import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';

import {
  fetchAllAchievements,
  type Achievement,
  type AchievementCategory,
} from '@beproud/api';

const CATEGORY_LABEL: Record<AchievementCategory, string> = {
  completion: 'Tareas',
  streak: 'Rachas',
  social: 'Social',
  points: 'Puntos',
  group: 'Grupos',
};

const CATEGORY_ORDER: AchievementCategory[] = [
  'completion',
  'streak',
  'social',
  'points',
  'group',
];

export default function AchievementsScreen() {
  const router = useRouter();
  const q = useQuery({
    queryKey: ['my-achievements'],
    queryFn: fetchAllAchievements,
  });

  const [picked, setPicked] = useState<Achievement | null>(null);

  const grouped = useMemo(() => {
    const map: Record<AchievementCategory, Achievement[]> = {
      completion: [],
      streak: [],
      social: [],
      points: [],
      group: [],
    };
    for (const a of q.data ?? []) map[a.category].push(a);
    return map;
  }, [q.data]);

  const total = q.data?.length ?? 0;
  const unlocked = (q.data ?? []).filter((a) => a.unlocked_at).length;

  return (
    <SafeAreaView className="flex-1 bg-brand-800">
      <View className="flex-row items-center px-4 py-3">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Volver"
          onPress={() => router.back()}
          hitSlop={12}
          className="px-2 py-1"
        >
          <Text className="text-base font-semibold text-brand-200">‹ Atrás</Text>
        </Pressable>
        <View className="flex-1 items-center">
          <Text className="text-base font-bold text-white">Logros</Text>
        </View>
        <View style={{ width: 60 }} />
      </View>

      {q.isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#A9C6E8" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
          <View className="mb-4 rounded-2xl border border-brand-700 bg-brand-800/60 p-4">
            <Text className="text-[10px] font-extrabold uppercase tracking-wider text-brand-300">
              Progreso
            </Text>
            <Text className="mt-1 text-2xl font-extrabold text-white">
              {unlocked} de {total} desbloqueados
            </Text>
            <View className="mt-3 h-2 overflow-hidden rounded-full bg-brand-700/60">
              <View
                className="h-full bg-brand-300"
                style={{
                  width: `${total === 0 ? 0 : Math.round((unlocked / total) * 100)}%`,
                }}
              />
            </View>
          </View>

          {CATEGORY_ORDER.map((cat) => {
            const list = grouped[cat];
            if (list.length === 0) return null;
            return (
              <View key={cat} className="mb-6">
                <Text className="mb-2 text-xs uppercase tracking-wider text-brand-300">
                  {CATEGORY_LABEL[cat]}
                </Text>
                <View className="flex-row flex-wrap" style={{ marginHorizontal: -4 }}>
                  {list.map((a) => (
                    <View
                      key={a.id}
                      style={{ width: '33.3333%', padding: 4 }}
                    >
                      <AchievementTile
                        achievement={a}
                        onPress={() => setPicked(a)}
                      />
                    </View>
                  ))}
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}

      <DetailModal achievement={picked} onClose={() => setPicked(null)} />
    </SafeAreaView>
  );
}

function AchievementTile({
  achievement,
  onPress,
}: {
  achievement: Achievement;
  onPress: () => void;
}) {
  const unlocked = !!achievement.unlocked_at;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${achievement.title}${unlocked ? ' · desbloqueado' : ' · bloqueado'}`}
      onPress={onPress}
      className={`items-center rounded-2xl border p-3 ${
        unlocked
          ? 'border-amber-300/40 bg-amber-300/10'
          : 'border-brand-700 bg-brand-800/40'
      }`}
      style={{ minHeight: 110 }}
    >
      <Text style={{ fontSize: 28, opacity: unlocked ? 1 : 0.35 }}>
        {achievement.icon}
      </Text>
      <Text
        className={`mt-2 text-center text-xs font-extrabold ${
          unlocked ? 'text-white' : 'text-brand-300'
        }`}
        numberOfLines={2}
      >
        {achievement.title}
      </Text>
    </Pressable>
  );
}

function DetailModal({
  achievement,
  onClose,
}: {
  achievement: Achievement | null;
  onClose: () => void;
}) {
  return (
    <Modal
      visible={!!achievement}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Cerrar"
        onPress={onClose}
        className="flex-1 items-center justify-center bg-black/60 px-6"
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          className="w-full max-w-sm rounded-2xl border border-brand-700 bg-brand-800 p-5"
        >
          {achievement && (
            <>
              <View className="items-center">
                <Text style={{ fontSize: 56 }}>{achievement.icon}</Text>
                <Text className="mt-2 text-lg font-extrabold text-white">
                  {achievement.title}
                </Text>
                <Text className="mt-1 text-center text-sm text-brand-200">
                  {achievement.description}
                </Text>
              </View>
              <View className="mt-4 rounded-xl bg-brand-700/40 p-3">
                {achievement.unlocked_at ? (
                  <Text className="text-center text-xs text-emerald-300">
                    Desbloqueado el{' '}
                    {new Date(achievement.unlocked_at).toLocaleDateString('es-ES')}
                  </Text>
                ) : (
                  <Text className="text-center text-xs text-brand-300">
                    Bloqueado · sigue completando tareas para conseguirlo.
                  </Text>
                )}
              </View>
            </>
          )}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Cerrar"
            onPress={onClose}
            className="mt-4 rounded-full bg-brand-700 py-2 active:bg-brand-600"
          >
            <Text className="text-center text-sm font-bold text-white">
              Cerrar
            </Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
