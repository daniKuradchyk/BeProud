import '../global.css';

import { useEffect } from 'react';
import { Slot, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { useSession } from '@/lib/session';
import { consumePendingJoinCode, setupDeepLinks } from '@/lib/deepLinks';
import { GamificationProvider } from '@/lib/gamificationListeners';
import { NotificationsProvider } from '@/lib/notificationsListeners';

// Una sola instancia para toda la app. staleTime 30s evita refetches
// agresivos al cambiar de pantalla; las invalidaciones manuales (Realtime,
// pull-to-refresh, mutations) siguen mandando.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1 },
  },
});

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <StatusBar style="light" />
        <RouteGuard>
          <GamificationProvider>
            <NotificationsProvider>
              <Slot />
            </NotificationsProvider>
          </GamificationProvider>
        </RouteGuard>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

function RouteGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const segments = useSegments();
  const { status, init } = useSession();

  // Inicializa la sesión la primera vez que monta el árbol.
  useEffect(() => {
    void init();
  }, [init]);

  // Inicializa el listener de deep links (invitaciones a grupos).
  useEffect(() => {
    return setupDeepLinks();
  }, []);

  // Si hay un código de invitación pendiente y ya tenemos sesión, navegamos
  // a la pantalla de preview.
  useEffect(() => {
    if (status !== 'authenticated') return;
    const code = consumePendingJoinCode();
    if (code) {
      router.push(`/join/${code}` as never);
    }
  }, [status, router]);

  // Redirige según el estado de la sesión.
  // - needs_onboarding solo respeta la pantalla `complete-profile`.
  // - needs_routine_setup respeta el wizard de onboarding (step-N) y la
  //   pantalla de diseño guiado por bloques (/routine-design — Fase 15).
  // - authenticated nunca debería estar en (auth) ni (onboarding).
  useEffect(() => {
    if (status === 'loading') return;
    const inAuth = segments[0] === '(auth)';
    const inOnboarding = segments[0] === '(onboarding)';
    const inRoutineDesign = (segments[0] as string) === 'routine-design';
    const onboardingScreen = inOnboarding ? segments[1] : null;
    const inCompleteProfile = onboardingScreen === 'complete-profile';
    const inRoutineWizard =
      inOnboarding && onboardingScreen != null && !inCompleteProfile;

    if (status === 'unauthenticated' && !inAuth) {
      router.replace('/(auth)/login');
    } else if (status === 'needs_onboarding' && !inCompleteProfile) {
      router.replace('/(onboarding)/complete-profile');
    } else if (
      status === 'needs_routine_setup' &&
      !inRoutineWizard &&
      !inRoutineDesign
    ) {
      router.replace('/routine-design' as never);
    } else if (status === 'authenticated' && (inAuth || inOnboarding)) {
      router.replace('/(tabs)/routine');
    }
  }, [status, segments, router]);

  if (status === 'loading') {
    return (
      <View className="flex-1 items-center justify-center bg-brand-800">
        <ActivityIndicator color="#A9C6E8" size="large" />
      </View>
    );
  }
  return <>{children}</>;
}
