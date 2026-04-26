import { useCallback, useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';

import {
  subscribeMyNotifications,
  updateMyTimezone,
  type Notification,
} from '@beproud/api';

import NotificationToast from '@/features/notifications/components/NotificationToast';
import { useSession } from '@/lib/session';
import {
  attachPushTapListener,
  registerForPushAndStore,
} from '@/lib/pushSetup';

function deviceTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

function routeForNotification(n: Notification): string | null {
  const p = n.payload as Record<string, unknown>;
  switch (n.type) {
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

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const qc = useQueryClient();
  const { user, status, profile } = useSession();
  const userId = status === 'authenticated' ? user?.id ?? null : null;

  const [toast, setToast] = useState<Notification | null>(null);
  // Evita mostrar toasts duplicados de la misma notification.
  const seen = useRef<Set<string>>(new Set());

  // Push setup: registra token tras login.
  useEffect(() => {
    if (!userId) return;
    let cancel = false;
    (async () => {
      const token = await registerForPushAndStore();
      if (cancel) return;
      if (!token) {
        // No es un error: en simulator/web puede no haber token.
        return;
      }
    })();
    return () => {
      cancel = true;
    };
  }, [userId]);

  // Sync timezone con el dispositivo si difiere del profile.
  useEffect(() => {
    if (!userId || !profile) return;
    const tz = deviceTimezone();
    if (tz && tz !== profile.timezone) {
      void updateMyTimezone(tz);
    }
  }, [userId, profile?.timezone]);

  // Listener de tap en push (app cerrada/foreground).
  useEffect(() => {
    if (!userId) return;
    let cleanup: (() => void) | null = null;
    (async () => {
      cleanup = await attachPushTapListener((route) => {
        router.push(route as never);
      });
    })();
    return () => {
      cleanup?.();
    };
  }, [userId, router]);

  // Realtime: nuevas notifications → toast + invalidate.
  useEffect(() => {
    if (!userId) return;
    const unsub = subscribeMyNotifications(userId, (n) => {
      if (seen.current.has(n.id)) return;
      seen.current.add(n.id);
      setToast(n);
      qc.invalidateQueries({ queryKey: ['notifications-unread-count'] });
      qc.invalidateQueries({ queryKey: ['my-notifications'] });
    });
    return unsub;
  }, [userId, qc]);

  const dismiss = useCallback(() => setToast(null), []);
  const onPress = useCallback(() => {
    if (!toast) return;
    const route = routeForNotification(toast);
    if (route) router.push(route as never);
  }, [toast, router]);

  return (
    <>
      {children}
      {toast && (
        <View
          pointerEvents="box-none"
          style={{
            position: 'absolute',
            top: 0, left: 0, right: 0, bottom: 0,
            zIndex: 9998,
          }}
        >
          <NotificationToast
            notification={toast}
            onPress={onPress}
            onDismiss={dismiss}
          />
        </View>
      )}
    </>
  );
}
