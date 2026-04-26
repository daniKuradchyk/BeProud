import { useEffect, useRef } from 'react';
import { Animated, Pressable, Text, View } from 'react-native';

import type { Notification } from '@beproud/api';

const ICON_BY_TYPE: Record<Notification['type'], string> = {
  new_like: '❤️',
  new_comment: '💬',
  new_follower: '👤',
  follow_request: '🙋',
  new_dm: '✉️',
  league_promotion: '🏆',
  achievement_unlocked: '🏅',
  daily_reminder: '⏰',
};

function bodyFor(n: Notification): string {
  const p = n.payload as Record<string, unknown>;
  switch (n.type) {
    case 'new_like':
      return `A @${p.liker_username ?? 'alguien'} le ha gustado tu publicación.`;
    case 'new_comment':
      return `@${p.commenter_username ?? 'alguien'} ha comentado en tu publicación.`;
    case 'new_follower':
      return `@${p.follower_username ?? 'alguien'} ha empezado a seguirte.`;
    case 'follow_request':
      return `@${p.follower_username ?? 'alguien'} quiere seguirte.`;
    case 'new_dm':
      return `@${p.sender_username ?? 'alguien'}: ${(p.preview as string) || 'mensaje nuevo'}`;
    case 'league_promotion':
      return '¡Has subido de liga esta semana!';
    case 'achievement_unlocked':
      return `${p.icon ?? '🏅'} ${p.title ?? 'Logro nuevo'}`;
    case 'daily_reminder':
      return 'Hoy también vas a sumar puntos. 💪';
  }
}

type Props = {
  notification: Notification;
  onPress?: () => void;
  onDismiss: () => void;
};

export default function NotificationToast({ notification, onPress, onDismiss }: Props) {
  const translateY = useRef(new Animated.Value(-80)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(translateY, { toValue: 0, duration: 220, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }),
    ]).start();
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(translateY, { toValue: -80, duration: 200, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start(() => onDismiss());
    }, 3500);
    return () => clearTimeout(timer);
  }, [notification.id, onDismiss, opacity, translateY]);

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
        zIndex: 9998,
      }}
    >
      <Pressable
        accessibilityRole="alert"
        accessibilityLabel={bodyFor(notification)}
        onPress={() => {
          onPress?.();
          onDismiss();
        }}
        className="flex-row items-center rounded-2xl border border-brand-300/40 bg-brand-300/15 p-3"
      >
        <View className="h-12 w-12 items-center justify-center rounded-xl bg-brand-300/30">
          <Text style={{ fontSize: 24 }}>{ICON_BY_TYPE[notification.type]}</Text>
        </View>
        <View className="ml-3 flex-1">
          <Text className="text-[10px] font-extrabold uppercase tracking-wider text-brand-100">
            Notificación
          </Text>
          <Text className="text-sm text-white" numberOfLines={2}>
            {bodyFor(notification)}
          </Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

export { bodyFor as buildNotificationBody };
