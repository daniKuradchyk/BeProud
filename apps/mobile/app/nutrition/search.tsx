import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';

import {
  searchFoodByText,
  searchLocalFoodItems,
  fetchRecentFoodsForUser,
  upsertOffProductAsFoodItem,
  type OffProduct,
  type FoodItem,
} from '@beproud/api';
import { MealTypeSchema } from '@beproud/validation';
import NutritionHeader from '@/components/nutrition/NutritionHeader';
import FoodRow from '@/components/nutrition/FoodRow';
import { useDebounce } from '@/lib/useDebounce';

type Hit =
  | { kind: 'local'; item: FoodItem }
  | { kind: 'off'; item: OffProduct };

export default function NutritionSearch() {
  const router = useRouter();
  const params = useLocalSearchParams<{ meal?: string }>();
  const meal = MealTypeSchema.safeParse(params.meal).success ? params.meal : null;

  const [text, setText] = useState('');
  const debounced = useDebounce(text.trim(), 300);

  const recentsQ = useQuery({
    queryKey: ['nutrition', 'recents'],
    queryFn: () => fetchRecentFoodsForUser(10),
  });

  const localQ = useQuery({
    queryKey: ['nutrition', 'search', 'local', debounced],
    queryFn: () => searchLocalFoodItems(debounced),
    enabled: debounced.length >= 2,
  });

  const offQ = useQuery({
    queryKey: ['nutrition', 'search', 'off', debounced],
    queryFn: () => searchFoodByText(debounced),
    enabled: debounced.length >= 2,
    staleTime: 60_000,
  });

  const merged = useMemo<Hit[]>(() => {
    const out: Hit[] = [];
    const seenExternal = new Set<string>();
    for (const it of localQ.data ?? []) {
      if (it.external_id) seenExternal.add(it.external_id);
      out.push({ kind: 'local', item: it });
    }
    for (const p of offQ.data ?? []) {
      if (seenExternal.has(p.code)) continue;
      out.push({ kind: 'off', item: p });
    }
    return out;
  }, [localQ.data, offQ.data]);

  const [busy, setBusy] = useState(false);

  async function selectLocal(item: FoodItem) {
    router.push(
      `/nutrition/food/${item.id}${meal ? `?meal=${meal}` : ''}` as never,
    );
  }

  async function selectOff(p: OffProduct) {
    if (busy) return;
    setBusy(true);
    try {
      const id = await upsertOffProductAsFoodItem(p);
      router.push(
        `/nutrition/food/${id}${meal ? `?meal=${meal}` : ''}` as never,
      );
    } catch {
      // si falla persistir, no podemos navegar al detalle.
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-brand-800">
      <NutritionHeader title="Buscar alimento" onBack={() => router.back()} />
      <View className="px-4 pb-2">
        <TextInput
          value={text}
          onChangeText={setText}
          autoFocus
          placeholder="Ej. yogur, manzana, pasta…"
          placeholderTextColor="#7894B5"
          accessibilityLabel="Buscador de alimentos"
          className="rounded-2xl bg-brand-700/40 px-4 py-3 text-base text-white"
        />
      </View>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {debounced.length < 2 && (recentsQ.data?.length ?? 0) > 0 && (
          <>
            <Text className="mb-2 text-xs uppercase tracking-wider text-brand-300">
              Mis recientes
            </Text>
            {(recentsQ.data ?? []).map((f) => (
              <FoodRow
                key={`r-${f.id}`}
                name={f.name}
                brand={f.brand}
                imageUrl={f.image_url}
                meta={`${Math.round(f.kcal_per_100g)} kcal/100g`}
                onPress={() => selectLocal(f)}
              />
            ))}
          </>
        )}

        {debounced.length >= 2 && (
          <>
            <Text className="mb-2 text-xs uppercase tracking-wider text-brand-300">
              Resultados
            </Text>
            {merged.length === 0 && !localQ.isLoading && !offQ.isLoading && (
              <Text className="text-sm text-brand-300">
                Sin resultados. Prueba otro término o crea uno personalizado.
              </Text>
            )}
            {merged.map((h, idx) =>
              h.kind === 'local' ? (
                <FoodRow
                  key={`l-${h.item.id}-${idx}`}
                  name={h.item.name}
                  brand={h.item.brand}
                  imageUrl={h.item.image_url}
                  meta={`${Math.round(h.item.kcal_per_100g)} kcal/100g`}
                  onPress={() => selectLocal(h.item)}
                />
              ) : (
                <FoodRow
                  key={`o-${h.item.code}-${idx}`}
                  name={h.item.name}
                  brand={h.item.brand}
                  imageUrl={h.item.image_url}
                  meta={`${Math.round(h.item.kcal_per_100g)} kcal/100g`}
                  onPress={() => selectOff(h.item)}
                />
              ),
            )}
          </>
        )}

        <Pressable
          accessibilityRole="button"
          onPress={() =>
            router.push(
              `/nutrition/custom-food${meal ? `?meal=${meal}` : ''}` as never,
            )
          }
          className="mt-4 items-center rounded-full bg-brand-700/40 py-3 active:bg-brand-600/60"
        >
          <Text className="text-sm font-bold text-brand-100">
            ✏️ Crear alimento personalizado
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
