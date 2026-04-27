import { useEffect, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { RefreshableScrollView } from '@/components/primitives';

import {
  fetchTargets,
  fetchMyProfile,
  recomputeTargets,
  updateTargetsManual,
} from '@beproud/api';
import { NutritionTargetsManualSchema } from '@beproud/validation';
import NutritionHeader from '@/components/nutrition/NutritionHeader';
import { backOrReplace } from '@/lib/navigation/back';

export default function TargetsScreen() {
  const router = useRouter();
  const qc = useQueryClient();

  const targetQ = useQuery({ queryKey: ['nutrition', 'targets'], queryFn: fetchTargets });
  const profileQ = useQuery({ queryKey: ['profile', 'me'], queryFn: fetchMyProfile });

  const profile = profileQ.data;
  const hasBiometrics = !!(
    profile?.birth_date && profile?.height_cm && profile?.weight_kg && profile?.biological_sex
  );

  const [kcal, setKcal] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!targetQ.data) return;
    setKcal(String(Math.round(targetQ.data.daily_kcal)));
    setProtein(String(Math.round(targetQ.data.daily_protein_g)));
    setCarbs(String(Math.round(targetQ.data.daily_carbs_g)));
    setFat(String(Math.round(targetQ.data.daily_fat_g)));
  }, [targetQ.data]);

  const recomputeMut = useMutation({
    mutationFn: () => recomputeTargets(true),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['nutrition', 'targets'] });
      qc.invalidateQueries({ queryKey: ['nutrition', 'totals'] });
    },
    onError: (e) => setError(e instanceof Error ? e.message : 'No se pudo recalcular'),
  });

  const saveMut = useMutation({
    mutationFn: () => {
      const payload = {
        daily_kcal: Number(kcal),
        daily_protein_g: Number(protein),
        daily_carbs_g: Number(carbs),
        daily_fat_g: Number(fat),
      };
      const parsed = NutritionTargetsManualSchema.safeParse(payload);
      if (!parsed.success) {
        throw new Error(parsed.error.issues[0]?.message ?? 'Valores inválidos');
      }
      return updateTargetsManual(parsed.data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['nutrition', 'targets'] });
      qc.invalidateQueries({ queryKey: ['nutrition', 'totals'] });
    },
    onError: (e) => setError(e instanceof Error ? e.message : 'No se pudo guardar'),
  });

  const t = targetQ.data;
  const sourceLabel =
    t?.source === 'manual' ? 'Manual' : t?.source === 'auto' ? 'Automático' : '—';

  return (
    <SafeAreaView className="flex-1 bg-brand-800">
      <NutritionHeader
        title="Objetivos diarios"
        onBack={() => backOrReplace(router, '/nutrition' as never)}
      />
      <RefreshableScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
      >
        {!hasBiometrics && (
          <View className="mb-3 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-3">
            <Text className="text-sm font-bold text-amber-200">
              Falta biometría
            </Text>
            <Text className="mt-1 text-xs text-amber-100/80">
              Para recalcular automáticamente necesitamos peso, altura, fecha de nacimiento y sexo biológico.
            </Text>
          </View>
        )}

        <View className="mb-3 rounded-2xl border border-brand-700 bg-brand-800/60 p-4">
          <Text className="text-xs uppercase tracking-wider text-brand-300">Origen</Text>
          <Text className="mt-1 text-base font-extrabold text-white">{sourceLabel}</Text>
          {t?.computed_at && (
            <Text className="text-xs text-brand-300">
              Calculado: {new Date(t.computed_at).toLocaleDateString('es-ES')}
            </Text>
          )}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Recalcular desde mi biometría"
            disabled={!hasBiometrics || recomputeMut.isPending}
            onPress={() => recomputeMut.mutate()}
            className={`mt-3 items-center rounded-full py-2.5 ${
              hasBiometrics ? 'bg-brand-300 active:bg-brand-200' : 'bg-brand-700/40'
            }`}
          >
            <Text
              className={`text-sm font-extrabold ${
                hasBiometrics ? 'text-brand-900' : 'text-brand-400'
              }`}
            >
              {recomputeMut.isPending ? 'Recalculando…' : 'Recalcular desde mi biometría'}
            </Text>
          </Pressable>
        </View>

        <Text className="mb-2 text-xs uppercase tracking-wider text-brand-300">
          Editar manualmente
        </Text>
        <Text className="mb-3 text-xs text-brand-300">
          Cambiar manualmente desactiva el recálculo automático cuando actualices tu peso.
        </Text>

        <NumericRow label="Calorías (kcal)" value={kcal}    onChange={setKcal} />
        <NumericRow label="Proteína (g)"    value={protein} onChange={setProtein} />
        <NumericRow label="Carbohidratos (g)" value={carbs}   onChange={setCarbs} />
        <NumericRow label="Grasas (g)"      value={fat}     onChange={setFat} />

        {error && <Text className="mt-2 text-sm text-red-400">{error}</Text>}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Guardar objetivos manuales"
          disabled={saveMut.isPending}
          onPress={() => {
            setError(null);
            saveMut.mutate();
          }}
          className="mt-4 items-center rounded-full bg-brand-300 py-3 active:bg-brand-200"
        >
          <Text className="text-base font-extrabold text-brand-900">
            {saveMut.isPending ? 'Guardando…' : 'Guardar manual'}
          </Text>
        </Pressable>
      </RefreshableScrollView>
    </SafeAreaView>
  );
}

function NumericRow({
  label, value, onChange,
}: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <View className="mb-3">
      <Text className="mb-1 text-xs uppercase tracking-wider text-brand-300">{label}</Text>
      <TextInput
        value={value}
        onChangeText={(t) => onChange(t.replace(',', '.').replace(/[^0-9.]/g, ''))}
        keyboardType="decimal-pad"
        accessibilityLabel={label}
        className="rounded-2xl bg-brand-700/40 px-4 py-3 text-base text-white"
      />
    </View>
  );
}
