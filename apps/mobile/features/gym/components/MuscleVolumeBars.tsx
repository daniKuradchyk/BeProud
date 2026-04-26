import { Text, View } from 'react-native';

import type { WeeklyVolumeEntry } from '@beproud/api';

const LABELS: Record<string, string> = {
  chest: 'Pecho',
  back: 'Espalda',
  shoulders: 'Hombros',
  arms: 'Brazos',
  legs: 'Piernas',
  glutes: 'Glúteos',
  core: 'Core',
  full_body: 'Full body',
  cardio_system: 'Cardio',
  lower_back: 'Lumbar',
};

type Props = {
  data: WeeklyVolumeEntry[];
};

/** Barras horizontales sin libs externas. Escala max relativa al máximo de la semana. */
export default function MuscleVolumeBars({ data }: Props) {
  if (data.length === 0) {
    return (
      <Text className="text-sm text-brand-300">
        Aún no has hecho sets esta semana.
      </Text>
    );
  }
  const max = Math.max(...data.map((d) => d.total_kg), 1);
  return (
    <View>
      {data.map((d) => {
        const pct = Math.max(2, Math.round((d.total_kg / max) * 100));
        return (
          <View key={d.muscle_group} className="mb-2">
            <View className="mb-1 flex-row justify-between">
              <Text className="text-xs font-bold text-white">
                {LABELS[d.muscle_group] ?? d.muscle_group}
              </Text>
              <Text className="text-xs text-brand-300">
                {d.sets} sets · {Math.round(d.total_kg)} kg
              </Text>
            </View>
            <View className="h-2 overflow-hidden rounded-full bg-brand-700/60">
              <View
                className="h-full bg-brand-300"
                style={{ width: `${pct}%` }}
              />
            </View>
          </View>
        );
      })}
    </View>
  );
}
