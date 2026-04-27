import { View, type ViewProps } from 'react-native';

type Variant = 'flat' | 'elevated' | 'glow';

type Props = Omit<ViewProps, 'style'> & {
  variant?: Variant;
  padded?: boolean;
  className?: string;
};

const VARIANT_CLASS: Record<Variant, string> = {
  flat:     'bg-surface-1',
  elevated: 'bg-surface-2 shadow-lift-1',
  glow:     'bg-surface-2 border border-bp-500 shadow-glow-bp',
};

/**
 * Contenedor de tarjeta. `padded` añade `p-4` por defecto; pásalo en false
 * cuando quieras controlar el padding desde fuera.
 */
export default function Card({
  variant = 'flat', padded = true, className = '', children, ...rest
}: Props) {
  const padCls = padded ? 'p-4' : '';
  return (
    <View
      className={`rounded-lg ${VARIANT_CLASS[variant]} ${padCls} ${className}`}
      {...rest}
    >
      {children}
    </View>
  );
}
