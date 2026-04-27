import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import Button from '@/components/Button';
import Slider from '@/components/Slider';
import DatePickerInput from '@/components/DatePickerInput';
import MultiSelectChips from '@/features/onboarding/components/MultiSelectChips';
import { fetchMyProfile, updateBiometrics } from '@beproud/api';
import { useSession } from '@/lib/session';
import { backOrReplace } from '@/lib/navigation/back';
import {
  BIOLOGICAL_SEX,
  BIOLOGICAL_SEX_LABELS,
  EQUIPMENT_OPTIONS,
  EQUIPMENT_LABELS,
  EQUIPMENT_ICONS,
  PRIMARY_GOALS,
  PRIMARY_GOAL_LABELS,
  RESTRICTION_OPTIONS,
  RESTRICTION_LABELS,
  type BiologicalSex,
  type Equipment,
  type PrimaryGoal,
  type Restriction,
} from '@beproud/validation';

export default function BiometricsSettings() {
  const router = useRouter();
  const qc = useQueryClient();
  const { refreshProfile } = useSession();

  // Cache key unificada: el resto de la app usa ['profile','me'].
  // Antes esto era ['my-profile'] y al guardar invalidaba una key que nadie
  // más escuchaba → /nutrition seguía mostrando "Completa biometría".
  const profileQ = useQuery({
    queryKey: ['profile', 'me'],
    queryFn: fetchMyProfile,
  });

  const [birthDate,     setBirthDate]     = useState<string | null>(null);
  const [biologicalSex, setBiologicalSex] = useState<BiologicalSex | null>(null);
  const [heightCm,      setHeightCm]      = useState<number | null>(null);
  const [weightKg,      setWeightKg]      = useState<number | null>(null);
  const [primaryGoal,   setPrimaryGoal]   = useState<PrimaryGoal | null>(null);
  const [weeklyDays,    setWeeklyDays]    = useState<number | null>(null);
  const [dailyMinutes,  setDailyMinutes]  = useState<number | null>(null);
  const [equipment,     setEquipment]     = useState<Equipment[]>([]);
  const [restrictions,  setRestrictions]  = useState<Restriction[]>([]);
  const [error,         setError]         = useState<string | null>(null);
  const [savedAt,       setSavedAt]       = useState<number | null>(null);

  // Hidrata estado inicial al cargar el perfil.
  useEffect(() => {
    const p = profileQ.data;
    if (!p) return;
    setBirthDate(p.birth_date ?? null);
    setBiologicalSex(p.biological_sex ?? null);
    setHeightCm(p.height_cm ?? null);
    setWeightKg(p.weight_kg ?? null);
    setPrimaryGoal(p.primary_goal ?? null);
    setWeeklyDays(p.weekly_days ?? null);
    setDailyMinutes(p.daily_minutes ?? null);
    setEquipment((p.equipment ?? []) as Equipment[]);
    setRestrictions((p.restrictions ?? []) as Restriction[]);
  }, [profileQ.data?.id]);

  const saveMut = useMutation({
    mutationFn: () =>
      updateBiometrics({
        birth_date:     birthDate,
        biological_sex: biologicalSex,
        height_cm:      heightCm,
        weight_kg:      weightKg,
        primary_goal:   primaryGoal,
        weekly_days:    weeklyDays,
        daily_minutes:  dailyMinutes,
        equipment,
        restrictions,
      }),
    onSuccess: async () => {
      // Invalida todas las queries que dependen del profile + refresca la
      // sesión para que /nutrition, /fasting y RouteGuard vean los nuevos
      // datos sin esperar a la próxima recarga.
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['profile', 'me'] }),
        qc.invalidateQueries({ queryKey: ['nutrition', 'targets'] }),
        refreshProfile(),
      ]);
      setSavedAt(Date.now());
      setError(null);
    },
    onError: (e) => setError(e instanceof Error ? e.message : 'Error guardando'),
  });

  function toggle<T extends string>(arr: T[], v: T): T[] {
    return arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];
  }

  return (
    <SafeAreaView className="flex-1 bg-brand-800">
      <View className="flex-row items-center px-4 py-3">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Volver"
          onPress={() => backOrReplace(router, '/settings' as never)}
          hitSlop={12}
          className="px-2 py-1"
        >
          <Text className="text-base font-semibold text-brand-200">‹ Atrás</Text>
        </Pressable>
        <View className="flex-1 items-center">
          <Text className="text-base font-bold text-white">Datos biométricos</Text>
        </View>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <Text className="mb-4 text-sm text-brand-200">
          Estos datos se usan para personalizar tu rutina y calcular calorías
          sugeridas. Todos opcionales. Al guardar, regenera tu rutina desde
          Perfil → Regenerar mi rutina para que se apliquen.
        </Text>

        <DatePickerInput
          label="Fecha de nacimiento"
          value={birthDate}
          onChange={setBirthDate}
        />

        <Text className="mb-1 text-sm font-semibold text-brand-200">
          Sexo biológico
        </Text>
        <View className="mb-4 flex-row gap-2">
          {BIOLOGICAL_SEX.map((s) => (
            <Pressable
              key={s}
              accessibilityRole="radio"
              accessibilityState={{ checked: biologicalSex === s }}
              onPress={() =>
                setBiologicalSex(biologicalSex === s ? null : (s as BiologicalSex))
              }
              className={`flex-1 rounded-xl border p-3 ${
                biologicalSex === s
                  ? 'border-brand-300 bg-brand-300/15'
                  : 'border-brand-700 bg-brand-800/60'
              }`}
            >
              <Text
                className={`text-center text-sm font-bold ${
                  biologicalSex === s ? 'text-white' : 'text-brand-200'
                }`}
              >
                {BIOLOGICAL_SEX_LABELS[s]}
              </Text>
            </Pressable>
          ))}
        </View>

        <Slider
          label="Altura"
          value={heightCm ?? 170}
          min={140} max={220} step={1} suffix="cm"
          onChange={setHeightCm}
        />
        <Slider
          label="Peso"
          value={weightKg ?? 70}
          min={40} max={150} step={1} suffix="kg"
          onChange={setWeightKg}
        />

        <Text className="mb-2 mt-2 text-sm font-semibold text-brand-200">
          Objetivo principal
        </Text>
        <View className="mb-4 flex-row flex-wrap" style={{ marginHorizontal: -4 }}>
          {PRIMARY_GOALS.map((g) => (
            <View key={g} style={{ width: '50%', padding: 4 }}>
              <Pressable
                accessibilityRole="radio"
                accessibilityState={{ checked: primaryGoal === g }}
                onPress={() => setPrimaryGoal(primaryGoal === g ? null : g)}
                className={`rounded-xl border p-3 ${
                  primaryGoal === g
                    ? 'border-brand-300 bg-brand-300/15'
                    : 'border-brand-700 bg-brand-800/60'
                }`}
              >
                <Text
                  className={`text-sm font-bold ${
                    primaryGoal === g ? 'text-white' : 'text-brand-200'
                  }`}
                  numberOfLines={1}
                >
                  {PRIMARY_GOAL_LABELS[g]}
                </Text>
              </Pressable>
            </View>
          ))}
        </View>

        <Slider
          label="Días por semana"
          value={weeklyDays ?? 3}
          min={1} max={7} step={1} suffix="días"
          onChange={setWeeklyDays}
        />
        <Slider
          label="Minutos al día"
          value={dailyMinutes ?? 30}
          min={15} max={120} step={5} suffix="min"
          onChange={setDailyMinutes}
        />

        <Text className="mb-2 mt-3 text-sm font-semibold text-brand-200">
          Equipo
        </Text>
        <MultiSelectChips
          options={EQUIPMENT_OPTIONS.map((v) => ({
            value: v,
            label: EQUIPMENT_LABELS[v],
            icon: EQUIPMENT_ICONS[v],
          }))}
          selected={equipment}
          onToggle={(v) => setEquipment(toggle(equipment, v))}
          exclusiveNone="none"
        />

        <Text className="mb-2 mt-4 text-sm font-semibold text-brand-200">
          Restricciones
        </Text>
        <MultiSelectChips
          options={RESTRICTION_OPTIONS.map((v) => ({
            value: v,
            label: RESTRICTION_LABELS[v],
          }))}
          selected={restrictions}
          onToggle={(v) => setRestrictions(toggle(restrictions, v))}
          exclusiveNone="none"
        />

        {error && (
          <Text className="mt-3 text-sm text-red-400" accessibilityLiveRegion="polite">
            {error}
          </Text>
        )}
        {savedAt && !error && (
          <Text className="mt-3 text-sm text-emerald-300">Guardado ✓</Text>
        )}

        <Button
          title="Guardar"
          onPress={() => saveMut.mutate()}
          loading={saveMut.isPending}
          className="mt-6"
        />
      </ScrollView>
    </SafeAreaView>
  );
}
