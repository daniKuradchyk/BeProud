import { Pressable, Text, View } from 'react-native';
import { MEAL_TYPE_ICONS, MEAL_TYPE_LABELS, type MealType } from '@beproud/validation';

type Props = {
  mealType: MealType;
  kcal: number;
  itemsCount: number;
  onPress: () => void;
};

export default function MealCard({ mealType, kcal, itemsCount, onPress }: Props) {
  const empty = itemsCount === 0;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${MEAL_TYPE_LABELS[mealType]}, ${itemsCount} alimentos, ${Math.round(kcal)} kcal`}
      onPress={onPress}
      className="mb-3 flex-row items-center rounded-2xl border border-brand-700 bg-brand-800/60 p-4 active:bg-brand-700/40"
    >
      <Text className="mr-3 text-3xl" style={{ lineHeight: 36 }}>
        {MEAL_TYPE_ICONS[mealType]}
      </Text>
      <View className="flex-1">
        <Text className="text-base font-extrabold text-white">
          {MEAL_TYPE_LABELS[mealType]}
        </Text>
        <Text className="text-xs text-brand-300">
          {empty
            ? 'Vacío · toca para añadir'
            : `${itemsCount} ${itemsCount === 1 ? 'alimento' : 'alimentos'} · ${Math.round(kcal)} kcal`}
        </Text>
      </View>
      <Text className="text-base text-brand-300">›</Text>
    </Pressable>
  );
}
