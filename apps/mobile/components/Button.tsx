import { ActivityIndicator, Pressable, Text, View } from 'react-native';

type Variant = 'primary' | 'secondary' | 'ghost';

type Props = {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: Variant;
  className?: string;
  accessibilityLabel?: string;
};

export default function Button({
  title,
  onPress,
  loading,
  disabled,
  variant = 'primary',
  className,
  accessibilityLabel,
}: Props) {
  const isDisabled = !!(disabled || loading);
  const styles = stylesByVariant(variant, isDisabled);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      disabled={isDisabled}
      onPress={onPress}
      className={`w-full items-center rounded-full py-3 ${styles.bg} ${className ?? ''}`}
    >
      <View className="flex-row items-center gap-2">
        {loading && <ActivityIndicator color={styles.spinner} />}
        <Text className={`text-base font-bold ${styles.text}`}>{title}</Text>
      </View>
    </Pressable>
  );
}

function stylesByVariant(variant: Variant, disabled: boolean) {
  if (disabled) {
    return { bg: 'bg-brand-600/60', text: 'text-brand-200', spinner: '#A9C6E8' };
  }
  switch (variant) {
    case 'secondary':
      return {
        bg: 'bg-brand-700 active:bg-brand-600',
        text: 'text-white',
        spinner: '#fff',
      };
    case 'ghost':
      return {
        bg: 'bg-transparent active:bg-brand-700/60',
        text: 'text-brand-200',
        spinner: '#A9C6E8',
      };
    case 'primary':
    default:
      return {
        bg: 'bg-brand-400 active:bg-brand-300',
        text: 'text-brand-900',
        spinner: '#07121D',
      };
  }
}
