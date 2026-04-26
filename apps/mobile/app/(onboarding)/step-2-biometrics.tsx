import { useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import Screen from '@/components/Screen';
import Button from '@/components/Button';
import WizardHeader from '@/components/WizardHeader';
import Slider from '@/components/Slider';
import DatePickerInput from '@/components/DatePickerInput';
import { useOnboarding } from '@/lib/onboarding';
import {
  BIOLOGICAL_SEX,
  BIOLOGICAL_SEX_LABELS,
  type BiologicalSex,
} from '@beproud/validation';

export default function Step2Biometrics() {
  const router = useRouter();
  const {
    birthDate,
    biologicalSex,
    heightCm,
    weightKg,
    setBirthDate,
    setBiologicalSex,
    setHeightCm,
    setWeightKg,
  } = useOnboarding();

  function skipAll() {
    setBirthDate(null);
    setBiologicalSex(null);
    setHeightCm(null);
    setWeightKg(null);
    router.push('/(onboarding)/step-3-goal');
  }

  return (
    <Screen scroll>
      <WizardHeader
        step={2}
        total={9}
        skip={{ label: 'Prefiero no decirlo', onPress: skipAll }}
      />

      <Text className="mb-2 text-3xl font-extrabold text-white">
        Háblanos un poco de ti
      </Text>
      <Text className="mb-6 text-base text-brand-200">
        Estos datos son opcionales pero permiten una rutina mucho más
        personalizada (calorías, intensidad, recuperación). No se comparten
        con nadie.
      </Text>

      <DatePickerInput
        label="Fecha de nacimiento"
        value={birthDate}
        onChange={setBirthDate}
      />

      <Text className="mb-1 text-sm font-semibold text-brand-200">
        Sexo biológico
      </Text>
      <View className="mb-4 flex-row gap-2">
        {BIOLOGICAL_SEX.map((s) => (
          <Pressable
            key={s}
            accessibilityRole="radio"
            accessibilityState={{ checked: biologicalSex === s }}
            accessibilityLabel={BIOLOGICAL_SEX_LABELS[s]}
            onPress={() =>
              setBiologicalSex(biologicalSex === s ? null : (s as BiologicalSex))
            }
            className={`flex-1 rounded-xl border p-3 ${
              biologicalSex === s
                ? 'border-brand-300 bg-brand-300/15'
                : 'border-brand-700 bg-brand-800/60'
            }`}
          >
            <Text
              className={`text-center text-sm font-bold ${
                biologicalSex === s ? 'text-white' : 'text-brand-200'
              }`}
            >
              {BIOLOGICAL_SEX_LABELS[s]}
            </Text>
          </Pressable>
        ))}
      </View>

      <Slider
        label="Altura"
        value={heightCm ?? 170}
        min={140}
        max={220}
        step={1}
        suffix="cm"
        onChange={setHeightCm}
        accessibilityLabel="Altura en centímetros"
        hint={heightCm == null ? 'Toca el slider para fijar tu altura' : undefined}
      />

      <Slider
        label="Peso"
        value={weightKg ?? 70}
        min={40}
        max={150}
        step={1}
        suffix="kg"
        onChange={setWeightKg}
        accessibilityLabel="Peso en kilogramos"
      />

      <Button
        title="Continuar"
        onPress={() => router.push('/(onboarding)/step-3-goal')}
        className="mt-6"
      />
    </Screen>
  );
}
