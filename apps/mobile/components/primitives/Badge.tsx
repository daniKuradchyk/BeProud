import { Text, View } from 'react-native';

type Variant = 'default' | 'success' | 'warning' | 'danger' | 'info';

type Props = {
  label: string | number;
  variant?: Variant;
  className?: string;
};

const VARIANT_CLASS: Record<Variant, string> = {
  default: 'bg-surface-3',
  success: 'bg-emerald-500/20',
  warning: 'bg-amber-500/20',
  danger:  'bg-coral-500/20',
  info:    'bg-bp-500/20',
};

const VARIANT_TEXT: Record<Variant, string> = {
  default: 'text-ink-2',
  success: 'text-emerald-400',
  warning: 'text-amber-400',
  danger:  'text-coral-400',
  info:    'text-bp-300',
};

/** Badge pill compacto para racha, nivel, contadores, estados. */
export default function Badge({ label, variant = 'default', className = '' }: Props) {
  return (
    <View
      className={`self-start rounded-pill px-2 py-0.5 ${VARIANT_CLASS[variant]} ${className}`}
    >
      <Text className={`text-overline ${VARIANT_TEXT[variant]}`}>{label}</Text>
    </View>
  );
}
