import { useEffect, useRef } from 'react';
import { Animated, Pressable, Text, View } from 'react-native';

import type { Achievement } from '@beproud/api';

type Props = {
  achievement: Achievement;
  onDismiss: () => void;
};

export default function AchievementToast({ achievement, onDismiss }: Props) {
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
  }, [achievement.id, onDismiss, opacity, translateY]);

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
        accessibilityLabel={`Logro desbloqueado: ${achievement.title}`}
        onPress={onDismiss}
        className="flex-row items-center rounded-2xl border border-amber-300/40 bg-amber-300/15 p-3"
      >
        <View className="h-12 w-12 items-center justify-center rounded-xl bg-amber-300/30">
          <Text style={{ fontSize: 24 }}>{achievement.icon}</Text>
        </View>
        <View className="ml-3 flex-1">
          <Text className="text-[10px] font-extrabold uppercase tracking-wider text-amber-200">
            Logro desbloqueado
          </Text>
          <Text className="text-sm font-extrabold text-white" numberOfLines={1}>
            {achievement.title}
          </Text>
          <Text className="text-xs text-amber-100/80" numberOfLines={1}>
            {achievement.description}
          </Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}
