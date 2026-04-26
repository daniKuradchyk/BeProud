import { useRouter } from 'expo-router';
import { Text } from 'react-native';

import Screen from '@/components/Screen';
import Button from '@/components/Button';
import WizardHeader from '@/components/WizardHeader';
import SelectableCard from '@/components/SelectableCard';
import { useOnboarding } from '@/lib/onboarding';
import {
  TASK_CATEGORIES,
  TASK_CATEGORY_LABELS,
  type TaskCategory,
} from '@beproud/validation';

const DESCRIPTIONS: Record<TaskCategory, string> = {
  fitness:      'Gym, cardio, deporte, movilidad.',
  study:        'Lectura, idiomas, cursos, foco.',
  nutrition:    'Comer mejor, hidratación, meal prep.',
  wellbeing:    'Meditación, descanso, naturaleza.',
  productivity: 'Deep work, organización, hábitos.',
  social:       'Familia, amigos, voluntariado.',
};

const EMOJIS: Record<TaskCategory, string> = {
  fitness:      '💪',
  study:        '📚',
  nutrition:    '🥗',
  wellbeing:    '🧘',
  productivity: '🎯',
  social:       '🤝',
};

export default function Step8Preferences() {
  const router = useRouter();
  const { goals, toggleGoal, preferenceCategories, togglePreferenceCategory } =
    useOnboarding();
  const canContinue = goals.length > 0;

  return (
    <Screen scroll>
      <WizardHeader step={8} total={9} />

      <Text className="mb-2 text-3xl font-extrabold text-white">
        ¿Qué áreas quieres mezclar?
      </Text>
      <Text className="mb-3 text-base text-brand-200">
        Marca al menos una. Si quieres dar más peso a algo concreto, márcalo
        también como "Foco" tras seleccionarlo.
      </Text>

      {TASK_CATEGORIES.map((cat) => {
        const inGoals = goals.includes(cat);
        const inFocus = preferenceCategories.includes(cat);
        return (
          <SelectableCard
            key={cat}
            title={TASK_CATEGORY_LABELS[cat]}
            description={
              inGoals
                ? inFocus
                  ? '★ Foco · más tareas de esta categoría'
                  : `${DESCRIPTIONS[cat]}  ·  toca de nuevo para fijar foco`
                : DESCRIPTIONS[cat]
            }
            emoji={EMOJIS[cat]}
            selected={inGoals}
            onPress={() => {
              if (!inGoals) {
                toggleGoal(cat);
                return;
              }
              if (!inFocus) {
                togglePreferenceCategory(cat);
                return;
              }
              // Tercer toque: deseleccionar todo.
              togglePreferenceCategory(cat);
              toggleGoal(cat);
            }}
            mode="multi"
          />
        );
      })}

      <Button
        title="Continuar"
        onPress={() => router.push('/(onboarding)/step-9-review')}
        disabled={!canContinue}
        className="mt-6"
      />
    </Screen>
  );
}
