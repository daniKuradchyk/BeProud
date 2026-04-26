import { useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import Screen from '@/components/Screen';
import Button from '@/components/Button';
import WizardHeader from '@/components/WizardHeader';
import Slider from '@/components/Slider';
import { useOnboarding } from '@/lib/onboarding';

const DAY_LABELS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

export default function Step4Availability() {
  const router = useRouter();
  const {
    weeklyDays,
    dailyMinutes,
    setWeeklyDays,
    setDailyMinutes,
  } = useOnboarding();

  // Visualización: si weekly_days = 4, "marcamos" los 4 primeros chips.
  // Es solo un selector cuantitativo, no se persisten qué días concretos.
  function setN(n: number) {
    setWeeklyDays(n);
  }

  return (
    <Screen scroll>
      <WizardHeader step={4} total={9} />

      <Text className="mb-2 text-3xl font-extrabold text-white">
        ¿Cuánto tiempo tienes?
      </Text>
      <Text className="mb-6 text-base text-brand-200">
        Cuántos días a la semana puedes dedicar y cuántos minutos al día.
        El número de tareas se calcula a partir de aquí.
      </Text>

      <Text className="mb-2 text-sm font-semibold text-brand-200">
        Días por semana {weeklyDays != null ? `· ${weeklyDays}` : ''}
      </Text>
      <View className="mb-6 flex-row gap-1">
        {DAY_LABELS.map((d, i) => {
          const n = i + 1;
          const isOn = (weeklyDays ?? 0) >= n;
          return (
            <Pressable
              key={d}
              accessibilityRole="button"
              accessibilityLabel={`${n} días por semana`}
              onPress={() => setN(n)}
              className={`flex-1 rounded-xl border py-3 ${
                isOn
                  ? 'border-brand-300 bg-brand-300/15'
                  : 'border-brand-700 bg-brand-800/60'
              }`}
            >
              <Text
                className={`text-center text-sm font-extrabold ${
                  isOn ? 'text-white' : 'text-brand-300'
                }`}
              >
                {d}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Slider
        label="Minutos al día"
        value={dailyMinutes ?? 30}
        min={15}
        max={120}
        step={5}
        suffix="min"
        onChange={setDailyMinutes}
        accessibilityLabel="Minutos diarios"
        hint={
          dailyMinutes != null
            ? `~${Math.max(3, Math.min(8, Math.floor(dailyMinutes / 12)))} tareas/día sugeridas`
            : undefined
        }
      />

      <Button
        title="Continuar"
        onPress={() => router.push('/(onboarding)/step-5-equipment')}
        disabled={weeklyDays == null || dailyMinutes == null}
        className="mt-6"
      />
    </Screen>
  );
}
