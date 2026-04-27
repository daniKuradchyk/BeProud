import { Easing } from 'react-native-reanimated';

/**
 * Presets de animación BeProud. Regla de uso:
 *   - enter / mount: TIMING_NORMAL.
 *   - exit / unmount: TIMING_FAST.
 *   - tap feedback (scale, color): SPRING_SNAPPY.
 *   - celebración (entrada de elementos festivos): SPRING_BOUNCE.
 *   - cualquier movimiento sustancial sin connotación festiva: SPRING_GENTLE.
 */

export const SPRING_GENTLE = { damping: 18, stiffness: 180, mass: 1 };
export const SPRING_BOUNCE = { damping: 12, stiffness: 220, mass: 1 };
export const SPRING_SNAPPY = { damping: 24, stiffness: 280, mass: 0.6 };

export const TIMING_FAST   = { duration: 150, easing: Easing.bezier(0.4, 0, 0.2, 1) };
export const TIMING_NORMAL = { duration: 250, easing: Easing.bezier(0.4, 0, 0.2, 1) };
export const TIMING_SLOW   = { duration: 450, easing: Easing.bezier(0.32, 0.72, 0, 1) };
