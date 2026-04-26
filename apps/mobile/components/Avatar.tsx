import { Image, Text, View } from 'react-native';

type Props = {
  url?: string | null;
  name?: string | null;
  /** Tamaño en px del lado */
  size?: number;
  className?: string;
};

/**
 * Avatar circular. Muestra la imagen si url está presente,
 * si no, una inicial sobre el color de marca.
 */
export default function Avatar({ url, name, size = 96, className }: Props) {
  const initial = (name?.trim()?.[0] ?? '?').toUpperCase();
  const rounded = { width: size, height: size, borderRadius: size / 2 };

  if (url) {
    return (
      <Image
        accessibilityLabel={name ? `Avatar de ${name}` : 'Avatar'}
        source={{ uri: url }}
        style={rounded}
        className={className}
      />
    );
  }
  return (
    <View
      accessibilityLabel={name ? `Avatar de ${name}` : 'Avatar'}
      style={rounded}
      className={`items-center justify-center bg-brand-500 ${className ?? ''}`}
    >
      <Text style={{ fontSize: size * 0.45 }} className="font-extrabold text-white">
        {initial}
      </Text>
    </View>
  );
}
