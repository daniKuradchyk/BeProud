import { Pressable, Text, View } from 'react-native';

type Props = {
  title: string;
  onBack: () => void;
  right?: React.ReactNode;
};

export default function FastingHeader({ title, onBack, right }: Props) {
  return (
    <View className="flex-row items-center px-4 py-3">
      <Pressable
        onPress={onBack}
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel="Volver"
        className="px-2 py-1"
      >
        <Text className="text-base font-semibold text-brand-200">‹ Atrás</Text>
      </Pressable>
      <View className="flex-1 items-center">
        <Text className="text-base font-bold text-white" numberOfLines={1}>
          {title}
        </Text>
      </View>
      <View style={{ minWidth: 60 }} className="items-end">{right}</View>
    </View>
  );
}
