import { Redirect } from 'expo-router';

// La lógica real de routing vive en _layout.tsx (RouteGuard).
// Esta pantalla es solo el "/" inicial: redirige al login y deja que el guard
// lleve al usuario al destino correcto según el estado de su sesión.
export default function Index() {
  return <Redirect href="/(auth)/login" />;
}
