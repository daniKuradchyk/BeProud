import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

const LAST_UPDATED = '2026-04-26';

export default function TermsPage() {
  const router = useRouter();
  return (
    <SafeAreaView className="flex-1 bg-brand-800">
      <View className="flex-row items-center px-4 py-3">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Volver"
          onPress={() => router.back()}
          hitSlop={12}
          className="px-2 py-1"
        >
          <Text className="text-base font-semibold text-brand-200">‹ Atrás</Text>
        </Pressable>
        <View className="flex-1 items-center">
          <Text className="text-base font-bold text-white">Términos</Text>
        </View>
        <View style={{ width: 60 }} />
      </View>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <H1>Términos de uso de BeProud</H1>
        <Text className="mb-4 text-xs text-brand-300">
          Última actualización: {LAST_UPDATED}
        </Text>

        <H2>1. Aceptación</H2>
        <Para>
          Al usar BeProud aceptas estos términos. Si no estás de acuerdo, no uses
          la app.
        </Para>

        <H2>2. Cuenta</H2>
        <Para>
          Eres responsable de mantener la confidencialidad de tu cuenta.
          Notifícanos si crees que ha sido comprometida.
        </Para>

        <H2>3. Contenido prohibido</H2>
        <Para>
          No subas fotos sexualmente explícitas, violentas, ilegales, ni que
          muestren a menores en contextos inapropiados. No suplantes la
          identidad de otros. No publiques contenido que no sea tuyo.
        </Para>

        <H2>4. Validación con IA</H2>
        <Para>
          BeProud usará un sistema automatizado para verificar las fotos de
          tareas. Las decisiones del sistema pueden ser revisadas en caso de
          error contactando con soporte.
        </Para>

        <H2>5. Cancelación</H2>
        <Para>
          Podemos suspender o cerrar cuentas que infrinjan estos términos. Tú
          puedes cerrar tu cuenta cuando quieras desde Ajustes.
        </Para>

        <H2>6. Limitación de responsabilidad</H2>
        <Para>
          BeProud se ofrece "tal cual". No nos hacemos responsables de daños
          derivados del uso de la app más allá de lo exigido por la ley.
        </Para>

        <H2>7. Ley aplicable</H2>
        <Para>Estos términos se rigen por la ley española.</Para>
      </ScrollView>
    </SafeAreaView>
  );
}

function H1({ children }: { children: React.ReactNode }) {
  return (
    <Text className="mb-3 text-2xl font-extrabold text-white">{children}</Text>
  );
}

function H2({ children }: { children: React.ReactNode }) {
  return (
    <Text className="mb-2 mt-4 text-base font-extrabold text-white">
      {children}
    </Text>
  );
}

function Para({ children }: { children: React.ReactNode }) {
  return (
    <Text className="mb-2 text-sm leading-5 text-brand-100">{children}</Text>
  );
}
