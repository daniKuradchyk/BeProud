import { useEffect, useRef } from 'react';
import { Animated, Pressable, Text, View } from 'react-native';

import type { League } from '@beproud/api';

type Props = {
  from: League | null;
  to: League;
  direction: 'promote' | 'demote' | 'enter';
  onDismiss: () => void;
};

export default function LeagueChangeToast({
  from,
  to,
  direction,
  onDismiss,
}: Props) {
  const translateY = useRef(new Animated.Value(-80)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start();

    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: -80,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => onDismiss());
    }, 3000);

    return () => clearTimeout(timer);
  }, [to.id, onDismiss, opacity, translateY]);

  const headline =
    direction === 'promote'
      ? `Subiste a ${to.name}`
      : direction === 'demote'
        ? `Bajaste a ${to.name}`
        : `Entras en ${to.name}`;

  const subline =
    from && direction !== 'enter'
      ? `Desde ${from.name} → ${to.name}`
      : `Liga semanal · ${to.name}`;

  return (
    <Animated.View
      pointerEvents="box-none"
      style={{
        transform: [{ translateY }],
        opacity,
        position: 'absolute',
        top: 60,
        left: 12,
        right: 12,
        zIndex: 9999,
      }}
    >
      <Pressable
        accessibilityRole="alert"
        accessibilityLabel={headline}
        onPress={onDismiss}
        className="flex-row items-center rounded-2xl border p-3"
        style={{ backgroundColor: `#${to.color}1A`, borderColor: `#${to.color}66` }}
      >
        <View
          className="h-12 w-12 items-center justify-center rounded-xl"
          style={{ backgroundColor: `#${to.color}33` }}
        >
          <Text style={{ fontSize: 24 }}>{to.icon}</Text>
        </View>
        <View className="ml-3 flex-1">
          <Text className="text-[10px] font-extrabold uppercase tracking-wider text-white/80">
            Cambio de liga
          </Text>
          <Text className="text-sm font-extrabold text-white" numberOfLines={1}>
            {headline}
          </Text>
          <Text className="text-xs text-white/70" numberOfLines={1}>
            {subline}
          </Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}
