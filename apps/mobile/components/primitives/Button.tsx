import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, Text, type PressableProps } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { SPRING_SNAPPY } from '@/lib/theme/motion';
import { haptic } from '@/lib/theme/haptics';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

type Props = Omit<PressableProps, 'onPress' | 'style'> & {
  title: string;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  disabled?: boolean;
  className?: string;
  /** Disparar `haptic.success` tras un onPress async exitoso. Default true. */
  hapticOnSuccess?: boolean;
  onPress?: () => void | Promise<void>;
};

const VARIANT_CLASS: Record<Variant, string> = {
  primary:   'bg-bp-500 active:bg-bp-600 shadow-glow-bp',
  secondary: 'bg-surface-2 active:bg-surface-3 border border-surface-3',
  ghost:     'bg-transparent active:bg-surface-2',
  danger:    'bg-coral-500 active:bg-coral-400',
};

const VARIANT_TEXT: Record<Variant, string> = {
  primary:   'text-ink-0',
  secondary: 'text-ink-1',
  ghost:     'text-bp-300',
  danger:    'text-ink-0',
};

const SIZE_CLASS: Record<Size, string> = {
  sm: 'h-9  px-4 rounded-pill',
  md: 'h-12 px-5 rounded-pill',
  lg: 'h-14 px-6 rounded-pill',
};

const SIZE_TEXT: Record<Size, string> = {
  sm: 'text-caption font-extrabold',
  md: 'text-body-lg font-extrabold',
  lg: 'text-subheading',
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * Botón base de la app. Variantes: primary | secondary | ghost | danger.
 * Animación de scale al press y haptic feedback configurable.
 */
export default function Button({
  title, variant = 'primary', size = 'md', loading = false, disabled = false,
  className = '', hapticOnSuccess = true, onPress, accessibilityLabel, ...rest
}: Props) {
  const scale = useSharedValue(1);
  const [busy, setBusy] = useState(false);

  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const onPressIn = useCallback(() => {
    scale.value = withSpring(0.97, SPRING_SNAPPY);
    haptic.light();
  }, [scale]);

  const onPressOut = useCallback(() => {
    scale.value = withSpring(1, SPRING_SNAPPY);
  }, [scale]);

  const handlePress = useCallback(async () => {
    if (!onPress) return;
    try {
      setBusy(true);
      const result = onPress();
      if (result && typeof (result as Promise<void>).then === 'function') {
        await result;
      }
      if (hapticOnSuccess) haptic.success();
    } catch {
      haptic.error();
    } finally {
      setBusy(false);
    }
  }, [onPress, hapticOnSuccess]);

  const isDisabled = disabled || loading || busy;
  const variantCls = VARIANT_CLASS[variant];
  const textCls    = VARIANT_TEXT[variant];
  const sizeCls    = SIZE_CLASS[size];
  const textSize   = SIZE_TEXT[size];

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled: isDisabled, busy: loading || busy }}
      disabled={isDisabled}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      onPress={handlePress}
      style={animatedStyle}
      className={`flex-row items-center justify-center ${sizeCls} ${variantCls} ${
        isDisabled ? 'opacity-50' : ''
      } ${className}`}
      {...rest}
    >
      {(loading || busy) ? (
        <ActivityIndicator size="small" color="#FFFFFF" />
      ) : (
        <Text className={`${textSize} ${textCls}`}>{title}</Text>
      )}
    </AnimatedPressable>
  );
}
