import { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useMutation } from '@tanstack/react-query';

import Button from '@/components/Button';
import { useSession } from '@/lib/session';
import { deleteMyAccount, signOut } from '@beproud/api';

export default function AccountSettings() {
  const router = useRouter();
  const { user, profile } = useSession();
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [confirmText, setConfirmText] = useState('');
  const [error, setError] = useState<string | null>(null);

  const deleteMut = useMutation({
    mutationFn: async () => {
      await deleteMyAccount();
      await signOut();
    },
    onError: (e) =>
      setError(e instanceof Error ? e.message : 'No se pudo eliminar la cuenta'),
    onSuccess: () => router.replace('/(auth)/login' as never),
  });

  const createdAt = user?.created_at
    ? new Date(user.created_at).toLocaleDateString('es-ES', {
        day: '2-digit', month: 'long', year: 'numeric',
      })
    : '—';

  return (
    <SafeAreaView className="flex-1 bg-brand-800">
      <Header title="Cuenta" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <Field label="Email" value={user?.email ?? '—'} hint="Read-only en esta versión." />
        <Field label="Usuario" value={profile?.username ? `@${profile.username}` : '—'} />
        <Field label="Cuenta creada" value={createdAt} />

        <Text className="mt-6 mb-2 text-xs uppercase tracking-wider text-brand-300">
          Seguridad
        </Text>
        <View className="rounded-2xl border border-brand-700 bg-brand-800/60">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Cambiar contraseña"
            onPress={() => router.push('/(auth)/forgot-password' as never)}
            className="flex-row items-center px-4 py-3 active:bg-brand-700/40"
          >
            <Text className="flex-1 text-base font-semibold text-white">
              Cambiar contraseña
            </Text>
            <Text className="text-base text-brand-200">›</Text>
          </Pressable>
        </View>

        <Text className="mt-8 mb-2 text-xs uppercase tracking-wider text-red-300">
          Zona peligrosa
        </Text>
        <View className="rounded-2xl border border-red-500/30 bg-red-500/5 p-4">
          <Text className="text-sm text-brand-100">
            Al eliminar tu cuenta tu perfil se anonimiza inmediatamente y se
            programa la eliminación física de tus datos en 30 días. Los posts,
            likes y comentarios quedan sin asociar a tu identidad.
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Eliminar cuenta"
            onPress={() => setStep(1)}
            className="mt-3 rounded-full bg-red-500/30 px-4 py-3 active:bg-red-500/50"
          >
            <Text className="text-center text-sm font-extrabold text-red-100">
              Eliminar cuenta
            </Text>
          </Pressable>
        </View>

        {error && (
          <Text className="mt-3 text-sm text-red-400">{error}</Text>
        )}
      </ScrollView>

      <Modal
        visible={step > 0}
        transparent
        animationType="fade"
        onRequestClose={() => setStep(0)}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Cerrar"
          onPress={() => setStep(0)}
          className="flex-1 items-center justify-center bg-black/60 px-6"
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-2xl border border-red-500/30 bg-brand-800 p-5"
          >
            {step === 1 && (
              <>
                <Text className="mb-1 text-base font-extrabold text-white">
                  ¿Eliminar tu cuenta?
                </Text>
                <Text className="mb-4 text-sm text-brand-200">
                  Esta acción es definitiva. Tu perfil quedará anonimizado al
                  instante y los datos personales se borrarán físicamente en
                  30 días.
                </Text>
                <View className="flex-row gap-2">
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Cancelar"
                    onPress={() => setStep(0)}
                    className="flex-1 rounded-full bg-brand-700 py-2 active:bg-brand-600"
                  >
                    <Text className="text-center text-sm font-bold text-white">
                      Cancelar
                    </Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Continuar"
                    onPress={() => setStep(2)}
                    className="flex-1 rounded-full bg-red-500/30 py-2 active:bg-red-500/50"
                  >
                    <Text className="text-center text-sm font-bold text-red-100">
                      Continuar
                    </Text>
                  </Pressable>
                </View>
              </>
            )}
            {step === 2 && (
              <>
                <Text className="mb-1 text-base font-extrabold text-white">
                  Escribe ELIMINAR para confirmar
                </Text>
                <Text className="mb-4 text-sm text-brand-200">
                  Esta es la última confirmación. No podrás recuperar la cuenta.
                </Text>
                <TextInput
                  value={confirmText}
                  onChangeText={setConfirmText}
                  placeholder="ELIMINAR"
                  placeholderTextColor="#7DA9DC"
                  autoCapitalize="characters"
                  autoCorrect={false}
                  className="mb-3 rounded-xl border border-red-500/30 bg-brand-700/50 px-3 py-2 text-base text-white"
                />
                {error && (
                  <Text className="mb-3 text-sm text-red-400">{error}</Text>
                )}
                <View className="flex-row gap-2">
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Cancelar"
                    onPress={() => {
                      setStep(0);
                      setConfirmText('');
                    }}
                    className="flex-1 rounded-full bg-brand-700 py-2 active:bg-brand-600"
                  >
                    <Text className="text-center text-sm font-bold text-white">
                      Cancelar
                    </Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Eliminar definitivamente"
                    disabled={confirmText !== 'ELIMINAR' || deleteMut.isPending}
                    onPress={() => deleteMut.mutate()}
                    className={`flex-1 rounded-full py-2 ${
                      confirmText === 'ELIMINAR'
                        ? 'bg-red-500/40 active:bg-red-500/60'
                        : 'bg-red-500/10'
                    }`}
                  >
                    <Text className="text-center text-sm font-bold text-red-100">
                      {deleteMut.isPending ? '…' : 'Eliminar'}
                    </Text>
                  </Pressable>
                </View>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

function Field({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <View className="mb-3 rounded-xl border border-brand-700 bg-brand-800/60 p-4">
      <Text className="text-xs uppercase tracking-wider text-brand-300">{label}</Text>
      <Text className="mt-1 text-base font-semibold text-white">{value}</Text>
      {hint && <Text className="mt-1 text-xs text-brand-300">{hint}</Text>}
    </View>
  );
}

function Header({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <View className="flex-row items-center px-4 py-3">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Volver"
        onPress={onBack}
        hitSlop={12}
        className="px-2 py-1"
      >
        <Text className="text-base font-semibold text-brand-200">‹ Atrás</Text>
      </Pressable>
      <View className="flex-1 items-center">
        <Text className="text-base font-bold text-white">{title}</Text>
      </View>
      <View style={{ width: 60 }} />
    </View>
  );
}

// Suprime warning sobre Button no usado si elimino ese import en futuras
// iteraciones; mantengo aquí para que el botón "Cambiar contraseña" pueda
// migrarse a Button si se quiere.
void Button;
