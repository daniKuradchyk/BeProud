import { useEffect, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { RefreshableScrollView } from '@/components/primitives';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import {
  fetchTargets,
  fetchTodayTotals,
  fetchMyProfile,
  recomputeTargets,
} from '@beproud/api';
import { MEAL_TYPE_ORDER } from '@beproud/validation';
import DailyRings from '@/components/nutrition/DailyRings';
import MealCard from '@/components/nutrition/MealCard';
import { backOrReplace } from '@/lib/navigation/back';

function todayLocalISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseIso(iso: string): [number, number, number] {
  const parts = iso.split('-').map(Number) as [number, number, number];
  return parts;
}

function shiftIso(iso: string, days: number): string {
  const [y, m, d] = parseIso(iso);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

function humanDate(iso: string): string {
  const today = todayLocalISO();
  if (iso === today) return 'Hoy';
  if (iso === shiftIso(today, -1)) return 'Ayer';
  const [y, m, d] = parseIso(iso);
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'short' });
}

export default function NutritionDashboard() {
  const router = useRouter();
  const qc = useQueryClient();
  const [date, setDate] = useState<string>(todayLocalISO());
  const [autoComputed, setAutoComputed] = useState(false);

  const targetQ = useQuery({
    queryKey: ['nutrition', 'targets'],
    queryFn: fetchTargets,
  });
  const totalsQ = useQuery({
    queryKey: ['nutrition', 'totals', date],
    queryFn: () => fetchTodayTotals(date),
  });
  const profileQ = useQuery({
    queryKey: ['profile', 'me'],
    queryFn: fetchMyProfile,
  });

  const profile = profileQ.data;
  const hasBiometrics = !!(
    profile?.birth_date && profile?.height_cm && profile?.weight_kg && profile?.biological_sex
  );

  // Si no hay targets pero sí biometría, calcular automáticamente al primer mount.
  useEffect(() => {
    if (autoComputed) return;
    if (targetQ.isLoading || profileQ.isLoading) return;
    if (targetQ.data) return;
    if (!hasBiometrics) return;
    setAutoComputed(true);
    recomputeTargets()
      .then(() => qc.invalidateQueries({ queryKey: ['nutrition', 'targets'] }))
      .catch(() => {/* silencioso: el banner queda visible */});
  }, [autoComputed, targetQ.isLoading, targetQ.data, profileQ.isLoading, hasBiometrics, qc]);

  const totals = totalsQ.data;
  const target = targetQ.data ?? null;

  const today = todayLocalISO();
  const isToday = date === today;
  const canGoNext = !isToday;

  const banner = useMemo(() => {
    if (target) return null;
    if (hasBiometrics) {
      return (
        <Text className="text-xs text-brand-300">
          Calculando tus objetivos…
        </Text>
      );
    }
    return (
      <View className="mb-3 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-3">
        <Text className="text-sm font-bold text-amber-200">
          Completa tu biometría
        </Text>
        <Text className="mt-1 text-xs text-amber-100/80">
          Necesitamos tu peso, altura y fecha de nacimiento para calcular tus objetivos.
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Completar biometría"
          onPress={() => router.push('/settings/biometrics' as never)}
          className="mt-2 self-start rounded-full bg-amber-300 px-3 py-1.5 active:bg-amber-200"
        >
          <Text className="text-xs font-extrabold text-brand-900">Completar biometría</Text>
        </Pressable>
      </View>
    );
  }, [target, hasBiometrics, router]);

  return (
    <SafeAreaView className="flex-1 bg-brand-800">
      <View className="flex-row items-center px-4 py-3">
        <Pressable
          onPress={() => backOrReplace(router, '/(tabs)/routine' as never)}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Volver"
          className="px-2 py-1"
        >
          <Text className="text-base font-semibold text-brand-200">‹ Atrás</Text>
        </Pressable>
        <View className="flex-1 items-center">
          <Text className="text-base font-bold text-white">Nutrición</Text>
        </View>
        <Pressable
          onPress={() => router.push('/nutrition/targets' as never)}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Objetivos"
          className="px-2 py-1"
        >
          <Text className="text-base font-semibold text-brand-200">Objetivos</Text>
        </Pressable>
      </View>

      <RefreshableScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <View className="mb-3 flex-row items-center justify-between rounded-2xl border border-brand-700 bg-brand-800/60 p-3">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Día anterior"
            onPress={() => setDate(shiftIso(date, -1))}
            className="px-3 py-1"
          >
            <Text className="text-base text-brand-200">‹</Text>
          </Pressable>
          <Text className="text-sm font-bold capitalize text-white">
            {humanDate(date)}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Día siguiente"
            disabled={!canGoNext}
            onPress={() => canGoNext && setDate(shiftIso(date, 1))}
            className="px-3 py-1"
          >
            <Text className={`text-base ${canGoNext ? 'text-brand-200' : 'text-brand-500'}`}>›</Text>
          </Pressable>
        </View>

        {banner}

        <View className="mb-4">
          <DailyRings
            totals={totals ?? { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0, per_meal: { breakfast: { kcal: 0, items: 0 }, lunch: { kcal: 0, items: 0 }, snack: { kcal: 0, items: 0 }, dinner: { kcal: 0, items: 0 } } }}
            target={target}
          />
        </View>

        {MEAL_TYPE_ORDER.map((mt) => {
          const m = totals?.per_meal[mt] ?? { kcal: 0, items: 0 };
          return (
            <MealCard
              key={mt}
              mealType={mt}
              kcal={m.kcal}
              itemsCount={m.items}
              onPress={() => router.push(`/nutrition/meal/${mt}` as never)}
            />
          );
        })}

        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/nutrition/targets' as never)}
          className="mt-2 items-center rounded-full bg-brand-700/40 py-3 active:bg-brand-600/60"
        >
          <Text className="text-sm font-bold text-brand-100">Ver objetivos</Text>
        </Pressable>
      </RefreshableScrollView>
    </SafeAreaView>
  );
}
