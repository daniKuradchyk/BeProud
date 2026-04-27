import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

/**
 * Wrappers de expo-haptics. En web los ignoramos silenciosamente porque la
 * API no existe; en móvil cada función dispara su patrón nativo.
 *
 * Uso típico:
 *   - `tap`: cualquier tap simple sin éxito asociado (cambio de tab, toggle).
 *   - `success`: confirmación de acción positiva (tarea completada, log guardado).
 *   - `warning`: aviso no fatal (alerta de ayuno fuera de ventana).
 *   - `error`: error real (validación rechazada, fallo de red).
 *   - `light`/`medium`/`heavy`: impacto físico (subir nivel, hit en juego).
 */

const noop = (): Promise<void> => Promise.resolve();

const isWeb = Platform.OS === 'web';

async function safe(fn: () => Promise<void>): Promise<void> {
  if (isWeb) return;
  try {
    await fn();
  } catch {
    // expo-haptics puede fallar en simuladores antiguos; no es fatal.
  }
}

export const haptic = {
  tap:     () => safe(() => Haptics.selectionAsync()),
  success: () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  warning: () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
  error:   () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)),
  light:   () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  medium:  () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)),
  heavy:   () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)),
  noop,
};
