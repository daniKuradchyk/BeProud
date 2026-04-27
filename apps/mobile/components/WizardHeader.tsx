import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { backOrReplace } from '@/lib/navigation/back';

type Props = {
  step: number;
  total: number;
  /** Si false, no muestra el botón "Atrás" (útil en el step 1). */
  canGoBack?: boolean;
  /** Texto del botón skip; si se pasa, se muestra el botón a la derecha. */
  skip?: { label: string; onPress: () => void };
};

const STEP_FALLBACKS: Record<number, string> = {
  2: '/(onboarding)/step-1-welcome',
  3: '/(onboarding)/step-2-biometrics',
  4: '/(onboarding)/step-3-goal',
  5: '/(onboarding)/step-4-availability',
  6: '/(onboarding)/step-5-equipment',
  7: '/(onboarding)/step-6-restrictions',
  8: '/(onboarding)/step-7-level',
  9: '/(onboarding)/step-8-preferences',
};

/** Cabecera de wizard con barra de progreso, contador y botón atrás. */
export default function WizardHeader({
  step,
  total,
  canGoBack = true,
  skip,
}: Props) {
  const router = useRouter();
  const pct = Math.round((step / total) * 100);
  return (
    <View className="mb-6">
      <View className="mb-3 flex-row items-center justify-between">
        {canGoBack ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Atrás"
            onPress={() => backOrReplace(
              router,
              (STEP_FALLBACKS[step] ?? '/(onboarding)/step-1-welcome') as never,
            )}
            hitSlop={12}
          >
            <Text className="text-base font-semibold text-brand-200">← Atrás</Text>
          </Pressable>
        ) : (
          <View />
        )}
        <Text className="text-xs font-semibold uppercase tracking-wider text-brand-300">
          Paso {step} de {total}
        </Text>
        {skip ? (
          <Pressable accessibilityRole="button" onPress={skip.onPress} hitSlop={12}>
            <Text className="text-sm font-semibold text-brand-200">{skip.label}</Text>
          </Pressable>
        ) : (
          <View />
        )}
      </View>
      <View className="h-1.5 overflow-hidden rounded-full bg-brand-700">
        <View
          className="h-1.5 rounded-full bg-brand-300"
          style={{ width: `${pct}%` }}
        />
      </View>
    </View>
  );
}
