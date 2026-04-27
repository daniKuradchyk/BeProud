import { useEffect } from 'react';
import { Modal as RNModal, Pressable, Text, useWindowDimensions, View } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';

import { Body } from '@/components/primitives';
import { SPRING_BOUNCE } from '@/lib/theme/motion';
import { haptic } from '@/lib/theme/haptics';

type Props = {
  visible: boolean;
  level: number;
  onClose: () => void;
  /** Auto-cerrar tras N ms. Default 2200. */
  autoCloseMs?: number;
};

/**
 * Subida de nivel: flash blanco corto + onda violet radial + texto central.
 */
export default function LevelUp({ visible, level, onClose, autoCloseMs = 2200 }: Props) {
  const { width, height } = useWindowDimensions();
  const ringMax = Math.max(width, height) * 1.4;

  const flash = useSharedValue(0);
  const ring  = useSharedValue(0);
  const text  = useSharedValue(0.4);

  useEffect(() => {
    if (!visible) {
      flash.value = 0;
      ring.value = 0;
      text.value = 0.4;
      return;
    }
    haptic.heavy();
    flash.value = withSequence(
      withTiming(1, { duration: 60 }),
      withTiming(0, { duration: 200 }),
    );
    ring.value = withTiming(1, { duration: 700 });
    text.value = withDelay(150, withSpring(1, SPRING_BOUNCE));
    if (autoCloseMs > 0) {
      const t = setTimeout(onClose, autoCloseMs);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [visible, autoCloseMs, onClose, flash, ring, text]);

  const flashStyle = useAnimatedStyle(() => ({ opacity: flash.value }));
  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ring.value }],
    opacity: 1 - ring.value * 0.4,
  }));
  const textStyle = useAnimatedStyle(() => ({
    transform: [{ scale: text.value }],
    opacity: text.value,
  }));

  return (
    <RNModal visible={visible} transparent animationType="none" statusBarTranslucent>
      <Animated.View entering={FadeIn.duration(120)} exiting={FadeOut.duration(160)} className="flex-1">
        <BlurView intensity={40} tint="dark" className="absolute inset-0" />
        <Pressable accessibilityLabel="Cerrar" onPress={onClose} className="absolute inset-0" />
        <Animated.View style={flashStyle} className="absolute inset-0 bg-white" />
        <View pointerEvents="none" className="flex-1 items-center justify-center">
          <Animated.View
            style={[
              {
                position: 'absolute',
                width: ringMax,
                height: ringMax,
                borderRadius: ringMax / 2,
                borderWidth: 6,
                borderColor: '#A47FFF',
              },
              ringStyle,
            ]}
          />
          <Animated.View style={textStyle} className="items-center px-8">
            <Text className="text-display-xl text-bp-300">Nivel {level}</Text>
            <Body size="lg" tone={1} className="mt-2 text-center">
              Has subido de nivel
            </Body>
          </Animated.View>
        </View>
      </Animated.View>
    </RNModal>
  );
}
