import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { useQuery } from '@tanstack/react-query';

import { countUnread, fetchPendingCount } from '@beproud/api';

/**
 * Tab bar de la app. 5 pestañas oficiales.
 * "Crear" se sustituyó por "Buscar" (lupa) en Fase 5.
 * El badge de Perfil suma follow requests pending + threads con mensajes
 * sin leer (Fase 6).
 */
export default function TabsLayout() {
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
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#07121D',
          borderTopColor: '#1F4E79',
          borderTopWidth: 1,
        },
        tabBarActiveTintColor: '#A9C6E8',
        tabBarInactiveTintColor: '#5A88B8',
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tabs.Screen
        name="routine"
        options={{
          title: 'Rutina',
          tabBarIcon: ({ color }) => <TabIcon emoji="✓" color={color} />,
        }}
      />
      <Tabs.Screen
        name="feed"
        options={{
          title: 'Feed',
          tabBarIcon: ({ color }) => <TabIcon emoji="🏠" color={color} />,
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: 'Buscar',
          tabBarIcon: ({ color }) => <TabIcon emoji="🔍" color={color} bigger />,
        }}
      />
      <Tabs.Screen
        name="rankings"
        options={{
          title: 'Rankings',
          tabBarIcon: ({ color }) => <TabIcon emoji="🏆" color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color }) => <TabIcon emoji="👤" color={color} />,
          tabBarBadge: profileBadge > 0 ? profileBadge : undefined,
          tabBarBadgeStyle: {
            backgroundColor: '#1F4E79',
            color: 'white',
            fontSize: 10,
          },
        }}
      />
    </Tabs>
  );
}

function TabIcon({
  emoji,
  color,
  bigger,
}: {
  emoji: string;
  color: string;
  bigger?: boolean;
}) {
  return (
    <Text style={{ fontSize: bigger ? 28 : 20, color, lineHeight: bigger ? 30 : 22 }}>
      {emoji}
    </Text>
  );
}
