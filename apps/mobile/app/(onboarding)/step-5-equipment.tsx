import { useRouter } from 'expo-router';
import { Text } from 'react-native';

import Screen from '@/components/Screen';
import Button from '@/components/Button';
import WizardHeader from '@/components/WizardHeader';
import MultiSelectChips from '@/features/onboarding/components/MultiSelectChips';
import { useOnboarding } from '@/lib/onboarding';
import {
  EQUIPMENT_OPTIONS,
  EQUIPMENT_LABELS,
  EQUIPMENT_ICONS,
  type Equipment,
} from '@beproud/validation';

export default function Step5Equipment() {
  const router = useRouter();
  const { equipment, toggleEquipment } = useOnboarding();

  const options = EQUIPMENT_OPTIONS.map((v) => ({
    value: v,
    label: EQUIPMENT_LABELS[v],
    icon: EQUIPMENT_ICONS[v],
  }));

  return (
    <Screen scroll>
      <WizardHeader
        step={5}
        total={9}
        skip={{
          label: 'Sin equipo',
          onPress: () => {
            // Selecciona "none" exclusivo y avanza.
            const next: Equipment[] = ['none'];
            // Reemplazo limpio:
            equipment.forEach((e) => toggleEquipment(e));
            next.forEach((e) => toggleEquipment(e));
            router.push('/(onboarding)/step-6-restrictions');
          },
        }}
      />

      <Text className="mb-2 text-3xl font-extrabold text-white">
        ¿Qué tienes a mano?
      </Text>
      <Text className="mb-6 text-base text-brand-200">
        Marca lo que tengas. Filtramos las tareas que requieran cosas que no
        tienes. Si no tienes nada, marca "Sin equipo".
      </Text>

      <MultiSelectChips
        options={options}
        selected={equipment}
        onToggle={toggleEquipment}
        exclusiveNone="none"
      />

      <Button
        title="Continuar"
        onPress={() => router.push('/(onboarding)/step-6-restrictions')}
        className="mt-6"
      />
    </Screen>
  );
}
