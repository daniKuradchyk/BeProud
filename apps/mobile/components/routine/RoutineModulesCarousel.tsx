import { ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';

import ModuleCard from './ModuleCard';
import { loadTodayModules } from '@/lib/modules';

/**
 * Carrusel "Hoy" en lo alto de Rutina. Renderiza una card por módulo
 * activo. Si todos los adapters devuelven null, el carrusel no monta.
 */
export default function RoutineModulesCarousel() {
  const router = useRouter();
  const q = useQuery({
    queryKey: ['routine-today-modules'],
    queryFn: loadTodayModules,
    refetchInterval: 60_000,
  });

  const items = q.data ?? [];
  if (items.length === 0) return null;

  return (
    <View className="mb-6" accessibilityRole="list">
      <Text className="mb-2 text-xs uppercase tracking-wider text-brand-300">
        Hoy
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={232}
        decelerationRate="fast"
        contentContainerStyle={{ paddingRight: 12 }}
      >
        {items.map((m) => (
          <ModuleCard
            key={m.id}
            summary={m}
            onPress={() => router.push(m.route as never)}
          />
        ))}
      </ScrollView>
    </View>
  );
}
