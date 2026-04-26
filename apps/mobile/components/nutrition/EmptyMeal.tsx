import { Text, View } from 'react-native';

export default function EmptyMeal({ label }: { label: string }) {
  return (
    <View className="items-center rounded-2xl border border-dashed border-brand-700 bg-brand-800/40 p-6">
      <Text className="mb-1 text-3xl">🍽️</Text>
      <Text className="text-sm font-bold text-white">{label}</Text>
      <Text className="mt-1 text-xs text-brand-300">
        Añade alimentos buscando, escaneando o creando uno personalizado.
      </Text>
    </View>
  );
}
