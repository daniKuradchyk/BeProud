import { useMemo, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  addFoodToMeal,
  fetchMyProtocol,
  getFoodItem,
  logBreakEarly,
} from '@beproud/api';
import { MealTypeSchema, MEAL_TYPE_LABELS, type MealType } from '@beproud/validation';
import NutritionHeader from '@/components/nutrition/NutritionHeader';
import QuantityStepper from '@/components/nutrition/QuantityStepper';
import { computeFastingState } from '@/lib/fasting/computeState';
import { formatDuration } from '@/lib/fasting/format';

export default function FoodDetail() {
  const router = useRouter();
  const qc = useQueryClient();
  const params = useLocalSearchParams<{ foodId?: string; meal?: string }>();
  const foodId = typeof params.foodId === 'string' ? params.foodId : null;
  const mealParse = MealTypeSchema.safeParse(params.meal);
  const meal: MealType | null = mealParse.success ? mealParse.data : null;
  const today = todayLocalISO();

  const [quantity, setQuantity] = useState(100);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  const foodQ = useQuery({
    queryKey: ['food', foodId],
    queryFn: () => getFoodItem(foodId as string),
    enabled: !!foodId,
  });

  const fastingProtoQ = useQuery({
    queryKey: ['fasting', 'protocol'],
    queryFn: fetchMyProtocol,
  });
  const fastingState = useMemo(
    () => computeFastingState(fastingProtoQ.data ?? null),
    [fastingProtoQ.data],
  );

  const addMut = useMutation({
    mutationFn: () =>
      addFoodToMeal({
        mealType: meal as MealType,
        foodItemId: foodId as string,
        quantityG: quantity,
        date: today,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['nutrition', 'meals', today] });
      qc.invalidateQueries({ queryKey: ['nutrition', 'totals', today] });
      qc.invalidateQueries({ queryKey: ['nutrition', 'recents'] });
      qc.invalidateQueries({ queryKey: ['fasting'] });
      setSavedMsg('Añadido ✓');
      setTimeout(() => router.back(), 350);
    },
  });

  function onAddPress() {
    if (!meal) return;
    if (fastingState.phase === 'fasting' && fastingProtoQ.data) {
      const proto = fastingProtoQ.data;
      const startedAt = fastingState.windowClosedAt.toISOString();
      const now = new Date();
      Alert.alert(
        'Estás en ayuno',
        `Llevas ${formatDuration(fastingState.elapsedMs)} de ${formatDuration(fastingState.plannedMs)}. ¿Romper el ayuno y registrar este alimento?`,
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Romper y registrar',
            style: 'destructive',
            onPress: async () => {
              try {
                await logBreakEarly({
                  startedAt,
                  endedAt:    now.toISOString(),
                  protocol:   proto.protocol,
                  plannedMin: Math.round(fastingState.plannedMs / 60_000),
                  actualMin:  Math.round(fastingState.elapsedMs / 60_000),
                });
              } catch {
                // si falla el log, igualmente seguimos con la comida.
              }
              addMut.mutate();
            },
          },
        ],
      );
      return;
    }
    addMut.mutate();
  }

  if (!foodId) {
    return (
      <SafeAreaView className="flex-1 bg-brand-800">
        <NutritionHeader title="Alimento" onBack={() => router.back()} />
        <Text className="px-6 text-brand-300">Alimento no encontrado.</Text>
      </SafeAreaView>
    );
  }

  const food = foodQ.data;
  const factor = quantity / 100;
  const liveKcal    = food ? Math.round(food.kcal_per_100g * factor) : 0;
  const liveProtein = food ? Math.round(food.protein_per_100g * factor * 10) / 10 : 0;
  const liveCarbs   = food ? Math.round(food.carbs_per_100g * factor * 10) / 10 : 0;
  const liveFat     = food ? Math.round(food.fat_per_100g * factor * 10) / 10 : 0;

  return (
    <SafeAreaView className="flex-1 bg-brand-800">
      <NutritionHeader title={food?.name ?? 'Alimento'} onBack={() => router.back()} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {food?.image_url ? (
          <Image
            source={{ uri: food.image_url }}
            style={{ width: '100%', height: 160 }}
            resizeMode="cover"
            className="mb-3 rounded-2xl"
          />
        ) : null}

        {food && (
          <>
            <Text className="text-xl font-extrabold text-white">{food.name}</Text>
            {food.brand && (
              <Text className="text-sm text-brand-300">{food.brand}</Text>
            )}

            <View className="mt-4 rounded-2xl border border-brand-700 bg-brand-800/60 p-4">
              <Text className="mb-2 text-xs uppercase tracking-wider text-brand-300">
                Por 100 g
              </Text>
              <Macro label="Calorías" value={`${Math.round(food.kcal_per_100g)} kcal`} />
              <Macro label="Proteína" value={`${food.protein_per_100g} g`} />
              <Macro label="Carbohidratos" value={`${food.carbs_per_100g} g`} />
              <Macro label="Grasas" value={`${food.fat_per_100g} g`} />
              {food.sugars_per_100g != null && (
                <Macro label="Azúcares" value={`${food.sugars_per_100g} g`} />
              )}
              {food.fiber_per_100g != null && (
                <Macro label="Fibra" value={`${food.fiber_per_100g} g`} />
              )}
            </View>

            <View className="mt-4 rounded-2xl border border-brand-700 bg-brand-800/60 p-4">
              <Text className="mb-2 text-xs uppercase tracking-wider text-brand-300">
                Cantidad
              </Text>
              <QuantityStepper value={quantity} onChange={setQuantity} />
            </View>

            <View className="mt-4 rounded-2xl border border-brand-700 bg-brand-800/60 p-4">
              <Text className="mb-2 text-xs uppercase tracking-wider text-brand-300">
                Para {quantity} g
              </Text>
              <Macro label="Calorías" value={`${liveKcal} kcal`} />
              <Macro label="Proteína" value={`${liveProtein} g`} />
              <Macro label="Carbos"   value={`${liveCarbs} g`} />
              <Macro label="Grasas"   value={`${liveFat} g`} />
            </View>

            {savedMsg && (
              <Text className="mt-3 text-sm font-bold text-emerald-300">{savedMsg}</Text>
            )}

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                meal ? `Añadir a ${MEAL_TYPE_LABELS[meal]}` : 'Añadir'
              }
              disabled={!meal || addMut.isPending}
              onPress={onAddPress}
              className={`mt-6 items-center rounded-full py-3 ${
                meal && !addMut.isPending
                  ? 'bg-brand-300 active:bg-brand-200'
                  : 'bg-brand-700/40'
              }`}
            >
              <Text
                className={`text-base font-extrabold ${
                  meal && !addMut.isPending ? 'text-brand-900' : 'text-brand-400'
                }`}
              >
                {meal
                  ? `Añadir a ${MEAL_TYPE_LABELS[meal]}`
                  : 'Selecciona una comida desde el detalle'}
              </Text>
            </Pressable>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Macro({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-center justify-between py-1">
      <Text className="text-sm text-brand-200">{label}</Text>
      <Text className="text-sm font-bold text-white">{value}</Text>
    </View>
  );
}

function todayLocalISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
