import { useRouter } from 'expo-router';
import { Text } from 'react-native';

import Screen from '@/components/Screen';
import Button from '@/components/Button';
import WizardHeader from '@/components/WizardHeader';
import SelectableCard from '@/components/SelectableCard';
import { useOnboarding } from '@/lib/onboarding';
import { type Level } from '@beproud/validation';

const LEVELS: { value: Level; title: string; desc: string; emoji: string }[] = [
  { value: 'beginner',     title: 'Empezando',      desc: 'Voy a empezar o llevo poco tiempo.', emoji: '🌱' },
  { value: 'intermediate', title: 'Cogiendo ritmo', desc: 'Algo de constancia y volumen.',      emoji: '🌿' },
  { value: 'advanced',     title: 'A tope',         desc: 'Llevo años entrenando o estudiando.', emoji: '🌳' },
];

export default function Step7Level() {
  const router = useRouter();
  const { level, setLevel } = useOnboarding();
  const canContinue = !!level;

  return (
    <Screen scroll>
      <WizardHeader step={7} total={9} />

      <Text className="mb-2 text-3xl font-extrabold text-white">
        ¿Cómo de en forma estás ahora?
      </Text>
      <Text className="mb-6 text-base text-brand-200">
        Lo usamos para no proponerte tareas demasiado fáciles ni demasiado
        duras al principio.
      </Text>

      {LEVELS.map((lv) => (
        <SelectableCard
          key={lv.value}
          title={lv.title}
          description={lv.desc}
          emoji={lv.emoji}
          selected={level === lv.value}
          onPress={() => setLevel(lv.value)}
          mode="single"
        />
      ))}

      <Button
        title="Continuar"
        onPress={() => router.push('/(onboarding)/step-8-preferences')}
        disabled={!canContinue}
        className="mt-6"
      />
    </Screen>
  );
}
