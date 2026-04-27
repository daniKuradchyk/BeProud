import { Text, type TextProps } from 'react-native';

type Tone = 1 | 2 | 3;
type Variant = 'caption' | 'overline';

type Props = Omit<TextProps, 'children'> & {
  variant?: Variant;
  tone?: Tone;
  className?: string;
  children: React.ReactNode;
};

const TONE_CLASS: Record<Tone, string> = {
  1: 'text-ink-1',
  2: 'text-ink-2',
  3: 'text-ink-3',
};

/** Texto pequeño: caption (13px) o overline (11px tracking-wider, mayúsculas). */
export default function Caption({
  variant = 'caption', tone = 2, className = '', children, ...rest
}: Props) {
  const sizeCls  = variant === 'overline' ? 'text-overline uppercase' : 'text-caption';
  return (
    <Text className={`${sizeCls} ${TONE_CLASS[tone]} ${className}`} {...rest}>
      {children}
    </Text>
  );
}
