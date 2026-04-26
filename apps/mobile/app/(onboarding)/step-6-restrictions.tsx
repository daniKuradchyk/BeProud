import { useRouter } from 'expo-router';
import { Text, View } from 'react-native';

import Screen from '@/components/Screen';
import Button from '@/components/Button';
import WizardHeader from '@/components/WizardHeader';
import MultiSelectChips from '@/features/onboarding/components/MultiSelectChips';
import { useOnboarding } from '@/lib/onboarding';
import {
  RESTRICTION_OPTIONS,
  RESTRICTION_LABELS,
} from '@beproud/validation';

export default function Step6Restrictions() {
  const router = useRouter();
  const { restrictions, toggleRestriction } = useOnboarding();

  const options = RESTRICTION_OPTIONS.map((v) => ({
    value: v,
    label: RESTRICTION_LABELS[v],
  }));

  return (
    <Screen scroll>
      <WizardHeader
        step={6}
        total={9}
        skip={{
          label: 'Ninguna',
          onPress: () => {
            restrictions.forEach((r) => toggleRestriction(r));
            toggleRestriction('none');
            router.push('/(onboarding)/step-7-level');
          },
        }}
      />

      <Text className="mb-2 text-3xl font-extrabold text-white">
        ¿Tienes alguna molestia?
      </Text>
      <Text className="mb-3 text-base text-brand-200">
        Marca las áreas que prefieras cuidar. Nos saltaremos las tareas que
        puedan empeorarlas.
      </Text>

      <View className="mb-4 rounded-xl border border-amber-300/30 bg-amber-300/5 p-3">
        <Text className="text-xs text-amber-200">
          Esta información no sustituye un consejo médico. Si tienes alguna
          condición seria, consulta primero con tu médico.
        </Text>
      </View>

      <MultiSelectChips
        options={options}
        selected={restrictions}
        onToggle={toggleRestriction}
        exclusiveNone="none"
      />

      <Button
        title="Continuar"
        onPress={() => router.push('/(onboarding)/step-7-level')}
        className="mt-6"
      />
    </Screen>
  );
}
