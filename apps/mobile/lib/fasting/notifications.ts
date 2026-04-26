import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import type { FastingProtocolRow } from '@beproud/api';
import { computeFastingState } from './computeState';

const ID_PREFIX = 'fasting:';

export async function cancelAllFastingNotifications(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    for (const n of scheduled) {
      if (n.identifier.startsWith(ID_PREFIX)) {
        await Notifications.cancelScheduledNotificationAsync(n.identifier);
      }
    }
  } catch {
    // expo-notifications puede fallar en entornos sin permisos; no es fatal.
  }
}

/**
 * Reprograma las notificaciones del módulo de ayuno para las próximas 48h.
 * - 30 min antes del cierre de ventana (si notify_before_close).
 * - Al abrir la ventana del día siguiente (si notify_on_complete).
 *
 * Llamar tras upsertMyProtocol y al entrar a /fasting/index.
 */
export async function rescheduleFastingNotifications(
  proto: FastingProtocolRow | null,
): Promise<void> {
  if (Platform.OS === 'web') return;

  await cancelAllFastingNotifications();

  if (!proto || !proto.enabled) return;
  // 5:2 no tiene timer programable simple; no programamos nada por ahora.
  if (proto.protocol === '5_2') return;

  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('fasting', {
        name: 'Ayuno',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }

    const now = new Date();
    for (const offsetDays of [0, 1]) {
      const probe = new Date(now.getTime() + offsetDays * 24 * 60 * 60 * 1000);
      const state = computeFastingState(proto, probe);

      if (state.phase === 'eating' && proto.notify_before_close) {
        const fireAt = new Date(state.windowClosesAt.getTime() - 30 * 60 * 1000);
        if (fireAt > now) {
          await Notifications.scheduleNotificationAsync({
            identifier: `${ID_PREFIX}before-close-${fireAt.getTime()}`,
            content: {
              title: 'Tu ventana de comidas cierra en 30 min',
              body: 'Si quieres ajustar la cena, este es el momento.',
              data: { kind: 'fasting:before_close' },
            },
            trigger: {
              type: Notifications.SchedulableTriggerInputTypes.DATE,
              date: fireAt,
              channelId: Platform.OS === 'android' ? 'fasting' : undefined,
            },
          });
        }
      }

      if (state.phase === 'fasting' && proto.notify_on_complete) {
        const fireAt = state.windowOpensAt;
        const fastH = Math.round(state.plannedMs / (1000 * 60 * 60));
        if (fireAt > now) {
          await Notifications.scheduleNotificationAsync({
            identifier: `${ID_PREFIX}complete-${fireAt.getTime()}`,
            content: {
              title: `¡Has completado ${fastH} h de ayuno!`,
              body: 'Tu ventana de comidas está abierta. Cuando quieras.',
              data: { kind: 'fasting:complete' },
            },
            trigger: {
              type: Notifications.SchedulableTriggerInputTypes.DATE,
              date: fireAt,
              channelId: Platform.OS === 'android' ? 'fasting' : undefined,
            },
          });
        }
      }
    }
  } catch {
    // Si la API de notifs falla, no rompemos el flujo de guardado.
  }
}
