import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { signOut } from '@beproud/api';
import { backOrReplace } from '@/lib/navigation/back';

type Row = {
  label: string;
  hint?: string;
  emoji: string;
  onPress: () => void;
  destructive?: boolean;
};

export default function SettingsIndex() {
  const router = useRouter();

  const sections: Array<{ title: string; rows: Row[] }> = [
    {
      title: 'Tu cuenta',
      rows: [
        { label: 'Datos biométricos', hint: 'Peso, altura, equipo, objetivo', emoji: '📏', onPress: () => router.push('/settings/biometrics' as never) },
        { label: 'Rediseñar mi rutina', hint: 'Ajusta tus bloques de mañana, tarde y noche', emoji: '🧩', onPress: () => router.push('/routine-design' as never) },
        { label: 'Notificaciones', hint: 'Tipos, horario y avisos',  emoji: '🔔', onPress: () => router.push('/settings/notifications' as never) },
        { label: 'Privacidad',     hint: 'Cuenta privada, bloqueos', emoji: '🔒', onPress: () => router.push('/settings/privacy' as never) },
        { label: 'Cuenta',         hint: 'Email, contraseña, eliminar', emoji: '👤', onPress: () => router.push('/settings/account' as never) },
        { label: 'Mis datos',      hint: 'Exporta tus datos',        emoji: '📦', onPress: () => router.push('/settings/data' as never) },
      ],
    },
    {
      title: 'Legal',
      rows: [
        { label: 'Política de privacidad', emoji: '📄', onPress: () => router.push('/legal/privacy' as never) },
        { label: 'Términos de uso',        emoji: '📄', onPress: () => router.push('/legal/terms' as never) },
      ],
    },
    {
      title: 'Sesión',
      rows: [
        {
          label: 'Cerrar sesión',
          emoji: '↩️',
          onPress: async () => {
            await signOut();
          },
        },
      ],
    },
  ];

  return (
    <SafeAreaView className="flex-1 bg-brand-800">
      <View className="flex-row items-center px-4 py-3">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Volver"
          onPress={() => backOrReplace(router, '/(tabs)/profile' as never)}
          hitSlop={12}
          className="px-2 py-1"
        >
          <Text className="text-base font-semibold text-brand-200">‹ Atrás</Text>
        </Pressable>
        <View className="flex-1 items-center">
          <Text className="text-base font-bold text-white">Ajustes</Text>
        </View>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {sections.map((s) => (
          <View key={s.title} className="mb-6">
            <Text className="mb-2 text-xs uppercase tracking-wider text-brand-300">
              {s.title}
            </Text>
            <View className="rounded-2xl border border-brand-700 bg-brand-800/60">
              {s.rows.map((r, i) => (
                <Pressable
                  key={r.label}
                  accessibilityRole="button"
                  accessibilityLabel={r.label}
                  onPress={r.onPress}
                  className={`flex-row items-center px-4 py-3 ${
                    i < s.rows.length - 1 ? 'border-b border-brand-700' : ''
                  } active:bg-brand-700/40`}
                >
                  <Text style={{ fontSize: 20 }}>{r.emoji}</Text>
                  <View className="ml-3 flex-1">
                    <Text
                      className={`text-base font-bold ${
                        r.destructive ? 'text-red-300' : 'text-white'
                      }`}
                    >
                      {r.label}
                    </Text>
                    {r.hint && (
                      <Text className="text-xs text-brand-300" numberOfLines={1}>
                        {r.hint}
                      </Text>
                    )}
                  </View>
                  <Text className="ml-2 text-base text-brand-200">›</Text>
                </Pressable>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
