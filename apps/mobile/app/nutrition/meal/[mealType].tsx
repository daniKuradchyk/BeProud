import { Alert, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { RefreshableScrollView } from '@/components/primitives';

import {
  fetchTodayMeals,
  removeMealLogItem,
  type MealLogWithItems,
} from '@beproud/api';
import {
  MealTypeSchema,
  MEAL_TYPE_LABELS,
  MEAL_TYPE_ICONS,
  type MealType,
} from '@beproud/validation';
import NutritionHeader from '@/components/nutrition/NutritionHeader';
import FoodRow from '@/components/nutrition/FoodRow';
import EmptyMeal from '@/components/nutrition/EmptyMeal';
import { backOrReplace } from '@/lib/navigation/back';

export default function MealDetail() {
  const router = useRouter();
  const qc = useQueryClient();
  const params = useLocalSearchParams<{ mealType?: string }>();
  const parsed = MealTypeSchema.safeParse(params.mealType);
  if (!parsed.success) {
    return (
      <SafeAreaView className="flex-1 bg-brand-800">
        <NutritionHeader
          title="Comida"
          onBack={() => backOrReplace(router, '/nutrition' as never)}
        />
        <Text className="px-6 text-brand-300">Comida no válida.</Text>
      </SafeAreaView>
    );
  }
  const mealType: MealType = parsed.data;
  const today = todayLocalISO();

  const mealsQ = useQuery({
    queryKey: ['nutrition', 'meals', today],
    queryFn: () => fetchTodayMeals(today),
  });

  const meal: MealLogWithItems | undefined = (mealsQ.data ?? []).find(
    (m) => m.meal_type === mealType,
  );
  const items = meal?.items ?? [];
  const totalKcal = items.reduce((acc, i) => acc + i.kcal, 0);

  const removeMut = useMutation({
    mutationFn: (id: string) => removeMealLogItem(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['nutrition', 'meals', today] });
      qc.invalidateQueries({ queryKey: ['nutrition', 'totals', today] });
    },
  });

  function confirmRemove(itemId: string, name: string) {
    Alert.alert('Eliminar', `¿Quitar "${name}" de la comida?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: () => removeMut.mutate(itemId),
      },
    ]);
  }

  return (
    <SafeAreaView className="flex-1 bg-brand-800">
      <NutritionHeader
        title={`${MEAL_TYPE_ICONS[mealType]} ${MEAL_TYPE_LABELS[mealType]}`}
        onBack={() => backOrReplace(router, '/nutrition' as never)}
      />
      <RefreshableScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <View className="mb-3 rounded-2xl border border-brand-700 bg-brand-800/60 p-4">
          <Text className="text-xs uppercase tracking-wider text-brand-300">Total</Text>
          <Text className="mt-1 text-2xl font-extrabold text-white">
            {Math.round(totalKcal)} kcal
          </Text>
          <Text className="text-xs text-brand-300">
            {items.length} {items.length === 1 ? 'alimento' : 'alimentos'}
          </Text>
        </View>

        {items.length === 0 ? (
          <EmptyMeal label={`${MEAL_TYPE_LABELS[mealType]} vacía`} />
        ) : (
          items.map((it) => (
            <FoodRow
              key={it.id}
              name={it.food.name}
              brand={it.food.brand}
              imageUrl={it.food.image_url}
              meta={`${Math.round(it.quantity_g)} g · ${Math.round(it.kcal)} kcal`}
              onLongPress={() => confirmRemove(it.id, it.food.name)}
              trailing={
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Eliminar ${it.food.name}`}
                  onPress={() => confirmRemove(it.id, it.food.name)}
                  hitSlop={8}
                  className="ml-2 h-8 w-8 items-center justify-center rounded-full bg-red-500/20 active:bg-red-500/40"
                >
                  <Text className="text-base font-bold text-red-300">✕</Text>
                </Pressable>
              }
            />
          ))
        )}

        <View className="mt-4 gap-2">
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push(`/nutrition/search?meal=${mealType}` as never)}
            className="items-center rounded-full bg-brand-300 py-3 active:bg-brand-200"
          >
            <Text className="text-sm font-extrabold text-brand-900">🔍 Buscar alimento</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push(`/nutrition/scan?meal=${mealType}` as never)}
            className="items-center rounded-full bg-brand-700/40 py-3 active:bg-brand-600/60"
          >
            <Text className="text-sm font-bold text-brand-100">📷 Escanear código</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push(`/nutrition/custom-food?meal=${mealType}` as never)}
            className="items-center rounded-full bg-brand-700/40 py-3 active:bg-brand-600/60"
          >
            <Text className="text-sm font-bold text-brand-100">✏️ Crear personalizado</Text>
          </Pressable>
        </View>
      </RefreshableScrollView>
    </SafeAreaView>
  );
}

function todayLocalISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
