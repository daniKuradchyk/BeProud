import { useRouter } from 'expo-router';
import { Text } from 'react-native';

import Screen from '@/components/Screen';
import Button from '@/components/Button';
import WizardHeader from '@/components/WizardHeader';
import SelectableCard from '@/components/SelectableCard';
import { useOnboarding } from '@/lib/onboarding';
import {
  PRIMARY_GOALS,
  PRIMARY_GOAL_LABELS,
  type PrimaryGoal,
} from '@beproud/validation';

const DESC: Record<PrimaryGoal, string> = {
  lose_weight:    'Más cardio, déficit calórico estimado y bienestar.',
  gain_muscle:    'Más fuerza, proteína y descanso de calidad.',
  maintain:       'Mantener el ritmo actual sin grandes cambios.',
  performance:    'Subir nivel: rendimiento, foco y constancia.',
  general_health: 'Equilibrio entre hábitos saludables.',
};

const EMOJI: Record<PrimaryGoal, string> = {
  lose_weight:    '🔥',
  gain_muscle:    '💪',
  maintain:       '⚖️',
  performance:    '🚀',
  general_health: '🌱',
};

export default function Step3Goal() {
  const router = useRouter();
  const { primaryGoal, setPrimaryGoal } = useOnboarding();
  const canContinue = !!primaryGoal;

  return (
    <Screen scroll>
      <WizardHeader step={3} total={9} />

      <Text className="mb-2 text-3xl font-extrabold text-white">
        ¿Cuál es tu objetivo principal?
      </Text>
      <Text className="mb-6 text-base text-brand-200">
        Elige uno. Lo usamos para distribuir las tareas (más cardio, más
        fuerza, más equilibrio…) y calcular tus calorías sugeridas.
      </Text>

      {PRIMARY_GOALS.map((g) => (
        <SelectableCard
          key={g}
          title={PRIMARY_GOAL_LABELS[g]}
          description={DESC[g]}
          emoji={EMOJI[g]}
          selected={primaryGoal === g}
          onPress={() => setPrimaryGoal(primaryGoal === g ? null : g)}
          mode="single"
        />
      ))}

      <Button
        title="Continuar"
        onPress={() => router.push('/(onboarding)/step-4-availability')}
        disabled={!canContinue}
        className="mt-6"
      />
    </Screen>
  );
}
