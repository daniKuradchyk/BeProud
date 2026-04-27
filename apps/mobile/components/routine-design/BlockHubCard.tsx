import { Pressable, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import {
  TIME_SLOT_ICONS,
  TIME_SLOT_LABELS,
  type WizardSlot,
} from '@beproud/validation';
import { Body, Caption, Heading } from '@/components/primitives';
import { haptic } from '@/lib/theme/haptics';

type Props = {
  slot: WizardSlot;
  count: number;
  /** stagger animation delay (ms). */
  delay?: number;
  onPress: () => void;
};

// Gradiente vertical (de arriba a abajo) implementado con stack de capas
// translúcidas — sin instalar expo-linear-gradient. Resultado: tinte cálido
// para morning, dorado para afternoon, violet-night para evening.
const GRADIENT_CLASS: Record<WizardSlot, string> = {
  morning:   'bg-amber-500/15',
  afternoon: 'bg-amber-400/20',
  evening:   'bg-bp-700/40',
};

const ACCENT_DOT: Record<WizardSlot, string> = {
  morning:   'bg-amber-400',
  afternoon: 'bg-amber-500',
  evening:   'bg-bp-400',
};

export default function BlockHubCard({
  slot, count, delay = 0, onPress,
}: Props) {
  const configured = count > 0;
  return (
    <Animated.View entering={FadeInDown.duration(420).delay(delay)}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${TIME_SLOT_LABELS[slot]}, ${configured ? `${count} tareas` : 'sin configurar'}`}
        onPress={() => { haptic.light(); onPress(); }}
        className={`mb-3 overflow-hidden rounded-xl border border-surface-3 ${GRADIENT_CLASS[slot]} active:opacity-80`}
      >
        <View className="flex-row items-center p-5">
          <View className="mr-4 h-14 w-14 items-center justify-center rounded-pill bg-surface-2">
            <Body size="lg">{TIME_SLOT_ICONS[slot]}</Body>
          </View>
          <View className="flex-1">
            {configured && (
              <View className="mb-1 flex-row items-center gap-1.5">
                <View className={`h-1.5 w-1.5 rounded-pill ${ACCENT_DOT[slot]}`} />
                <Caption variant="overline" tone={1} className="text-emerald-400">
                  ✓ Configurado
                </Caption>
              </View>
            )}
            <Heading size="sm">{TIME_SLOT_LABELS[slot]}</Heading>
            <Body size="sm" tone={2} className="mt-0.5">
              {configured
                ? `${count} ${count === 1 ? 'tarea configurada' : 'tareas configuradas'}`
                : 'Sin configurar'}
            </Body>
          </View>
          <Body size="md" tone={2}>{configured ? 'Editar →' : 'Diseñar →'}</Body>
        </View>
      </Pressable>
    </Animated.View>
  );
}
