# BeProud · Contexto para Claude Code

Este archivo es tu **fuente de verdad** al trabajar en este repositorio. Léelo entero al empezar cualquier sesión nueva y respétalo en todas las decisiones. Si vas a desviarte de algo aquí escrito, **avisa antes al usuario** y espera confirmación.

---

## 1. Producto en una frase

BeProud es una red social móvil (iOS + Android) y web para hábitos y productividad: los usuarios completan tareas de su rutina subiendo una foto, ganan puntos validados por IA y compiten con amigos en rankings y grupos.

> Nombre alterno: el usuario también se refiere a la app como "Biproduct". Usa **BeProud** como nombre oficial en código, identidad y App Store; conserva "Biproduct" solo como referencia histórica en documentación si aparece.

El documento de producto completo está en `BeProud - Documento maestro.docx` (arquitectura, modelo de datos, funcionalidades). Si algo aquí entra en conflicto con ese documento, gana este CLAUDE.md porque refleja el estado actual del código.

---

## 2. Usuario humano

- No va a tocar código.
- Tú decides, implementas y explicas. Al final de cada tarea entregas:
  1. Un resumen corto de qué cambió.
  2. Cómo probarlo manualmente paso a paso.
  3. Si algo quedó a medias o dudoso, lo dices explícitamente.
- Si una decisión tiene trade-offs importantes (coste, tiempo, complejidad), **pregunta antes** en lugar de elegir por defecto.

---

## 3. Stack tecnológico (no cambiar sin permiso)

| Capa | Tecnología |
|---|---|
| App móvil + web | Expo SDK 52 + React Native + Expo Router v4 + Expo Web |
| Lenguaje | TypeScript 5.x en modo `strict` |
| Estilos | NativeWind (Tailwind 3 para RN) |
| Componentes | Tamagui (elegido por soporte universal móvil+web) |
| Estado cliente | Zustand |
| Estado servidor | TanStack Query v5 |
| Formularios | React Hook Form + Zod |
| Backend | Supabase (Postgres + Auth + Storage + Realtime + Edge Functions + RLS) |
| Validación IA | Anthropic Claude API (`claude-haiku-4-5`) con visión, invocada desde Edge Function |
| Push | Expo Notifications + Expo Push Service |
| Analítica | PostHog |
| Errores | Sentry |
| Build móvil | EAS Build + EAS Submit |
| Hosting web | Vercel |
| Monorepo | pnpm workspaces |
| CI | GitHub Actions (lint, typecheck, test) |

**Prohibido sin aprobación explícita**: añadir un framework adicional, cambiar de Supabase a Firebase, abandonar TypeScript, introducir clases de estilos distintas a Tailwind/NativeWind, usar Redux.

---

## 4. Estructura del repositorio

```
beproud/
├── apps/
│   └── mobile/                  # Expo app (iOS/Android/Web con Expo Web)
│       ├── app/                 # Rutas Expo Router (file-based)
│       ├── components/          # Componentes UI reutilizables
│       ├── features/            # Código organizado por épica (auth, onboarding, feed, groups…)
│       ├── hooks/
│       ├── lib/
│       ├── assets/
│       └── app.config.ts
├── packages/
│   ├── ui/                      # Componentes universales
│   ├── api/                     # Cliente Supabase tipado (supabase-js wrapper)
│   ├── validation/              # Zod schemas compartidos cliente/servidor
│   └── config/                  # tsconfig, eslint, tailwind presets
├── supabase/
│   ├── migrations/              # SQL versionado (timestamped)
│   ├── functions/               # Edge Functions (Deno)
│   │   ├── validate-photo/
│   │   ├── send-push/
│   │   └── refresh-leaderboards/
│   └── seed.sql                 # Catálogo de tareas inicial
├── .github/workflows/           # CI
├── CLAUDE.md
├── PROMPTS.md
├── README.md
└── package.json
```

- Un feature pertenece a **un** módulo de `features/`. Si una pantalla de feed necesita un botón de mensajes, el botón vive en `features/messages/components/` y el feed lo importa. **Nada de dependencias cruzadas entre features**.
- Todo tipo que cruce cliente/servidor se define en `packages/validation` con Zod y se importa en ambos lados.

---

## 5. Convenciones de código

### 5.1 TypeScript
- `strict: true`, `noUncheckedIndexedAccess: true`, `noImplicitOverride: true`.
- Nada de `any`. Si un tipo es desconocido, usa `unknown` y estrecha.
- Tipos de BBDD: generar automáticamente con `supabase gen types typescript` y versionarlos en `packages/api/src/database.types.ts`.

### 5.2 Estilo
- Componentes funcionales con hooks, sin clases.
- `PascalCase` para componentes, `camelCase` para funciones y variables, `SCREAMING_SNAKE` para constantes.
- Un componente = un archivo. Archivo de componente exporta default el componente + named exports solo si son tipos propios.
- Imports ordenados: stdlib → externos → internos por alias `@/` → relativos.

### 5.3 Testing
- Vitest para unitarios de `packages/*`.
- Maestro SQL: cada migración debe ir acompañada de un test que verifica el schema en un Supabase local.
- No hace falta cobertura total: prioriza tests en lógica de puntos, validación IA y permisos RLS.

### 5.4 Git
- Rama `main` siempre verde.
- Ramas `feat/<fase>-<descripcion-corta>`, `fix/...`, `chore/...`.
- Commits en imperativo, en inglés, siguiendo Conventional Commits (`feat:`, `fix:`, `chore:`, `refactor:`, `docs:`, `test:`).
- Un PR por fase de PROMPTS.md. Nunca mezclar fases.

---

## 6. Seguridad y privacidad

Reglas no negociables:

1. **RLS activado en todas las tablas** desde la primera migración. Ninguna tabla puede estar accesible sin política.
2. **Secretos jamás en el cliente**. Claves de servicio de Supabase, API key de Anthropic y Expo access tokens viven solo en:
   - Variables de entorno de Supabase (Edge Functions).
   - Secrets de GitHub Actions.
   - `.env.local` (gitignored) para desarrollo.
3. **Storage privado por defecto**. Las fotos de tareas se sirven con URLs firmadas con expiración ≤ 60 minutos.
4. **PII mínima**. No pedimos DNI, teléfono ni dirección. Email + username es suficiente.
5. **Borrado de cuenta** debe eliminar o anonimizar todos los datos personales en ≤ 30 días (cumplimiento GDPR).
6. **Menores**: la app requiere 13+ en el onboarding. Registra la confirmación.

---

## 7. Cómo se completa una tarea con foto (flujo canónico)

Debes implementar siempre así, nada de atajos:

1. Cliente pide permiso y captura foto con `expo-image-picker` o `expo-camera`.
2. Cliente comprime a máximo 1080px de lado mayor, formato webp.
3. Cliente sube a bucket `task-photos` en ruta `{user_id}/{yyyy}/{mm}/{uuid}.webp`. Policy: solo el dueño puede leer/escribir su prefijo.
4. Cliente hace INSERT en `task_completions` con `ai_validation_status = 'pending'`, `photo_path` y `routine_task_id`.
5. Un trigger Postgres (`after insert on task_completions`) encola un job que invoca la Edge Function `validate-photo` por `pg_net` o webhook.
6. `validate-photo` descarga la foto por URL firmada, llama a Claude con el prompt estándar (ver `supabase/functions/validate-photo/prompt.ts`) y actualiza el registro con `ai_validation_status`, `ai_confidence`, `ai_reason` y `points_awarded`.
7. Si `is_public`, un trigger posterior inserta en `posts`.
8. Cliente recibe el resultado por suscripción Realtime a `task_completions` con filtro por su `user_id`.

**No** llames a Claude desde el cliente. **No** pongas la validación en la transacción del INSERT (sería lenta y bloquearía el UX).

---

## 8. Prompts a Claude API (validación)

El prompt está versionado en `supabase/functions/validate-photo/prompt.ts` y devuelve **solo** JSON con este esquema Zod:

```ts
const ValidationResponse = z.object({
  valid: z.boolean(),
  confidence: z.number().min(0).max(1),
  reason: z.string().max(200),
  unsafe: z.boolean(), // true si la imagen contiene contenido inapropiado
});
```

Si la respuesta no parsea con Zod, `ai_validation_status = 'invalid'` y `reason = 'parse_error'`.

Modelo: `claude-haiku-4-5`. Temperature 0. `max_tokens` ≤ 200.

---

## 9. Pantallas y navegación (estructura Expo Router)

```
app/
├── (auth)/
│   ├── login.tsx
│   ├── register.tsx
│   └── forgot-password.tsx
├── (onboarding)/
│   ├── step-1-welcome.tsx
│   ├── step-2-goals.tsx
│   ├── step-3-availability.tsx
│   ├── step-4-level.tsx
│   ├── step-5-preferences.tsx
│   └── step-6-review.tsx
├── (tabs)/
│   ├── _layout.tsx             # Tab bar: Rutina, Feed, Crear, Rankings, Perfil
│   ├── routine.tsx
│   ├── feed.tsx
│   ├── create.tsx              # Completar tarea con foto (modal)
│   ├── rankings.tsx
│   └── profile.tsx
├── user/[username].tsx
├── post/[id].tsx
├── group/[id].tsx
├── messages/
│   ├── index.tsx
│   └── [threadId].tsx
├── settings/
│   ├── index.tsx
│   ├── notifications.tsx
│   ├── privacy.tsx
│   └── account.tsx
└── _layout.tsx
```

---

## 10. Reglas para sesiones de Claude Code

1. **Una fase cada vez**. Cada entrada de PROMPTS.md es un sprint autocontenido. No anticipes fases futuras en el código.
2. **Plan antes de tocar**. Al recibir el prompt de una fase, primero propón un plan con la lista de archivos que vas a crear/modificar. Espera OK del usuario.
3. **Migraciones atómicas**. Una migración SQL = un cambio conceptual. Siempre `up` reversible; si no lo es, documenta por qué.
4. **Nunca rompas `main`**. Corre `pnpm lint` y `pnpm typecheck` antes de proponer merge.
5. **Nada de `TODO` sin issue**. Si dejas algo pendiente, crea un issue en GitHub con la etiqueta `tech-debt`.
6. **Si algo es ambiguo, pregunta**. Mejor dos preguntas cortas que tres días de reescritura.
7. **Seed data**: el catálogo inicial de tareas se crea en `supabase/seed.sql` y se recarga con `pnpm seed`. No insertes datos de ejemplo en migraciones.
8. **Idioma**: código en inglés, textos de UI en español (ES) como idioma principal, EN como secundario via i18n (`packages/ui/i18n/`).
9. **Accesibilidad**: todos los elementos interactivos tienen `accessibilityLabel`. Los colores cumplen contraste AA mínimo.
10. **Respeta la tab bar** definida arriba. Añadir una pestaña nueva requiere aprobación.

---

## 11. Comandos útiles

```bash
# Monorepo
pnpm install
pnpm dev                  # arranca Expo (iOS, Android, Web)
pnpm lint
pnpm typecheck
pnpm test

# Supabase local
pnpm supabase:start       # arranca Supabase en Docker
pnpm supabase:reset       # reinicia BBDD + aplica migraciones + seed
pnpm supabase:types       # regenera tipos TS desde el schema

# Edge Functions
pnpm supabase:functions:serve   # local
pnpm supabase:functions:deploy  # a producción

# Builds
pnpm eas:build:ios        # iOS (TestFlight)
pnpm eas:build:android    # Android (APK)
pnpm eas:submit:ios       # sube a TestFlight
pnpm web:build            # build web para Vercel
```

Define todos los scripts en `package.json` raíz como atajos del monorepo.

---

## 12. Qué NO hacer

- **No** escribir código antes de plantear un plan en la primera respuesta de cada fase.
- **No** instalar librerías sin justificar por qué no sirve lo que ya hay.
- **No** crear nuevas tablas o columnas sin una migración versionada.
- **No** duplicar tipos entre cliente y servidor. Zod en `packages/validation` es la fuente única.
- **No** dejar `console.log` en código merged a `main`. Usa `@/lib/logger`.
- **No** tocar las políticas RLS sin actualizar sus tests.
- **No** hardcodear strings de UI. Siempre vía i18n.

---

## 13. Glosario corto

- **Tarea**: unidad base de productividad del catálogo (ir al gimnasio, leer 30 min…).
- **Rutina**: conjunto de tareas asignadas a un usuario con frecuencia.
- **Completion**: ejecución de una tarea en un día, con foto y puntos.
- **Post**: completion pública que aparece en el feed.
- **Liga**: sistema semanal de ascenso/descenso basado en puntos de la semana.
- **Racha (streak)**: días consecutivos con al menos un completion válido.
