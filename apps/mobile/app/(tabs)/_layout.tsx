import { Tabs } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect } from 'react';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useQuery } from '@tanstack/react-query';

import { countUnread, fetchPendingCount } from '@beproud/api';
import { SPRING_SNAPPY } from '@/lib/theme/motion';
import { haptic } from '@/lib/theme/haptics';

const TAB_META: Record<string, { label: string; emoji: string }> = {
  routine:  { label: 'Rutina',   emoji: '✓' },
  feed:     { label: 'Feed',     emoji: '🏠' },
  search:   { label: 'Buscar',   emoji: '🔍' },
  rankings: { label: 'Rankings', emoji: '🏆' },
  profile:  { label: 'Perfil',   emoji: '👤' },
};

/**
 * Tab bar custom (Fase 17): 5 tabs nativas + un FAB violet flotante en el
 * centro que navega a la pantalla Rutina (entrada rápida al flujo principal
 * de completar tareas). Haptic al cambiar tab. Badge de pendientes en Perfil.
 */
export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <CustomTabBar {...props} />}
    >
      <Tabs.Screen name="routine"  options={{ title: 'Rutina' }} />
      <Tabs.Screen name="feed"     options={{ title: 'Feed' }} />
      <Tabs.Screen name="search"   options={{ title: 'Buscar' }} />
      <Tabs.Screen name="rankings" options={{ title: 'Rankings' }} />
      <Tabs.Screen name="profile"  options={{ title: 'Perfil' }} />
    </Tabs>
  );
}

// Tipo mínimo para el componente custom tabBar de @react-navigation/bottom-tabs.
// Evitamos importar el tipo completo del paquete (que no exporta tipos de
// forma resoluble desde expo-router) declarando solo lo que usamos.
type CustomTabBarProps = {
  state: { index: number; routes: { key: string; name: string }[] };
  navigation: { navigate: (name: string) => void };
};

function CustomTabBar({ state, navigation }: CustomTabBarProps) {
  const pending = useQuery({
    queryKey: ['follow-requests-count'],
    queryFn: fetchPendingCount,
    refetchInterval: 60_000,
  });
  const unread = useQuery({
    queryKey: ['unread-count'],
    queryFn: countUnread,
    refetchInterval: 60_000,
  });
  const profileBadge = (pending.data ?? 0) + (unread.data ?? 0);

  return (
    <SafeAreaView edges={['bottom']} className="bg-surface-1">
      <View className="flex-row items-end border-t border-surface-3 bg-surface-1 px-2 pb-1 pt-2">
        {state.routes.map((route, idx) => {
          const focused = state.index === idx;
          const meta = TAB_META[route.name] ?? { label: route.name, emoji: '·' };
          const badge = route.name === 'profile' ? profileBadge : 0;
          return (
            <TabItem
              key={route.key}
              emoji={meta.emoji}
              label={meta.label}
              focused={focused}
              badge={badge}
              onPress={() => {
                if (focused) return;
                haptic.tap();
                navigation.navigate(route.name);
              }}
            />
          );
        })}
      </View>
      {/* FAB removido tras feedback: confundía porque parecía un botón
          extra sin acción real. Si se reintroduce en el futuro, debe abrir
          un modal de completar tarea, no duplicar la tab de Rutina. */}
    </SafeAreaView>
  );
}

function TabItem({
  emoji, label, focused, badge, onPress,
}: {
  emoji: string;
  label: string;
  focused: boolean;
  badge: number;
  onPress: () => void;
}) {
  const scale = useSharedValue(focused ? 1.1 : 1);

  // Animar el scale en respuesta a cambios de focused desde el hilo JS
  // (más predecible que mutar el shared value dentro del worklet de estilo).
  useEffect(() => {
    scale.value = withSpring(focused ? 1.1 : 1, SPRING_SNAPPY);
  }, [focused, scale]);

  const animated = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: focused }}
      onPress={onPress}
      className="flex-1 items-center py-1"
    >
      <View className="relative">
        <Animated.Text
          style={[animated, { fontSize: 22, lineHeight: 24 }]}
          className={focused ? 'opacity-100' : 'opacity-60'}
        >
          {emoji}
        </Animated.Text>
        {badge > 0 && (
          <View className="absolute -right-2 -top-1 h-4 min-w-4 items-center justify-center rounded-pill bg-coral-500 px-1">
            <Text className="text-[10px] font-extrabold text-ink-0">
              {badge > 9 ? '9+' : badge}
            </Text>
          </View>
        )}
      </View>
      <Text
        className={`mt-1 text-[10px] font-bold ${focused ? 'text-bp-300' : 'text-ink-3'}`}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
}
