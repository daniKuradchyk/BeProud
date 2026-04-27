import { Pressable, Text } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { SPRING_SNAPPY } from '@/lib/theme/motion';
import { haptic } from '@/lib/theme/haptics';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type Props = {
  onPress: () => void;
  accessibilityLabel?: string;
};

/**
 * FAB central de la tab bar. Botón circular grande con sombra glow violet
 * que se eleva sobre el resto de iconos. Animación de scale al press.
 */
export default function TabBarFab({ onPress, accessibilityLabel = 'Crear' }: Props) {
  const scale = useSharedValue(1);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPressIn={() => { scale.value = withSpring(0.92, SPRING_SNAPPY); haptic.medium(); }}
      onPressOut={() => { scale.value = withSpring(1, SPRING_SNAPPY); }}
      onPress={onPress}
      style={animated}
      className="h-14 w-14 items-center justify-center rounded-pill bg-bp-500 shadow-glow-bp"
    >
      <Text className="text-3xl font-extrabold text-ink-0" style={{ lineHeight: 32 }}>+</Text>
    </AnimatedPressable>
  );
}
