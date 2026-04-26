import { useState } from 'react';
import { Text, View } from 'react-native';

import Screen from '@/components/Screen';
import Button from '@/components/Button';
import WizardHeader from '@/components/WizardHeader';
import { useOnboarding } from '@/lib/onboarding';
import { useSession } from '@/lib/session';
import { generateRoutine, updateBiometrics } from '@beproud/api';
import {
  TASK_CATEGORY_LABELS,
  PRIMARY_GOAL_LABELS,
  EQUIPMENT_LABELS,
  RESTRICTION_LABELS,
  type Equipment,
  type Restriction,
  type TaskCategory,
} from '@beproud/validation';
import {
  ageFromBirthDate,
  calculateBmr,
  calculateTdee,
  targetCalories,
} from '@/lib/calorieCalcs';

const AVAILABILITY_LABELS = {
  low: 'Poco tiempo',
  medium: 'Tiempo moderado',
  high: 'Mucho tiempo',
} as const;

const LEVEL_LABELS = {
  beginner: 'Empezando',
  intermediate: 'Cogiendo ritmo',
  advanced: 'A tope',
} as const;

export default function Step9Review() {
  const {
    asAnswers, reset,
    goals, preferenceCategories, availability, level,
    birthDate, biologicalSex, heightCm, weightKg,
    primaryGoal, weeklyDays, dailyMinutes,
    equipment, restrictions,
  } = useOnboarding();
  const { refreshRoutine, refreshProfile } = useSession();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const age = ageFromBirthDate(birthDate);
  const bmr = calculateBmr(weightKg, heightCm, age, biologicalSex);
  const tdee = calculateTdee(bmr, weeklyDays, dailyMinutes);
  const target = targetCalories(tdee, primaryGoal);

  const targetCount =
    dailyMinutes != null
      ? Math.max(3, Math.min(8, Math.floor(dailyMinutes / 12)))
      : availability === 'low'
        ? 3
        : availability === 'high'
          ? 7
          : 5;

  const focusCategories: TaskCategory[] =
    preferenceCategories.length > 0 ? preferenceCategories : goals;

  async function onConfirm() {
    setError(null);
    const answers = asAnswers();
    if (!answers) {
      setError('Faltan respuestas. Vuelve atrás y completa los pasos.');
      return;
    }
    setLoading(true);
    try {
      // 1) Persistimos biometría para que el RPC la lea desde profile.
      await updateBiometrics({
        birth_date:     birthDate ?? null,
        biological_sex: biologicalSex ?? null,
        height_cm:      heightCm ?? null,
        weight_kg:      weightKg ?? null,
        primary_goal:   primaryGoal ?? null,
        weekly_days:    weeklyDays ?? null,
        daily_minutes:  dailyMinutes ?? null,
        equipment:      equipment as Equipment[],
        restrictions:   restrictions as Restriction[],
      });
      // 2) Genera rutina.
      await generateRoutine(answers);
      // 3) Refresca caches y deja al RouteGuard llevar a /(tabs)/routine.
      await Promise.all([refreshProfile(), refreshRoutine()]);
      reset();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo generar la rutina.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen scroll>
      <WizardHeader step={9} total={9} />

      <Text className="mb-2 text-3xl font-extrabold text-white">
        Revisa tus respuestas
      </Text>
      <Text className="mb-6 text-base text-brand-200">
        Si todo cuadra, generamos tu rutina personalizada.
      </Text>

      {target != null && (
        <View className="mb-4 rounded-2xl border border-brand-300/40 bg-brand-300/10 p-4">
          <Text className="text-[10px] font-extrabold uppercase tracking-wider text-brand-100">
            Calorías sugeridas
          </Text>
          <Text className="mt-1 text-3xl font-extrabold text-white">
            ~{target} kcal/día
          </Text>
          <Text className="mt-1 text-xs text-brand-200">
            BMR ≈ {bmr} · TDEE ≈ {tdee} · ajuste por objetivo "
            {primaryGoal ? PRIMARY_GOAL_LABELS[primaryGoal] : '—'}".
          </Text>
        </View>
      )}

      <View className="mb-4 rounded-2xl border border-brand-700 bg-brand-800/60 p-4">
        <Text className="text-[10px] font-extrabold uppercase tracking-wider text-brand-300">
          Tareas previstas
        </Text>
        <Text className="mt-1 text-2xl font-extrabold text-white">
          {targetCount} tareas/día
        </Text>
        {dailyMinutes != null && (
          <Text className="text-xs text-brand-300">
            ~{dailyMinutes} min/día · {weeklyDays ?? '—'} días/sem
          </Text>
        )}
      </View>

      <Row label="Objetivo principal"
           value={primaryGoal ? PRIMARY_GOAL_LABELS[primaryGoal] : '—'} />
      <Row label="Disponibilidad"
           value={availability ? AVAILABILITY_LABELS[availability] : '—'} />
      <Row label="Nivel"
           value={level ? LEVEL_LABELS[level] : '—'} />
      <Row label="Foco principal"
           value={
             focusCategories.length > 0
               ? focusCategories.map((c) => TASK_CATEGORY_LABELS[c]).join(', ')
               : '—'
           } />
      <Row label="Equipo"
           value={
             equipment.length > 0
               ? (equipment as Equipment[]).map((e) => EQUIPMENT_LABELS[e]).join(', ')
               : '—'
           } />
      <Row label="Restricciones"
           value={
             restrictions.length > 0
               ? (restrictions as Restriction[]).map((r) => RESTRICTION_LABELS[r]).join(', ')
               : '—'
           } />
      {weightKg != null && heightCm != null && (
        <Row label="Cuerpo"
             value={`${weightKg} kg · ${heightCm} cm${age != null ? ` · ${age} años` : ''}`} />
      )}

      {error && (
        <Text className="mt-2 text-sm text-red-400" accessibilityLiveRegion="polite">
          {error}
        </Text>
      )}

      <Button
        title="Generar mi rutina"
        onPress={onConfirm}
        loading={loading}
        className="mt-6"
      />
    </Screen>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View className="mb-3 rounded-xl border border-brand-700 bg-brand-800/60 p-4">
      <Text className="mb-0.5 text-xs uppercase tracking-wider text-brand-300">
        {label}
      </Text>
      <Text className="text-base font-semibold text-white">{value}</Text>
    </View>
  );
}
