import { Text, type TextProps } from 'react-native';

type Size = 'xl' | 'lg' | 'md' | 'sm';

type Props = Omit<TextProps, 'children'> & {
  size?: Size;
  className?: string;
  children: React.ReactNode;
};

const SIZE_CLASS: Record<Size, string> = {
  xl: 'text-display-xl text-ink-1',
  lg: 'text-display    text-ink-1',
  md: 'text-heading    text-ink-1',
  sm: 'text-subheading text-ink-1',
};

/** Heading tipográfico. Por defecto `lg` (display 32px). */
export default function Heading({ size = 'lg', className = '', children, ...rest }: Props) {
  return (
    <Text accessibilityRole="header" className={`${SIZE_CLASS[size]} ${className}`} {...rest}>
      {children}
    </Text>
  );
}
