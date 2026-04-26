import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

const LAST_UPDATED = '2026-04-26';

export default function PrivacyPage() {
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
          <Text className="text-base font-bold text-white">Privacidad</Text>
        </View>
        <View style={{ width: 60 }} />
      </View>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <H1>Política de privacidad de BeProud</H1>
        <Text className="mb-4 text-xs text-brand-300">
          Última actualización: {LAST_UPDATED}
        </Text>

        <H2>1. Quiénes somos</H2>
        <Para>
          BeProud es una app desarrollada por Daniil Kuradchik. Contacto:
          xbydani99x@gmail.com.
        </Para>

        <H2>2. Datos que recogemos</H2>
        <Bullet>Email y contraseña al registrarte (autenticación con Supabase Auth).</Bullet>
        <Bullet>Nombre visible y nombre de usuario que tú escoges.</Bullet>
        <Bullet>
          Datos opcionales del onboarding: edad, sexo biológico, altura, peso,
          días de entrenamiento por semana, objetivo principal, equipamiento
          disponible, restricciones físicas. Solo se usan para personalizar tu
          rutina.
        </Bullet>
        <Bullet>
          Fotos que subes para verificar tareas. Son privadas por defecto y solo
          accesibles a través de URLs firmadas con caducidad.
        </Bullet>
        <Bullet>Mensajes que envías a tus contactos o grupos.</Bullet>
        <Bullet>
          Registros de actividad: completions de tareas, puntos, racha, posición
          en rankings.
        </Bullet>
        <Bullet>
          Token de notificaciones push (si lo aceptas) para enviarte avisos
          relacionados con la app.
        </Bullet>

        <H2>3. Datos que NO recogemos</H2>
        <Para>
          No pedimos DNI, dirección, número de teléfono ni datos bancarios. No
          rastreamos tu ubicación. No vendemos datos a terceros. No usamos
          publicidad.
        </Para>

        <H2>4. Cómo usamos tus datos</H2>
        <Para>
          Para prestarte el servicio: autenticación, generar tu rutina,
          mostrarte tu progreso, conectarte con amigos y enviarte notificaciones.
        </Para>

        <H2>5. Dónde se almacenan</H2>
        <Para>
          En Supabase, alojado en la Unión Europea. Las fotos se guardan en
          buckets privados de Supabase Storage.
        </Para>

        <H2>6. Tus derechos (GDPR)</H2>
        <Para>
          Puedes acceder a tus datos, corregirlos, exportarlos o solicitar su
          eliminación. Desde Ajustes → Cuenta puedes borrar tu cuenta. La
          eliminación es definitiva en un plazo máximo de 30 días.
        </Para>

        <H2>7. Edad mínima</H2>
        <Para>
          BeProud requiere 13 años o más. Si descubrimos que un usuario es menor
          de esa edad, eliminaremos su cuenta.
        </Para>

        <H2>8. Cambios en esta política</H2>
        <Para>
          Te avisaremos en la app si cambia algo material. La fecha de "última
          actualización" arriba refleja la versión vigente.
        </Para>

        <H2>9. Contacto</H2>
        <Para>Para cualquier consulta: xbydani99x@gmail.com.</Para>
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

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <View className="mb-1 flex-row pr-2">
      <Text className="mr-2 text-sm leading-5 text-brand-100">•</Text>
      <Text className="flex-1 text-sm leading-5 text-brand-100">{children}</Text>
    </View>
  );
}
