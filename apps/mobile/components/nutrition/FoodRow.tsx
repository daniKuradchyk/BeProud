import { Pressable, Text, View, Image } from 'react-native';

type Props = {
  name: string;
  brand?: string | null;
  imageUrl?: string | null;
  meta: string;       // ej "150 g · 280 kcal"
  onPress?: () => void;
  onLongPress?: () => void;
  trailing?: React.ReactNode;
};

export default function FoodRow({
  name, brand, imageUrl, meta, onPress, onLongPress, trailing,
}: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${name}${brand ? ` ${brand}` : ''}, ${meta}`}
      onPress={onPress}
      onLongPress={onLongPress}
      className="mb-2 flex-row items-center rounded-2xl border border-brand-700 bg-brand-800/60 p-3 active:bg-brand-700/40"
    >
      <View className="mr-3 h-10 w-10 items-center justify-center overflow-hidden rounded-md bg-brand-700/40">
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} className="h-10 w-10" resizeMode="cover" />
        ) : (
          <Text className="text-lg">🍽️</Text>
        )}
      </View>
      <View className="flex-1 pr-2">
        <Text className="text-sm font-bold text-white" numberOfLines={1}>
          {name}
        </Text>
        <Text className="text-xs text-brand-300" numberOfLines={1}>
          {brand ? `${brand} · ${meta}` : meta}
        </Text>
      </View>
      {trailing}
    </Pressable>
  );
}
