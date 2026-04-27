# BeProud · Design System

Documento vivo del sistema de diseño introducido en Fase 17. Si añades un primitivo o cambias un token, actualízalo aquí.

## Paleta

Definida en `apps/mobile/tailwind.config.js` y espejada en `lib/theme/tokens.ts`.

| Namespace | Uso | Notas |
|---|---|---|
| `bp-{50..900}` | Color de marca (violet) | Base 500. 700-800 para superficies oscuras con tinte. |
| `surface-{0..3}` | Superficies del modo oscuro | 0 = fondo app, 3 = borde sutil |
| `ink-{0..4}` | Texto | 0 blanco puro, 1 primario, 2 secundario, 3 placeholder, 4 disabled |
| `amber-{400,500}` | Acento celebración | Premios, llamas de racha, FAB destacado |
| `emerald-{400,500}` | Éxito | Toasts, badges "completado" |
| `coral-{400,500}` | Error / aviso | Toasts, badges de pendiente |
| `brand-{50..900}` | **Alias** de `bp-*` | Mantenido para retrocompatibilidad. Migrar a `bp-*` en código nuevo. |

## Tipografía

Pila: `Inter, system-ui, -apple-system, sans-serif` (Inter no se carga; fallback al sistema).

| Clase | Uso |
|---|---|
| `text-display-xl` | 44/48 800 — títulos heroicos (welcome, celebraciones) |
| `text-display` | 32/36 800 — títulos principales de pantalla |
| `text-heading` | 24/30 700 — secciones |
| `text-subheading` | 20/26 700 — subsecciones |
| `text-body-lg` | 17/24 500 — body destacado |
| `text-body` | 15/22 500 — body por defecto |
| `text-caption` | 13/18 500 — texto pequeño |
| `text-overline` | 11/14 700 0.08em uppercase — labels de sección |

Componentes wrapper: `<Heading size="xl|lg|md|sm">`, `<Body size tone>`, `<Caption variant tone>`.

## Spacing y radius

- Tokens estándar Tailwind (`p-1..p-12`, etc.).
- Alias semánticos: `tap-min` (44px) y `gutter` (16px).
- Radius: `rounded-{xs|sm|md|lg|xl|2xl|pill}`.

Convenciones:

- Cards de tarea: `rounded-lg`.
- Cards de módulo en hub: `rounded-xl`.
- Bottom sheets: `rounded-t-2xl`.
- Botones: `rounded-pill`.

## Sombras

| Clase | Uso |
|---|---|
| `shadow-glow-bp` | Botones primary, Now Card glow, FAB tab bar |
| `shadow-lift-1` | Cards normales |
| `shadow-lift-2` | Modales, bottom sheets, toasts |

## Motion · `lib/theme/motion.ts`

```ts
SPRING_GENTLE  // 18/180/1   — movimientos sustanciales sin connotación festiva
SPRING_BOUNCE  // 12/220/1   — celebración (entrada de elementos)
SPRING_SNAPPY  // 24/280/0.6 — tap feedback, scale 0.97 al press
TIMING_FAST    // 150ms      — exits, dismissals
TIMING_NORMAL  // 250ms      — enters
TIMING_SLOW    // 450ms      — transiciones largas
```

Regla práctica: **enter** con timing, **exit** con timing más rápido, **tap feedback** con SPRING_SNAPPY.

## Haptics · `lib/theme/haptics.ts`

```ts
import { haptic } from '@/lib/theme/haptics';

haptic.tap();        // selección/cambio (tab, toggle)
haptic.success();    // confirmación positiva
haptic.warning();    // aviso no fatal (ayuno fuera de ventana)
haptic.error();      // error real
haptic.light();      // impacto suave (button press)
haptic.medium();     // impacto medio (FAB press, like)
haptic.heavy();      // impacto fuerte (subir nivel, hito)
```

Web ignora silenciosamente (no-op).

## Primitivos · `components/primitives/`

| Componente | Variantes / props clave |
|---|---|
| `<Heading>` | `size: xl/lg/md/sm` |
| `<Body>` | `size: lg/md/sm`, `tone: 1/2/3` |
| `<Caption>` | `variant: caption/overline`, `tone` |
| `<Button>` | `variant: primary/secondary/ghost/danger`, `size: sm/md/lg`, `loading`, `disabled`, `hapticOnSuccess` |
| `<Card>` | `variant: flat/elevated/glow`, `padded` |
| `<Input>` | `label`, `helper`, `error`, ref forwarding, border animado |
| `<Badge>` | `variant: default/success/warning/danger/info` |
| `<Modal>` | Modal centrado con backdrop, `dismissOnBackdrop` |
| `<BottomSheet>` | Sheet inferior, `heightFraction` |
| `<Skeleton>` | Pulso de opacidad. `Skeleton.Card`, `Skeleton.Row` shortcuts |
| `<EmptyState>` | `illustration + title + description + cta` |
| `<ProgressRing>` | SVG animado, `size`, `strokeWidth`, `progress 0..1`, `color` |
| `<TabBarFab>` | FAB violet flotante, usado por la tab bar custom |

Toast system aparte:

```ts
import { useToast } from '@/components/primitives';
const toast = useToast();
toast.success('Tarea completada');
toast.error('No se pudo guardar');
toast.info('Nueva versión disponible');
```

`ToastProvider` está montado una vez en `app/_layout.tsx`. Stack máximo 3, auto-dismiss 3s, tap para cerrar.

## Ilustraciones · `components/illustrations/`

5 ilustraciones SVG inline minimalistas (160×160) en violet con acento amber:

- `<EmptyRoutine />` — agenda + lápiz
- `<EmptyFeed />` — siluetas en círculo
- `<EmptyMessages />` — burbujas superpuestas
- `<EmptyGroups />` — siluetas + "+"
- `<EmptyHistory />` — gráfico plano con un punto
- `<ErrorBoundaryArt />` — círculo con cruz

## Celebraciones · `components/celebrations/`

| Componente | Cuándo |
|---|---|
| `<CompletionCelebration visible points taskTitle onClose />` | Al completar una tarea — confetti + anillo + "+X pts" |
| `<StreakMilestone visible days onClose />` | Al alcanzar hito de racha (7/14/30/50/100) |
| `<AchievementUnlock visible icon title description onClose />` | Toast XL al desbloquear logro |
| `<LevelUp visible level onClose />` | Al subir nivel — flash blanco + onda violet |
| `<ConfettiBurst count duration />` | Burst de partículas reusable |

Todas auto-cierran (configurable con `autoCloseMs`) y disparan haptic apropiado.

## Tab bar custom

`app/(tabs)/_layout.tsx` define un `<Tabs tabBar={...}>` con:

- 5 tabs nativas (Rutina, Feed, Buscar, Rankings, Perfil).
- FAB violet centrado **flotante por encima** del tab bar (no es Tab.Screen — es un overlay).
- Animación spring del icono al cambiar tab.
- Haptic `tap` al cambiar tab.
- Badge `coral-500` en Perfil.

Para añadir/cambiar una tab, edita el array `<Tabs.Screen>` y el mapa `TAB_META`.

## Convenciones para pantallas nuevas

1. Envolver con `<SafeAreaView className="flex-1 bg-surface-0">`.
2. Header con `Heading size="lg"` + (opcional) descripción `<Body size="md" tone={2}>`.
3. Contenido en `<Card variant="flat|elevated|glow" />`.
4. CTA primaria con `<Button size="lg" />`.
5. Loading: `Skeleton.Card` / `Skeleton.Row` o `Skeleton` con className custom.
6. Empty: `<EmptyState illustration title description cta />`.
7. Acción async exitosa: `useToast().success(...)`.

## Migración de pantallas legacy

Pantallas que aún usan `bg-brand-700` y demás clases `brand-*` siguen funcionando porque el alias `brand` apunta a la misma paleta `bp` desde Fase 17. Migrar a `bp-*` cuando se tematice cada pantalla, sin prisa.

## Pendiente

- Light mode (Fase futura).
- Lottie / micro-animaciones más complejas (Fase futura, si las SVG estáticas se quedan cortas).
- Ilustraciones de calidad pro (las actuales son geométricas minimalistas como placeholder).
- Migrar todos los call sites a usar primitivos en lugar de styling manual.
