import { Platform } from 'react-native';
import Constants from 'expo-constants';

import { registerPushToken, removePushToken } from '@beproud/api';

// Imports dinámicos: si expo-notifications/expo-device no están instaladas
// (por ejemplo en CI o tras un fresh clone sin `pnpm install`), evitamos que
// la app entera se rompa.
async function loadNotificationsLib(): Promise<typeof import('expo-notifications') | null> {
  try {
    return await import('expo-notifications');
  } catch (e) {
    console.warn('[push] expo-notifications no disponible', e);
    return null;
  }
}

async function loadDeviceLib(): Promise<typeof import('expo-device') | null> {
  try {
    return await import('expo-device');
  } catch {
    return null;
  }
}

let configured = false;

async function configureForeground(): Promise<void> {
  if (configured) return;
  const Notifications = await loadNotificationsLib();
  if (!Notifications) return;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'BeProud',
      importance: Notifications.AndroidImportance.HIGH,
      lightColor: '#1F4E79',
    });
  }
  configured = true;
}

export async function ensurePushPermissions(): Promise<boolean> {
  const Notifications = await loadNotificationsLib();
  if (!Notifications) return false;

  if (Platform.OS === 'web') {
    if (typeof window === 'undefined' || typeof Notification === 'undefined') {
      return false;
    }
    if (Notification.permission === 'granted') return true;
    if (Notification.permission === 'denied') return false;
    try {
      const result = await Notification.requestPermission();
      return result === 'granted';
    } catch {
      return false;
    }
  }

  const Device = await loadDeviceLib();
  if (Device && Device.isDevice === false) {
    // Simulador iOS / Android no soporta push reales.
    return false;
  }

  const existing = await Notifications.getPermissionsAsync();
  if (existing.status === 'granted') return true;
  if (existing.status === 'denied') return false;

  const requested = await Notifications.requestPermissionsAsync();
  return requested.status === 'granted';
}

/**
 * Tras login: solicita permisos, obtiene el Expo Push token y lo guarda en
 * BBDD para que send-push pueda usarlo. Idempotente: si ya hay token, hace
 * upsert.
 */
export async function registerForPushAndStore(): Promise<string | null> {
  await configureForeground();
  const granted = await ensurePushPermissions();
  if (!granted) return null;
  if (Platform.OS === 'web') return null; // sin token Expo en web nativa

  const Notifications = await loadNotificationsLib();
  if (!Notifications) return null;

  // Necesitamos el projectId de Expo para getExpoPushTokenAsync.
  const projectId =
    (Constants.expoConfig?.extra as Record<string, unknown> | undefined)?.eas
      ?.toString() ?? Constants.easConfig?.projectId ?? undefined;

  try {
    const tokenRes = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    );
    const token = tokenRes.data;
    const platform: 'ios' | 'android' | 'web' =
      Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'web';
    await registerPushToken(token, platform);
    return token;
  } catch (e) {
    console.warn('[push] no pude obtener Expo push token', e);
    return null;
  }
}

/** Para usar en el flujo de logout: borra el token de la BBDD. */
export async function unregisterCurrentPushToken(token: string | null): Promise<void> {
  if (!token) return;
  try {
    await removePushToken(token);
  } catch (e) {
    console.warn('[push] removePushToken falló', e);
  }
}

/**
 * Listener para tap en push (app cerrada o foreground). Devuelve función de
 * cleanup. El callback recibe el deep-link a navegar dentro de la app.
 */
export async function attachPushTapListener(
  onNavigate: (route: string) => void,
): Promise<(() => void) | null> {
  const Notifications = await loadNotificationsLib();
  if (!Notifications) return null;
  const sub = Notifications.addNotificationResponseReceivedListener((event) => {
    const data = event.notification.request.content.data as
      | { type?: string; payload?: Record<string, unknown> }
      | undefined;
    if (!data) return;
    const route = routeForData(data);
    if (route) onNavigate(route);
  });
  return () => sub.remove();
}

function routeForData(data: {
  type?: string;
  payload?: Record<string, unknown>;
}): string | null {
  const p = data.payload ?? {};
  switch (data.type) {
    case 'new_like':
    case 'new_comment':
      return p.post_id ? `/post/${String(p.post_id)}` : null;
    case 'new_follower':
    case 'follow_request':
      return p.follower_username ? `/user/${String(p.follower_username)}` : null;
    case 'new_dm':
      return p.thread_id ? `/messages/${String(p.thread_id)}` : null;
    case 'league_promotion':
      return '/(tabs)/rankings';
    case 'achievement_unlocked':
      return '/profile/achievements';
    case 'daily_reminder':
      return '/(tabs)/routine';
    default:
      return null;
  }
}
