import { Text, type TextProps } from 'react-native';

type Size = 'lg' | 'md' | 'sm';
type Tone = 1 | 2 | 3;

type Props = Omit<TextProps, 'children'> & {
  size?: Size;
  tone?: Tone;
  className?: string;
  children: React.ReactNode;
};

const SIZE_CLASS: Record<Size, string> = {
  lg: 'text-body-lg',
  md: 'text-body',
  sm: 'text-caption',
};

const TONE_CLASS: Record<Tone, string> = {
  1: 'text-ink-1',
  2: 'text-ink-2',
  3: 'text-ink-3',
};

/** Texto de cuerpo. Tamaño `md` y tono `1` por defecto. */
export default function Body({
  size = 'md', tone = 1, className = '', children, ...rest
}: Props) {
  return (
    <Text className={`${SIZE_CLASS[size]} ${TONE_CLASS[tone]} ${className}`} {...rest}>
      {children}
    </Text>
  );
}
