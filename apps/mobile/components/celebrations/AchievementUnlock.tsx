import { useEffect } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, { SlideInUp, SlideOutUp } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Body, Caption } from '@/components/primitives';
import { haptic } from '@/lib/theme/haptics';

type Props = {
  visible: boolean;
  icon: string;
  title: string;
  description?: string;
  onClose: () => void;
  /** Auto-cerrar tras N ms. Default 4000. */
  autoCloseMs?: number;
};

/**
 * Toast XL animado por arriba al desbloquear un achievement. Dismissable
 * por tap. Se monta condicionalmente; el caller controla `visible`.
 */
export default function AchievementUnlock({
  visible, icon, title, description, onClose, autoCloseMs = 4000,
}: Props) {
  useEffect(() => {
    if (!visible) return;
    haptic.success();
    if (autoCloseMs <= 0) return;
    const timer = setTimeout(onClose, autoCloseMs);
    return () => clearTimeout(timer);
  }, [visible, autoCloseMs, onClose]);

  if (!visible) return null;

  return (
    <SafeAreaView
      pointerEvents="box-none"
      edges={['top']}
      className="absolute inset-x-0 top-0 px-4"
    >
      <Animated.View
        entering={SlideInUp.duration(280)}
        exiting={SlideOutUp.duration(200)}
      >
        <Pressable
          accessibilityRole="alert"
          accessibilityLabel={`Logro desbloqueado: ${title}`}
          onPress={onClose}
          className="mt-2 flex-row items-center rounded-xl border border-amber-500/40 bg-surface-2 p-4 shadow-lift-2"
        >
          <View className="mr-3 h-12 w-12 items-center justify-center rounded-pill bg-amber-500/20">
            <Text className="text-3xl" style={{ lineHeight: 32 }}>{icon}</Text>
          </View>
          <View className="flex-1">
            <Caption variant="overline" tone={1} className="text-amber-400">
              ✨ Logro desbloqueado
            </Caption>
            <Body size="md" tone={1} className="font-extrabold">{title}</Body>
            {description && (
              <Body size="sm" tone={2} className="mt-0.5">{description}</Body>
            )}
          </View>
        </Pressable>
      </Animated.View>
    </SafeAreaView>
  );
}
