import { Text, View } from 'react-native';
import MacroBar from './MacroBar';
import type { DayTotals, NutritionTarget } from '@beproud/api';

type Props = {
  totals: DayTotals;
  target: NutritionTarget | null;
};

/**
 * 4 barras horizontales (kcal + 3 macros) con su consumo del día.
 * Usamos barras y no anillos circulares para evitar dependencias de SVG;
 * mismo concepto, más sencillo en RN puro.
 */
export default function DailyRings({ totals, target }: Props) {
  if (!target) {
    return (
      <View className="rounded-2xl border border-brand-700 bg-brand-800/60 p-4">
        <Text className="text-sm text-brand-200">
          Configura tus objetivos diarios para ver el progreso de macros.
        </Text>
      </View>
    );
  }
  return (
    <View className="rounded-2xl border border-brand-700 bg-brand-800/60 p-4">
      <MacroBar
        label="Calorías"
        consumed={totals.kcal}
        target={target.daily_kcal}
        unit="kcal"
        color="#FACC15"
      />
      <MacroBar
        label="Proteína"
        consumed={totals.protein_g}
        target={target.daily_protein_g}
        unit="g"
        color="#F87171"
      />
      <MacroBar
        label="Carbos"
        consumed={totals.carbs_g}
        target={target.daily_carbs_g}
        unit="g"
        color="#7DD3FC"
      />
      <MacroBar
        label="Grasas"
        consumed={totals.fat_g}
        target={target.daily_fat_g}
        unit="g"
        color="#A78BFA"
      />
    </View>
  );
}
