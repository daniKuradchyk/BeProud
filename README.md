# BeProud

Red social de la productividad. Monorepo con app móvil (iOS + Android) y web sobre Expo + Supabase.

## Arranque rápido

```bash
# 1. Instalar dependencias
pnpm install

# 2. Copiar variables de entorno
cp .env.example .env.local
# Edita .env.local con tus claves de Supabase

# 3. Arrancar en web (más rápido para iterar)
pnpm dev:web

# 4. O arrancar en iOS simulator / Android emulator
pnpm dev
```

## Estructura

- `apps/mobile/` — Expo app (iOS, Android, Web).
- `packages/api/` — cliente Supabase tipado.
- `packages/validation/` — esquemas Zod compartidos cliente/servidor.
- `packages/config/` — tsconfig, eslint, tailwind presets.
- `packages/ui/` — componentes universales.
- `supabase/migrations/` — SQL versionado.
- `supabase/functions/` — Edge Functions.

## Documentos de producto

- `CLAUDE.md` — contexto e instrucciones para Claude Code en cada sesión.
- `PROMPTS.md` — secuencia de prompts por fases de construcción.
- `BeProud - Documento maestro.docx` — especificación completa.

## Estado

- **Fase 0 — Setup** ✅ en curso (monorepo + Expo web + Supabase client).

---

## Builds y distribución (beta)

### Variables de entorno

Cliente (Expo, prefijo obligatorio `EXPO_PUBLIC_`):

| Var | Obligatoria | Para qué |
|---|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | sí | URL del proyecto Supabase |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | sí | clave anónima |
| `EXPO_PUBLIC_SENTRY_DSN` | no | reporting de errores |
| `EXPO_PUBLIC_POSTHOG_KEY` | no | analítica |
| `EXPO_PUBLIC_POSTHOG_HOST` | no | endpoint PostHog (default UE) |

Servidor (Edge Functions y scripts, sin prefijo público):

| Var | Para qué |
|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | RPCs administrativas |
| `ANTHROPIC_API_KEY` | validación de fotos con Claude |

Local: copia `.env.example` → `.env.local` y rellena. Si faltan las dos obligatorias el cliente Supabase lanza un error claro al boot.

### Setup EAS (una vez por máquina)

```bash
npm install -g eas-cli
eas login
eas init                              # asocia projectId al app.config.ts
eas credentials                       # configura push, certs y signing iOS

# Subir secrets (una vez por proyecto, llegan a builds y a EAS Update)
eas secret:create --name EXPO_PUBLIC_SUPABASE_URL      --value <url> --scope project
eas secret:create --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value <key> --scope project
```

### Build preview (para amigos)

```bash
# Android — APK descargable, URL válida 30 días
eas build --platform android --profile preview --non-interactive

# iOS — TestFlight Internal Testing (hasta 100 testers, sin App Review)
eas build --platform ios --profile preview --non-interactive
eas submit --platform ios --profile production --latest
```

Tras `eas submit`, en `appstoreconnect.apple.com` → tu app → TestFlight:
1. Rellena "Test Information" (mínimo: contact email).
2. Crea / usa el grupo "Internal Testing".
3. Añade testers por email (cada uno con su Apple ID). Reciben un email de bienvenida y se instalan la build desde la app TestFlight.

### Sacar nueva versión

1. Bumpea `version` en [`apps/mobile/app.config.ts`](apps/mobile/app.config.ts) siguiendo semver.
2. Bumpea `buildNumber` (iOS) y `versionCode` (Android).
3. `eas build --profile preview` (o `production` si va a stores reales).
4. Para iOS, `eas submit --platform ios --profile production --latest`.
5. Para Android, manda la nueva URL del APK a tus amigos.

### Web (Netlify) y privacy policy pública

El monorepo tiene [`netlify.toml`](netlify.toml) con redirects SPA y headers seguros.

1. En `app.netlify.com` → "Add new site" → "Import from Git" → selecciona el repo.
2. Netlify detecta `netlify.toml` y construye con `pnpm --filter @beproud/mobile build:web`.
3. En **Site settings → Environment variables** añade `EXPO_PUBLIC_SUPABASE_URL` y `EXPO_PUBLIC_SUPABASE_ANON_KEY` (sin esto el bundle peta al cargar).
4. Renombra el subdominio en **Domain management → Options → Edit site name** a `beproud` (queda `https://beproud.netlify.app`).
5. La URL pública de privacidad será `https://beproud.netlify.app/legal/privacy`. Esa es la que pega en App Store Connect → App Information → Privacy Policy URL.

### Smoke test antes de mandar la build

Sigue [apps/mobile/SMOKE_TEST.md](apps/mobile/SMOKE_TEST.md) en un dispositivo iOS y otro Android antes de invitar a nadie.
