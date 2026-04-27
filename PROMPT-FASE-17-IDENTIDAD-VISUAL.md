# Fase 17 · Identidad y reestructuración visual

> Lee `CLAUDE.md` y `PROMPTS.md` antes de tocar nada. Esta fase **no añade features funcionales**, **no cambia BBDD**, **no introduce IA**. Es 100% diseño y motor de marca.
> Modelo recomendado: **Claude Sonnet 4.6**.
> Rama: `feat/fase-17-design-system`. Un PR. Conventional Commits.
> Pre-requisitos: Fases 12–16 ya merged.

---

## 1. Objetivo

Pasar de "app funcional con look de template" a **app con identidad de marca propia**. Definir un design system completo (paleta, tipografía, spacing, radius, shadows, motion), construir una biblioteca de componentes primitivos reutilizables, retematizar las pantallas más vistas (Rutina, Onboarding, Tab Bar, Feed, Perfil, Hub de diseño de rutina), añadir celebraciones al completar tareas / desbloquear logros, ilustraciones en empty states y skeletons en cargas.

Restricciones duras:

- **Ninguna feature nueva**. Si una pantalla nueva se requiere para mostrar la celebración o el empty state, sí, pero no se introduce funcionalidad de negocio nueva.
- **Sin libs pesadas nuevas**. Solo `expo-haptics` (justificado: feedback háptico es parte central del motor de marca; muy ligero). **No** Lottie. **No** moti. **No** tamagui (ya descartado en CLAUDE.md de todas formas). Reanimated 3 ya está en deps y es el motor de animaciones.
- **NativeWind sigue siendo la fuente de estilos**. No introducir styled-components, stylesheets nativos o emotion. La paleta y tokens van a un `tailwind.config.js` extendido.

---

## 2. Plan de archivos

```
apps/mobile/
├── tailwind.config.js                       # extender theme con tokens
├── lib/
│   ├── theme/
│   │   ├── tokens.ts                        # constantes de spacing, radius, motion
│   │   ├── motion.ts                        # presets de Reanimated
│   │   └── haptics.ts                       # wrappers de expo-haptics
│   └── ...
├── components/
│   ├── primitives/
│   │   ├── Button.tsx                       # NUEVO (reemplaza el actual)
│   │   ├── Card.tsx
│   │   ├── Input.tsx
│   │   ├── Modal.tsx
│   │   ├── BottomSheet.tsx
│   │   ├── Toast.tsx
│   │   ├── Skeleton.tsx
│   │   ├── EmptyState.tsx
│   │   ├── Heading.tsx
│   │   ├── Body.tsx
│   │   ├── Caption.tsx
│   │   ├── Badge.tsx
│   │   └── ProgressRing.tsx                 # SVG + Reanimated
│   ├── celebrations/
│   │   ├── ConfettiBurst.tsx
│   │   ├── CompletionCelebration.tsx        # full-screen al completar
│   │   ├── StreakMilestone.tsx              # cada 7/30/100 días
│   │   └── AchievementUnlock.tsx
│   ├── illustrations/
│   │   ├── EmptyRoutine.tsx                 # SVG inline
│   │   ├── EmptyFeed.tsx
│   │   ├── EmptyMessages.tsx
│   │   ├── EmptyGroups.tsx
│   │   ├── EmptyHistory.tsx
│   │   └── ErrorBoundary.tsx
│   └── (existing screens-specific siguen donde estaban)
├── app/
│   ├── _layout.tsx                          # Toaster provider, fonts
│   └── (tabs)/_layout.tsx                   # Tab bar custom
└── assets/
    └── fonts/                               # Inter si decidimos cargarla
```

---

## 3. Tokens del design system

### 3.1 Paleta

Extender `tailwind.config.js` con la paleta nueva. **No borres** la `brand-*` existente: hazla alias del nuevo namespace `bp` (BeProud) para no romper imports masivos durante la transición.

```js
// tailwind.config.js — extracto del theme.extend.colors
{
  // Marca
  bp: {
    // Primario · violeta profundo, productividad con personalidad
    50:  '#F2EEFF',
    100: '#E0D4FF',
    200: '#C2A9FF',
    300: '#A47FFF',
    400: '#8654FF',
    500: '#6B3BF5',  // base
    600: '#5A2DDB',
    700: '#4521B8',
    800: '#321796',
    900: '#1F0E66',
  },
  // Acento · amber cálido, celebración y energía
  amber: {
    400: '#FFB547',
    500: '#F59A1F',
  },
  // Éxito
  emerald: {
    400: '#10D9A0',
    500: '#0BB587',
  },
  // Error / aviso
  coral: {
    400: '#FF7A7A',
    500: '#F25656',
  },
  // Superficies del modo oscuro (modo principal)
  surface: {
    0:   '#0B0B16',  // background app
    1:   '#13131F',  // card base
    2:   '#1A1A2A',  // card elevada / modal
    3:   '#22223A',  // borde sutil
  },
  // Texto
  ink: {
    0:   '#FFFFFF',
    1:   '#F5F5FA',  // primario
    2:   '#B8B8C8',  // secundario
    3:   '#7A7A8C',  // terciario / placeholder
    4:   '#4A4A5C',  // disabled
  },
}
```

Mantener `brand` como mapping al nuevo `bp` para retrocompatibilidad:

```js
// theme.extend.colors continúa
brand: {
  50: 'var(--bp-50)', // o repetir literalmente los valores de bp
  // ... idéntico a bp
}
```

(Si `var(--bp-*)` no funciona en NativeWind 4, repetir literales).

### 3.2 Tipografía

Sistema de jerarquía con clases reutilizables. Mantener fuentes del sistema (no cargar Inter para no añadir 200ms de boot por cada cara). En lugar de fonts custom, usar la pila por defecto y empujar con peso/tamaño.

```js
// theme.extend.fontSize (en rem, NW los pasa a px)
fontSize: {
  'display-xl': ['44px', { lineHeight: '48px', letterSpacing: '-0.02em', fontWeight: '800' }],
  'display':    ['32px', { lineHeight: '36px', letterSpacing: '-0.02em', fontWeight: '800' }],
  'heading':    ['24px', { lineHeight: '30px', fontWeight: '700' }],
  'subheading': ['20px', { lineHeight: '26px', fontWeight: '700' }],
  'body-lg':    ['17px', { lineHeight: '24px', fontWeight: '500' }],
  'body':       ['15px', { lineHeight: '22px', fontWeight: '500' }],
  'caption':    ['13px', { lineHeight: '18px', fontWeight: '500' }],
  'overline':   ['11px', { lineHeight: '14px', fontWeight: '700', letterSpacing: '0.08em' }],
}
```

Crear componentes wrapper en `components/primitives/`:

- `<Heading>` → display por defecto, props `size: 'xl'|'lg'|'md'|'sm'`.
- `<Body>` → body con props `size: 'lg'|'md'|'sm'` y `tone: 1|2|3`.
- `<Caption>` → caption sm.

Eso evita que la app tenga 50 combinaciones distintas de `text-Xpx font-Xbold text-color-X`.

### 3.3 Spacing y sizing

Tokens estándar Tailwind ya cubren la mayor parte. Añadir alias semánticos:

```js
spacing: {
  // alias semánticos
  'tap-min': '44px',  // tamaño mínimo de tap target (Apple HIG)
  'gutter':  '16px',  // padding lateral de pantalla por defecto
}
```

### 3.4 Radius

```js
borderRadius: {
  'xs': '6px',
  'sm': '10px',
  'md': '14px',
  'lg': '20px',
  'xl': '28px',
  '2xl': '36px',  // ya en NW por defecto
  'pill': '9999px',
}
```

Cards de tarea → `rounded-lg`. Cards de módulo en hub → `rounded-xl`. Bottom sheets → `rounded-t-2xl`. Botones → `rounded-pill`.

### 3.5 Sombras

Cuando renderizamos en dark mode las sombras "negras" no se ven; usar **glow violet sutil** en cards primarias (Now Card, ModuleCard activo) y sombras planas en el resto:

```js
boxShadow: {
  'glow-bp':    '0 0 0 1px rgba(107,59,245,0.4), 0 8px 24px -4px rgba(107,59,245,0.35)',
  'lift-1':     '0 1px 2px rgba(0,0,0,0.4)',
  'lift-2':     '0 4px 12px rgba(0,0,0,0.5)',
}
```

### 3.6 Motion presets · `lib/theme/motion.ts`

```ts
import { Easing } from 'react-native-reanimated';

export const SPRING_GENTLE  = { damping: 18, stiffness: 180, mass: 1 };
export const SPRING_BOUNCE  = { damping: 12, stiffness: 220, mass: 1 };
export const SPRING_SNAPPY  = { damping: 24, stiffness: 280, mass: 0.6 };

export const TIMING_FAST    = { duration: 150, easing: Easing.bezier(0.4, 0, 0.2, 1) };
export const TIMING_NORMAL  = { duration: 250, easing: Easing.bezier(0.4, 0, 0.2, 1) };
export const TIMING_SLOW    = { duration: 450, easing: Easing.bezier(0.32, 0.72, 0.0, 1) };
```

Regla: **enter** con timing, **exit** con timing más rápido, **tap feedback** con spring snappy, **celebración** con spring bounce.

### 3.7 Haptics · `lib/theme/haptics.ts`

```ts
import * as Haptics from 'expo-haptics';

export const haptic = {
  tap:        () => Haptics.selectionAsync(),
  success:    () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
  warning:    () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning),
  error:      () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error),
  light:      () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
  medium:     () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),
  heavy:      () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy),
};
```

Web no soporta haptics: detectar `Platform.OS === 'web'` dentro de cada wrapper y devolver `Promise.resolve()` sin error.

> Justificación de añadir `expo-haptics`: librería de Expo SDK, sin coste de bundle relevante (~2KB), parte del motor de marca.

---

## 4. Biblioteca de primitivos

Cada uno de estos componentes debe cumplir:

- TS estricto, props bien tipadas.
- `accessibilityLabel` obligatorio en interactivos.
- Soportar ref forwarding cuando aplique (Input, Pressable).
- Sin colores hardcodeados — todos vienen del tailwind theme.
- Animaciones suaves en interacciones (scale 0.97 al press, fade en mount).

### 4.1 `Button`

Variantes:

- `primary` → bg `bp-500`, text `ink-0`, sombra `glow-bp` cuando focused.
- `secondary` → bg `surface-2`, border `surface-3`, text `ink-1`.
- `ghost` → transparente, text `bp-300` o `ink-1`.
- `danger` → bg `coral-500`, text `ink-0`.

Tamaños: `sm` (h-9), `md` (h-12, default), `lg` (h-14).

Estados: idle, pressed (scale 0.97 + brightness-95), loading (spinner inline), disabled (opacity 50).

Haptic: `light` al press en variante primary/secondary; `success` después del onPress async exitoso (configurable con prop `hapticOnSuccess`).

### 4.2 `Card`

Variantes:

- `flat` → bg `surface-1`, sin sombra.
- `elevated` → bg `surface-2`, sombra `lift-1`.
- `glow` → bg `surface-2` con border bp, sombra `glow-bp`. Para Now Card.

Padding default `p-4`, override por prop. Radius `lg` por defecto.

### 4.3 `Input`

Wrap del TextInput nativo con:

- Label opcional encima.
- Helper / error text debajo.
- Border `surface-3` idle, `bp-500` focused, `coral-400` error.
- Haptic `light` al focus.

### 4.4 `BottomSheet`

Reemplazo del modal nativo con animación de subida con `SPRING_SNAPPY`. Backdrop con fade. Drag-to-dismiss desde el handle. Sin libs nuevas: usar `Modal` de RN + Reanimated + Gesture Handler (ya en deps).

### 4.5 `Toast`

Provider en `_layout.tsx` raíz. API:

```ts
toast.success('Tarea completada');
toast.error('No se pudo guardar');
toast.info('Nueva versión disponible');
```

Sale por arriba con `SPRING_GENTLE`, dura 3s, tap para cerrar antes. Apilable hasta 3.

### 4.6 `Skeleton`

```tsx
<Skeleton className="h-4 w-32 rounded-md" />
<Skeleton.Card />     // shortcut para card placeholder estándar
<Skeleton.Row />      // shortcut para fila de lista
```

Animación de shimmer con Reanimated (gradiente moviéndose). Color base `surface-2`, highlight `surface-3`.

### 4.7 `EmptyState`

```tsx
<EmptyState
  illustration={<EmptyRoutine />}
  title="Aún no has diseñado tu rutina"
  description="Te llevamos a diseñarla por bloques."
  cta={{ label: 'Diseñar', onPress: ... }}
/>
```

Layout vertical centrado. Ilustración SVG arriba (size 160px), title `Heading sm`, description `Body sm tone-2`, cta `Button primary md`.

### 4.8 `ProgressRing`

SVG circular con stroke animado. Reanimated. Props:

- `size` (px)
- `strokeWidth`
- `progress` (0–1)
- `color` (token)
- `trackColor` (token)
- `duration` (ms)

Útil para anillos de Pomodoro, anillos de macros, anillo de Ayuno.

### 4.9 `Badge`

Pill con texto pequeño. Variantes `default | success | warning | danger | info`. Para racha, nivel, achievements, etc.

---

## 5. Tab Bar rediseñada

Reemplazar el tab bar por defecto de Expo Router con uno propio. Implementar como custom component en `app/(tabs)/_layout.tsx`:

- Background `surface-1` con safe-area-bottom.
- 5 tabs: Rutina, Feed, **Crear** (centrado, más grande, color `bp-500`, icono `+`, **flotante**), Rankings, Perfil.
- El tab Crear es un **FAB** que rompe el patrón visual (círculo grande con sombra `glow-bp`) y abre la pantalla de completar tarea.
- Iconos: `@expo/vector-icons` ya en deps. Usar Ionicons o Feather — elegir uno y mantenerlo.
- Estado activo: icono cambia a `bp-300`, label en `bp-300` con `font-bold`. Animación spring del icono al cambiar tab (scale 1 → 1.1 → 1).
- Haptic `selection` al cambiar tab.
- Badge en Perfil/Mensajes: pill `coral-500` con número arriba a la derecha del icono cuando hay pendientes.

---

## 6. Pantallas a retematizar

### 6.1 Onboarding · pantalla de bienvenida

Hoy `app/(onboarding)/step-1-welcome.tsx` es texto + botón. Convertir en una pantalla con peso visual:

- Top: animación de entrada con elementos de marca (3 chips flotantes "Tareas con foto", "Rutina por bloques", "Verificación con IA") que aparecen con stagger usando Reanimated.
- Centro: logo grande BeProud (SVG) con un sutil glow violet animado (pulso suave cada 3s).
- Texto: `display-xl` "Sé constante. Sé tú." (o similar — sugerir 2-3 alternativas en el PR).
- Subtexto: párrafo corto explicando la propuesta.
- CTA grande primary `Empezar`.
- En oscuro full-bleed con gradiente sutil `from-bp-900/50 to-surface-0`.

### 6.2 Hub "Diseña tu día" (Fase 15)

Las 3 cards de bloques quedaban pobres. Rediseñarlas:

- Cada card ocupa 1/3 del alto disponible (no fixed height).
- Background degradado vertical sutil: morning warm rosa-naranja, afternoon dorado, evening violet-night.
- Si está sin configurar: ilustración SVG pequeña representando el momento (sol amaneciendo / sol pleno / luna), título grande, subtítulo "Sin configurar", CTA `Diseñar →`.
- Si está configurado: lista mini de las tareas (max 3), badge "✓ Configurado", CTA secundaria `Editar`.
- Animaciones de entrada con stagger 80ms entre cards.

### 6.3 Pantalla Rutina (tab principal)

- Header: avatar + saludo dinámico según hora ("Buenos días, Marcos") + racha en badge.
- Now Card: full-bleed (con ligero margin lateral), variante `glow`, icono grande de la categoría con glow del color de marca, botón `COMPLETAR` ocupa todo el ancho con efecto press scale.
- Carrusel de módulos: `snapToInterval`, cards con sombra `lift-2`.
- Bloques: header con dot pulsante en el slot activo, fade-in de cada fila al expandir, completar una fila la hace tachar con animación de strike-through.
- Background sutil: gradient desde `surface-0` arriba hasta `surface-1` abajo para dar profundidad.

### 6.4 Feed

- Cards de post con border `surface-3`, image full-bleed dentro de la card con `rounded-md`.
- Avatar redondo con border `bp-500` si el user lo sigues (chip de seguimiento).
- Like button: heart con animación de scale 1.3 al tap, color `coral-400`. Haptic medium al like.
- Tiempo relativo en `caption tone-3`.
- Pull-to-refresh con custom indicador (anillo violet pequeño).

### 6.5 Perfil

- Header con cover (gradient violet o cover real si la subes en futura fase), avatar grande superpuesto.
- Nombre, username, bio.
- Tres stats grandes en fila: nivel, racha, completions totales.
- Anillo de progreso al siguiente nivel (`ProgressRing`).
- Tabs internos: Posts / Logros / Estadísticas (estos no se implementan ahora, dejar tabs preparadas con placeholders para Fase 18).

### 6.6 Modal de completar tarea (`/(tabs)/create`)

- Bottom sheet ocupa 90% del alto.
- Foto en grande con esquinas `rounded-xl`.
- Botón de tomar foto con icono de cámara grande, animación de press obvia.
- Al validar (mock por ahora, ya que Fase 9 no está activa): pantalla de confirmación con `CompletionCelebration`.

---

## 7. Celebraciones

### 7.1 `CompletionCelebration`

Pantalla full-screen que aparece al completar una tarea. Duración 2.5s.

Composición:
- Fondo blur del último frame con tint violet.
- Confetti burst desde el centro (40 partículas SVG con Reanimated, físicas simples: gravity, drift, fade).
- Anillo gigante creciendo desde 0 al tamaño de la pantalla, color `bp-500`.
- Texto en el centro: `+{points} puntos` `display-xl` en `amber-400`, debajo `body-lg` con el nombre de la tarea.
- Haptic `success` al inicio.
- Tap a la pantalla la cierra antes.

### 7.2 `StreakMilestone`

Cuando el user llega a 7, 14, 30, 50, 100 días de racha. Pantalla full-screen 3s:
- Llama de fuego SVG animada.
- "🔥 7 días seguidos!" `display-xl`.
- "Sigue así" subheading.
- Botón `Compartir` que dispara `expo-sharing` con un texto preformateado y, en futura fase, una imagen generada con la racha.

### 7.3 `AchievementUnlock`

Toast XL animado por arriba (no full-screen) cuando se desbloquea un achievement. Duración 4s, dismissable. Icon del logro + nombre + "+X puntos".

### 7.4 `LevelUp`

Cuando el user sube de nivel:
- Particle effect central + flash blanco (50ms) + color violeta saliendo radial.
- Texto `Nivel {n+1}`.

---

## 8. Empty states ilustrados

Crear 5 ilustraciones SVG **inline** (no archivos externos para evitar issues de bundling). Estilo: trazo simple, monocromo violet con un acento amber, dimensiones 160×160.

- `EmptyRoutine`: ilustración de una agenda en blanco con un lápiz.
- `EmptyFeed`: gente saludando en círculo, sin ningún contenido en medio.
- `EmptyMessages`: dos burbujas vacías superpuestas.
- `EmptyGroups`: tres siluetas pequeñas con "+".
- `EmptyHistory`: gráfico de líneas plano con un único punto.

Cada uno se usa en su pantalla correspondiente cuando los datos están vacíos.

---

## 9. Loading skeletons

Sustituir todos los `<ActivityIndicator>` y todos los flashes de pantalla en blanco por skeletons que coincidan con la forma del contenido final:

- Pantalla Rutina cargando: skeleton del header + Now Card + 4 filas de bloques.
- Feed cargando: 3 skeletons de post (avatar + 4 líneas + image).
- Perfil cargando: avatar + 2 líneas + 3 stats.
- Mensajes cargando: 6 filas de thread.

Tiempo mínimo de skeleton 250ms (evita parpadeos cuando la query resuelve en 50ms).

---

## 10. Migración de pantallas existentes

Para no hacer un PR imposible de revisar, migrar progresivamente:

1. Definir tokens y tailwind config (sección 3). **Verificar que no rompe nada existente** porque mantenemos `brand-*` como alias.
2. Construir primitivos (sección 4). Reescribir el `Button` actual para usar la API nueva. **El alias `brand` debe seguir funcionando** durante la transición.
3. Tab bar custom (sección 5).
4. Onboarding welcome (6.1).
5. Hub diseño rutina (6.2).
6. Pantalla Rutina (6.3).
7. Feed (6.4).
8. Perfil (6.5).
9. Modal completar (6.6).
10. Celebraciones (sección 7).
11. Empty states + skeletons (secciones 8 y 9).

Cada paso debe dejar la app funcional y compilando. Si algún paso requiere refactor masivo (ej: cambiar todos los `Button` viejos), hacer ese paso como commit aparte para que sea fácil de revertir.

---

## 11. Criterios de aceptación

1. Tailwind config tiene los tokens de la sección 3 sin romper imports existentes.
2. Existen los 12 primitivos en `components/primitives/` con TS estricto y JSDoc breve cada uno.
3. Tab bar nuevo con FAB central, animación al cambiar tab y haptic feedback.
4. 6 pantallas retematizadas (Onboarding welcome, Hub diseño, Rutina, Feed, Perfil, Modal completar).
5. 4 celebraciones funcionando (Completion, Streak, AchievementUnlock, LevelUp).
6. 5 empty states ilustrados.
7. Skeletons en todas las pantallas con queries — sin pantallas en blanco.
8. `expo-haptics` instalado y conectado a tap/success en los componentes interactivos clave.
9. `pnpm lint`, `pnpm typecheck` y `pnpm test` pasan. Sin `any`, sin `console.log`.
10. La build web sigue funcionando: haptics se ignoran en web sin error.
11. Bundle size NO crece más de 200KB (validar con `eas diagnostics` o equivalente).
12. Todas las pantallas modificadas siguen siendo accesibles (VoiceOver lee correctamente cada cambio).

---

## 12. Plan de testing manual

1. Crear cuenta nueva. Pasar onboarding welcome — comprobar animación de chips flotantes, glow del logo, transición a step-2.
2. Completar onboarding y aterrizar en hub "Diseña tu día" — comprobar gradient por bloque, ilustraciones, stagger de entrada.
3. Diseñar mañana con asistente — comprobar las animaciones del wizard (slide entre preguntas), haptic en selección.
4. Aceptar propuesta — comprobar `CompletionCelebration` cuando completes la primera tarea.
5. Volver a Rutina — comprobar Now Card con glow, haptic al pulsar, anillo del Pomodoro animado en card del módulo Estudio si está activo.
6. Tab bar — cambiar entre tabs, ver animación + haptic. Pulsar el FAB central — abre el modal de completar.
7. Feed vacío — comprobar empty state con ilustración.
8. Perfil propio — comprobar header con cover gradient, anillo de progreso al siguiente nivel.
9. Llegar a 7 días de racha (manipular DB para forzar) — comprobar `StreakMilestone`.
10. Desbloquear un achievement — comprobar `AchievementUnlock` toast.
11. Ir a una pantalla con datos cargando — verificar que aparece skeleton coherente, no spinner.
12. Bajar a iOS y Android para validar haptics, escalas de tipo, sombras.
13. Probar en web (`pnpm web:build`) — verificar que ninguna pantalla se rompe por haptics o por SVG.

---

## 13. Qué NO hacer

- No instalar Lottie, Moti, Tamagui, Styled Components ni librerías de animación adicionales.
- No introducir Inter / fonts custom — sistema fonts.
- No tocar lógica de negocio. Solo presentación.
- No tocar BBDD ni API.
- No cambiar el sistema de puntos al añadir celebraciones — solo presentar lo que el backend ya da.
- No añadir light mode (queda para fase futura). La app sigue siendo dark-only.
- No cambiar el tab bar a 6 tabs ni renombrar tabs existentes (Rutina, Feed, Crear, Rankings, Perfil siguen siendo los 5).
- No tocar el flujo de cámara / `expo-image-picker` más allá de aplicar el sheet con la nueva forma visual.
- No añadir efectos de scroll parallax exagerados que mareen.

---

## 14. Entregables

1. PR mergeado a `main` verde.
2. Capturas obligatorias en el PR: onboarding welcome, hub diseño rutina, pantalla Rutina con Now Card, modal completar con celebración, perfil, tab bar.
3. Vídeo corto (10-15 s) grabado del flujo "completar una tarea" mostrando la celebración + haptic — como recurso para que tengamos siempre la referencia del look.
4. Documento corto `docs/design-system.md` (1-2 páginas) listando los tokens y cómo usar los primitivos.
5. Resumen breve en el PR de qué cambió, qué pantallas quedan sin retematizar (si las hay), y plan para abordarlas en fases siguientes.

---

## 15. Notas para fases futuras

- **Fase 18 · Wellness Pulse**: daily check-in (energía + sueño), weekly review automático los domingos, water tracking con quick actions, insights/correlaciones, recordatorios contextuales basados en patrones.
- **Fase 19 · Light mode**: añadir tema claro alternativo. Implica decidir paleta light, soportar `useColorScheme` y testar todas las pantallas.
- **Fase 20 · Lottie / micro-illustrations animadas**: si las ilustraciones SVG estáticas se quedan cortas, sustituir por Lottie en momentos clave (welcome screen, celebraciones grandes).
- **Fase 21 · Widget iOS / Live Activity**: contador de tareas hoy en lock screen, Pomodoro / Ayuno en Live Activity. Requiere config nativa con `expo-target` o módulo custom.
