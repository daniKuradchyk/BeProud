import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, {
  SlideInUp,
  SlideOutUp,
  FadeOut,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { haptic } from '@/lib/theme/haptics';

type Kind = 'success' | 'error' | 'info';
type ToastItem = { id: number; kind: Kind; message: string };

type ToastApi = {
  success: (message: string) => void;
  error:   (message: string) => void;
  info:    (message: string) => void;
};

const Ctx = createContext<ToastApi | null>(null);

const KIND_CLASS: Record<Kind, string> = {
  success: 'bg-emerald-500/20 border-emerald-400',
  error:   'bg-coral-500/20 border-coral-400',
  info:    'bg-bp-500/20 border-bp-400',
};

const KIND_ICON: Record<Kind, string> = {
  success: '✓',
  error:   '✕',
  info:    'ℹ',
};

const KIND_TEXT: Record<Kind, string> = {
  success: 'text-emerald-400',
  error:   'text-coral-400',
  info:    'text-bp-300',
};

const DURATION_MS = 3000;
const MAX_STACK   = 3;

/**
 * Provider del sistema de toasts. Envuelve la app raíz.
 *
 * Uso:
 *   const toast = useToast();
 *   toast.success('Tarea completada');
 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const counter = useRef(0);

  const dismiss = useCallback((id: number) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (kind: Kind, message: string) => {
      const id = ++counter.current;
      setItems((prev) => {
        const next = [...prev, { id, kind, message }];
        return next.length > MAX_STACK ? next.slice(next.length - MAX_STACK) : next;
      });
      if (kind === 'success') haptic.success();
      else if (kind === 'error') haptic.error();
      else haptic.tap();
      setTimeout(() => dismiss(id), DURATION_MS);
    },
    [dismiss],
  );

  const api = useMemo<ToastApi>(
    () => ({
      success: (m) => push('success', m),
      error:   (m) => push('error', m),
      info:    (m) => push('info', m),
    }),
    [push],
  );

  return (
    <Ctx.Provider value={api}>
      {children}
      <SafeAreaView
        pointerEvents="box-none"
        edges={['top']}
        className="absolute inset-x-0 top-0 px-4"
      >
        <View pointerEvents="box-none" className="gap-2 pt-2">
          {items.map((t) => (
            <Animated.View
              key={t.id}
              entering={SlideInUp.duration(220)}
              exiting={SlideOutUp.duration(180).withCallback(() => undefined)}
            >
              <Pressable
                accessibilityRole="alert"
                accessibilityLabel={t.message}
                onPress={() => dismiss(t.id)}
                className={`flex-row items-center rounded-lg border bg-surface-2 px-3 py-3 ${KIND_CLASS[t.kind]}`}
              >
                <Text className={`mr-2 text-base font-extrabold ${KIND_TEXT[t.kind]}`}>
                  {KIND_ICON[t.kind]}
                </Text>
                <Text className="flex-1 text-body text-ink-1" numberOfLines={2}>
                  {t.message}
                </Text>
              </Pressable>
            </Animated.View>
          ))}
        </View>
      </SafeAreaView>
    </Ctx.Provider>
  );
  // FadeOut está importado por compatibilidad con futuras animaciones; no se usa aquí.
  void FadeOut;
}

/** Hook para disparar toasts desde cualquier pantalla envuelta por ToastProvider. */
export function useToast(): ToastApi {
  const ctx = useContext(Ctx);
  if (!ctx) {
    throw new Error('useToast: falta ToastProvider en _layout.tsx');
  }
  return ctx;
}
