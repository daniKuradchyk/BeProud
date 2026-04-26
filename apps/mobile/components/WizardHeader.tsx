import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

type Props = {
  step: number;
  total: number;
  /** Si false, no muestra el botón "Atrás" (útil en el step 1). */
  canGoBack?: boolean;
  /** Texto del botón skip; si se pasa, se muestra el botón a la derecha. */
  skip?: { label: string; onPress: () => void };
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
            onPress={() => router.back()}
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
