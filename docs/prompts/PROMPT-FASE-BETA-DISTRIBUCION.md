# Fase Beta · Build & Distribución (TestFlight + APK Android)

> Lee `CLAUDE.md` y `PROMPTS.md` antes de tocar nada. Esta fase **no añade features**. Es preparación de infraestructura para repartir builds a amigos.
> Modelo recomendado: **Claude Sonnet 4.6**.
> Rama: `chore/fase-beta-distribucion`. Un PR. Conventional Commits.
> Pre-requisito: cuenta Apple Developer ya pagada y en proceso de activación (24-48h). Esta fase **no depende** de que esté activa, salvo el último paso `eas submit:ios`.

---

## 1. Objetivo

Dejar todo listo para distribuir BeProud a amigos:

- **iOS**: vía TestFlight (internal testers, hasta 100, sin App Review).
- **Android**: vía APK directo construido con EAS Build, descarga por enlace.
- **Web**: deploy básico en Netlify para alojar la **privacy policy** y dar acceso opcional vía PWA.

No publicar a App Store ni Play Store. No abrir TestFlight externo todavía.

---

## 2. Datos de identidad de la app (decididos)

| Campo | Valor |
|---|---|
| Nombre | BeProud |
| Slug Expo | beproud |
| Bundle ID iOS | `com.beproud.app` |
| Package Android | `com.beproud.app` |
| Versión inicial | `0.1.0` |
| iOS buildNumber | `1` |
| Android versionCode | `1` |
| Categoría App Store | Health & Fitness (primaria), Lifestyle (secundaria) |
| Idiomas | es-ES (primario), en (secundario) |

> Si Claude Code detecta que `app.config.ts` ya tiene un bundle ID distinto, parar y preguntar antes de cambiarlo (no se puede cambiar sin crear app nueva en App Store Connect).

---

## 3. Plan de archivos

```
apps/mobile/
├── app.config.ts                       # actualizar
├── eas.json                            # crear o actualizar
├── app/
│   ├── (legal)/
│   │   ├── _layout.tsx                 # NUEVO
│   │   ├── privacy.tsx                 # NUEVO
│   │   └── terms.tsx                   # NUEVO (mínimo)
│   └── settings/
│       └── index.tsx                   # añadir links a /legal/privacy y /legal/terms
├── lib/
│   └── env.ts                          # NUEVO · centraliza access a EXPO_PUBLIC_*
├── public/
│   └── manifest.webmanifest            # NUEVO · PWA básica
└── README.md                           # añadir sección "Builds y distribución"

netlify.toml                            # NUEVO en raíz monorepo
.env.example                            # actualizar con todas las EXPO_PUBLIC_*
```

---

## 4. `app.config.ts` final

Convertir a `app.config.ts` (no `app.json`) si no lo es ya, para poder leer env vars.

```ts
import type { ExpoConfig } from 'expo/config';

const IS_DEV = process.env.APP_VARIANT === 'development';

const config: ExpoConfig = {
  name: IS_DEV ? 'BeProud (dev)' : 'BeProud',
  slug: 'beproud',
  version: '0.1.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  scheme: 'beproud',
  userInterfaceStyle: 'dark',
  newArchEnabled: true,
  runtimeVersion: { policy: 'appVersion' },
  splash: {
    image: './assets/splash.png',
    resizeMode: 'contain',
    backgroundColor: '#0b0b16',
  },
  assetBundlePatterns: ['**/*'],
  ios: {
    bundleIdentifier: IS_DEV ? 'com.beproud.app.dev' : 'com.beproud.app',
    buildNumber: '1',
    supportsTablet: true,
    infoPlist: {
      NSCameraUsageDescription:
        'BeProud usa la cámara para verificar tus tareas con foto y escanear códigos de barras de alimentos.',
      NSPhotoLibraryUsageDescription:
        'BeProud usa tu galería para subir fotos de tareas completadas.',
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    package: IS_DEV ? 'com.beproud.app.dev' : 'com.beproud.app',
    versionCode: 1,
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#0b0b16',
    },
    permissions: [
      'CAMERA',
      'READ_MEDIA_IMAGES',
      'READ_EXTERNAL_STORAGE',
      'POST_NOTIFICATIONS',
      'VIBRATE',
    ],
  },
  web: {
    bundler: 'metro',
    output: 'static',
    favicon: './assets/favicon.png',
  },
  plugins: [
    'expo-router',
    'expo-font',
    'expo-notifications',
    [
      'expo-camera',
      {
        cameraPermission:
          'BeProud usa la cámara para verificar tareas y escanear códigos de barras.',
        microphonePermission: false,
        recordAudioAndroid: false,
      },
    ],
    [
      'expo-image-picker',
      {
        photosPermission:
          'BeProud necesita acceso a tu galería para subir fotos de tareas.',
      },
    ],
  ],
  experiments: { typedRoutes: true },
  extra: {
    eas: {
      projectId: 'AUTO_REPLACE_ME', // Se rellena con `eas init` la primera vez
    },
    EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
    EXPO_PUBLIC_SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    EXPO_PUBLIC_SENTRY_DSN: process.env.EXPO_PUBLIC_SENTRY_DSN,
    EXPO_PUBLIC_POSTHOG_KEY: process.env.EXPO_PUBLIC_POSTHOG_KEY,
  },
};

export default config;
```

Avisos:
- Mantener `userInterfaceStyle: 'dark'` solo si la app actual es dark-only. Si soporta ambos, poner `'automatic'`.
- Verificar que los assets `icon.png`, `adaptive-icon.png` y `splash.png` existen y cumplen tamaños recomendados (1024×1024 sin transparencia para `icon.png`).

---

## 5. `eas.json`

```json
{
  "cli": { "version": ">=14.0.0", "appVersionSource": "remote" },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "env": { "APP_VARIANT": "development" },
      "ios": { "simulator": true }
    },
    "preview": {
      "distribution": "internal",
      "channel": "preview",
      "env": { "APP_VARIANT": "preview" },
      "android": { "buildType": "apk" },
      "ios": { "simulator": false }
    },
    "production": {
      "channel": "production",
      "autoIncrement": true,
      "android": { "buildType": "app-bundle" }
    }
  },
  "submit": {
    "production": {
      "ios": {
        "appleId": "REEMPLAZAR_CON_TU_APPLE_ID@correo.com",
        "ascAppId": "RELLENAR_TRAS_CREAR_APP_EN_ASC",
        "appleTeamId": "RELLENAR_DESDE_DEVELOPER_PORTAL"
      },
      "android": {
        "track": "internal"
      }
    }
  }
}
```

> Los placeholders `REEMPLAZAR_*` los rellena el usuario después, no Claude Code.

---

## 6. Variables de entorno

### 6.1 Local (`.env.local` en `apps/mobile`)

```
EXPO_PUBLIC_SUPABASE_URL=https://...supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...
# Opcionales
EXPO_PUBLIC_SENTRY_DSN=
EXPO_PUBLIC_POSTHOG_KEY=
```

### 6.2 Actualizar `.env.example` con las mismas claves vacías.

### 6.3 EAS Secrets (lo hace el usuario, no Claude Code)

Comandos que el usuario tendrá que ejecutar:

```bash
eas secret:create --name EXPO_PUBLIC_SUPABASE_URL --value https://...supabase.co --scope project
eas secret:create --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value eyJ... --scope project
```

Documentar esto en el README añadido en esta fase.

### 6.4 `lib/env.ts`

Centralizar acceso para que el resto de la app no dependa de strings:

```ts
import Constants from 'expo-constants';

function required(key: string, value: unknown): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`Missing env: ${key}`);
  }
  return value;
}

const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, unknown>;

export const ENV = {
  SUPABASE_URL: required('EXPO_PUBLIC_SUPABASE_URL', extra.EXPO_PUBLIC_SUPABASE_URL),
  SUPABASE_ANON_KEY: required('EXPO_PUBLIC_SUPABASE_ANON_KEY', extra.EXPO_PUBLIC_SUPABASE_ANON_KEY),
  SENTRY_DSN: (extra.EXPO_PUBLIC_SENTRY_DSN ?? '') as string,
  POSTHOG_KEY: (extra.EXPO_PUBLIC_POSTHOG_KEY ?? '') as string,
};
```

Refactorizar `packages/api/src/client.ts` y donde toque para usar `ENV` en vez de `process.env` directo.

---

## 7. Privacy policy y términos en la app

### 7.1 `app/(legal)/_layout.tsx`

Stack simple con header oscuro y título.

### 7.2 `app/(legal)/privacy.tsx`

Pantalla con `<Screen scroll>` y el texto siguiente. **Texto en español, escrito en prosa, no marketing**. Suficiente para TestFlight Beta Review interno y para Play Console futuro.

```
Política de privacidad de BeProud
Última actualización: <fecha del PR>

1. Quiénes somos
BeProud es una app desarrollada por Daniil Kuradchik. Contacto: xbydani99x@gmail.com.

2. Datos que recogemos
- Email y contraseña al registrarte (autenticación con Supabase Auth).
- Nombre visible y nombre de usuario que tú escoges.
- Datos opcionales del onboarding: edad, sexo biológico, altura, peso, días de entrenamiento por semana, objetivo principal, equipamiento disponible, restricciones físicas. Solo se usan para personalizar tu rutina.
- Fotos que subes para verificar tareas. Son privadas por defecto y solo accesibles a través de URLs firmadas con caducidad.
- Mensajes que envías a tus contactos o grupos.
- Registros de actividad: completions de tareas, puntos, racha, posición en rankings.
- Token de notificaciones push (si lo aceptas) para enviarte avisos relacionados con la app.

3. Datos que NO recogemos
No pedimos DNI, dirección, número de teléfono ni datos bancarios. No rastreamos tu ubicación. No vendemos datos a terceros. No usamos publicidad.

4. Cómo usamos tus datos
Para prestarte el servicio: autenticación, generar tu rutina, mostrarte tu progreso, conectarte con amigos, enviarte notificaciones.

5. Dónde se almacenan
En Supabase, alojado en la Unión Europea. Las fotos se guardan en buckets privados de Supabase Storage.

6. Tus derechos (GDPR)
Puedes acceder a tus datos, corregirlos, exportarlos o solicitar su eliminación. Desde Ajustes → Cuenta puedes borrar tu cuenta. La eliminación es definitiva en un plazo máximo de 30 días.

7. Edad mínima
BeProud requiere 13 años o más. Si descubrimos que un usuario es menor de esa edad, eliminaremos su cuenta.

8. Cambios en esta política
Te avisaremos en la app si cambia algo material. La fecha de "última actualización" arriba refleja la versión vigente.

9. Contacto
Para cualquier consulta: xbydani99x@gmail.com.
```

### 7.3 `app/(legal)/terms.tsx`

Versión mínima en español:

```
Términos de uso de BeProud
Última actualización: <fecha>

1. Aceptación
Al usar BeProud aceptas estos términos. Si no estás de acuerdo, no uses la app.

2. Cuenta
Eres responsable de mantener la confidencialidad de tu cuenta. Notifícanos si crees que ha sido comprometida.

3. Contenido prohibido
No subas fotos sexualmente explícitas, violentas, ilegales, ni que muestren a menores en contextos inapropiados. No suplantes la identidad de otros. No publiques contenido que no sea tuyo.

4. Validación con IA
BeProud usará un sistema automatizado para verificar las fotos de tareas. Las decisiones del sistema pueden ser revisadas en caso de error contactando con soporte.

5. Cancelación
Podemos suspender o cerrar cuentas que infrinjan estos términos. Tú puedes cerrar tu cuenta cuando quieras desde Ajustes.

6. Limitación de responsabilidad
BeProud se ofrece "tal cual". No nos hacemos responsables de daños derivados del uso de la app más allá de lo exigido por la ley.

7. Ley aplicable
Estos términos se rigen por la ley española.
```

### 7.4 Links en `app/settings/index.tsx`

Añadir dos filas al final: "Política de privacidad" y "Términos de uso", que navegan a `/(legal)/privacy` y `/(legal)/terms`.

---

## 8. PWA básica + deploy web (Netlify)

Esto sirve para que la **URL pública de privacy policy** que TestFlight pide tenga un home digno y que opcionalmente cualquier amigo pueda usar la versión web.

### 8.1 `public/manifest.webmanifest`

```json
{
  "name": "BeProud",
  "short_name": "BeProud",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0b0b16",
  "theme_color": "#0b0b16",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

Generar `icon-192.png` e `icon-512.png` desde el icono existente.

### 8.2 `netlify.toml` (raíz del monorepo)

```toml
[build]
  command  = "pnpm install --frozen-lockfile && pnpm --filter @beproud/mobile web:build"
  publish  = "apps/mobile/dist"

[build.environment]
  NODE_VERSION = "20"
  PNPM_VERSION = "9"

# SPA routing: cualquier ruta no encontrada cae al index.html del bundle Expo Router.
[[redirects]]
  from   = "/*"
  to     = "/index.html"
  status = 200

# Cabeceras seguras básicas.
[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options    = "DENY"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy    = "strict-origin-when-cross-origin"
```

> El bloque `[[redirects]]` es **imprescindible**. Sin él, Netlify devolverá 404 en cualquier subruta directa como `/legal/privacy` cuando el user llegue por enlace, porque el bundle es una SPA.

### 8.3 Deploy

El usuario crea un proyecto en `app.netlify.com` → "Add new site" → "Import from Git", selecciona el repo de BeProud, autoriza GitHub, y Netlify detecta el `netlify.toml` automáticamente. Tras el primer deploy, los push a `main` despliegan solos.

Subdominio resultante por defecto: `beproud.netlify.app` o `<algo-aleatorio>.netlify.app` que el usuario puede renombrar en Site settings → Domain management → Options → Edit site name.

URL pública de privacy: `https://beproud.netlify.app/legal/privacy`. Esa es la que se mete en App Store Connect.

> Las variables `EXPO_PUBLIC_*` también hay que meterlas en Netlify → Site settings → Environment variables. Documentar en el README.

---

## 9. Configuración App Store Connect (lo hace el usuario)

Claude Code **no puede hacer esto**, solo documentarlo en el README. Pasos:

1. Entrar a `appstoreconnect.apple.com`.
2. **My Apps → +** → New App.
3. Platform: iOS. Name: BeProud. Primary Language: Spanish (Spain). Bundle ID: seleccionar `com.beproud.app` (debería aparecer en el dropdown si las builds previas registraron el bundle, si no, crearlo en `developer.apple.com → Identifiers`). SKU: `beproud-001`. User Access: Full.
4. Una vez creada, en **App Information**:
   - Subtítulo, categoría primaria (Health & Fitness), categoría secundaria (Lifestyle), URL de privacy (`https://beproud.vercel.app/legal/privacy`).
5. En **App Information → Privacy Policy URL**: pegar `https://beproud.netlify.app/legal/privacy`.
6. Para que `eas submit` funcione, copiar **Apple ID** (email), **App ID** (numérico, en App Information) y **Team ID** (en developer.apple.com → Membership) al `eas.json`.

---

## 10. Comandos de build y submit (los ejecuta el usuario)

Documentar en README la secuencia, paso a paso:

```bash
# Una sola vez por máquina
npm install -g eas-cli
eas login
eas init                                # asocia projectId al app.config.ts
eas credentials                         # configura push, certs y signing iOS

# Subir secrets (una vez)
eas secret:create --name EXPO_PUBLIC_SUPABASE_URL --value <url> --scope project
eas secret:create --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value <key> --scope project

# Builds preview (para amigos en TestFlight + APK Android)
eas build --platform ios     --profile preview --non-interactive
eas build --platform android --profile preview --non-interactive

# Subir a TestFlight
eas submit --platform ios --profile production --latest
```

> Atención: para `submit:ios` la cuenta Apple Developer debe estar **activa** (no solo pagada). Tarda 24-48h.

---

## 11. Distribución a amigos

### 11.1 iOS — TestFlight

1. Tras `eas submit`, esperar 15-60 min a que App Store Connect procese la build.
2. En App Store Connect → app → **TestFlight**:
   - Rellenar "Test Information" (mínimo: contact email).
   - Crear un grupo "Internal Testing" (o usar el por defecto).
   - Añadir testers por email (deben tener un Apple ID con esa dirección).
3. Cada amigo recibirá un email "Welcome to TestFlight". Instala la app TestFlight de Apple, acepta la invitación, instala BeProud.

> Hasta 100 internal testers. Sin App Review. Cada build vale 90 días.

### 11.2 Android — APK

1. `eas build --platform android --profile preview --non-interactive` devuelve una URL de descarga.
2. Mandas la URL a tus amigos por WhatsApp/Telegram.
3. Ellos abren el link en su móvil, descargan, autorizan "Instalar de fuentes desconocidas" (una vez por origen), instalan.
4. La URL de EAS expira en **30 días**. Cada nueva build genera nueva URL.

---

## 12. Smoke test antes de mandar la build a amigos

Añadir un fichero `apps/mobile/SMOKE_TEST.md` con esta lista, para que el usuario marque manualmente:

1. Instalar la build preview en un dispositivo iOS y otro Android.
2. Registrar usuario nuevo desde 0 con email no usado antes.
3. Recibir email de confirmación de Supabase, confirmar.
4. Completar onboarding entero (9 pasos con biometría).
5. Generar rutina, verificar que aparece con bloques temporales y Now Card.
6. Completar 1 tarea genérica con foto desde la cámara real.
7. Iniciar 1 sesión Pomodoro de prueba (25/5 con 1 minuto de focus para acelerar).
8. Si la Fase 14 está merged: registrar 1 alimento desde Open Food Facts y otro escaneando un código de barras.
9. Abrir feed, dar like a un post de prueba.
10. Crear o unirse a un grupo de prueba, enviar un mensaje.
11. Activar push notifications, mandarse una notificación de prueba desde Supabase.
12. Cerrar app y reabrir → comprobar que la sesión persiste.
13. Intentar borrar cuenta desde Settings → confirmar que el flujo funciona end-to-end.
14. Comprobar que en `Settings` aparecen y funcionan los enlaces a `Privacy policy` y `Términos`.
15. En Sentry (si está configurado): no hay errores nuevos.

Cualquier fallo bloquea el envío. Un bug es bug, no "ya lo arreglo cuando suba".

---

## 13. README ampliado

Añadir sección al `README.md` raíz:

```
## Builds y distribución (beta)

### Desarrollo
pnpm dev

### Build preview (amigos)
eas build --platform ios     --profile preview
eas build --platform android --profile preview

### Subir a TestFlight
eas submit --platform ios --profile production --latest

### Sacar nueva versión
1. Bumpear `version` en `app/mobile/app.config.ts` (semver).
2. Bumpear `buildNumber` y `versionCode`.
3. eas build (preview o production según destino).
4. eas submit (solo para iOS production).
5. Mandar nuevo APK a amigos Android.
```

---

## 14. Criterios de aceptación

1. `app.config.ts` tiene bundle id, version, runtime version, permisos correctamente configurados.
2. `eas.json` tiene tres perfiles: `development`, `preview`, `production`.
3. `lib/env.ts` centraliza acceso a env vars y la app falla rápido si falta alguna obligatoria.
4. `app/(legal)/privacy.tsx` y `terms.tsx` existen y son accesibles desde Settings.
5. `pnpm web:build` produce un `dist/` que sirve correctamente la home y `/legal/privacy` cuando se sirve estáticamente.
6. `netlify.toml` permite a Netlify construir el monorepo sin errores y la regla de redirects evita 404 en rutas profundas.
7. README actualizado con instrucciones de build y distribución.
8. `apps/mobile/SMOKE_TEST.md` creado.
9. `pnpm lint`, `pnpm typecheck`, `pnpm test` pasan.
10. **No** hay claves Supabase en código fuente. Solo en env vars / EAS Secrets / Vercel envs.

---

## 15. Plan de testing manual (lo hace el usuario después de Claude Code)

1. `pnpm install && pnpm typecheck` en local.
2. `pnpm web:build` y servir el `dist/` (`npx serve apps/mobile/dist`). Comprobar `localhost:3000/legal/privacy` rendea bien.
3. Conectar el repo a Vercel y comprobar deploy automático con la URL pública de privacy.
4. `eas init && eas build:configure` desde la raíz (o `apps/mobile`). Verificar que se rellena `eas.projectId`.
5. `eas secret:create` para las variables Supabase.
6. `eas build --platform android --profile preview` → instalar en un Android.
7. Cuando la cuenta Apple Developer esté activa: `eas build --platform ios --profile preview` → `eas submit --platform ios --profile production --latest`.
8. Esperar procesado en App Store Connect, añadir Internal Testers, invitar a 1-2 amigos para sanity check antes de abrir más.

---

## 16. Qué NO hacer

- No abrir TestFlight externo (eso requiere Beta App Review). Solo internal por ahora.
- No subir a Play Store. Solo APK directo.
- No pegar las claves Supabase en `app.config.ts` ni en ningún archivo versionado.
- No cambiar el bundle id ni el package Android una vez se hayan registrado en App Store Connect / Play Console.
- No instalar libs nuevas. Solo configuración.
- No tocar lógica de negocio en este PR. Es exclusivamente infraestructura.

---

## 17. Entregables al final

1. PR mergeado a `main` verde.
2. URL pública de privacy policy funcionando (`https://beproud.vercel.app/legal/privacy` o equivalente).
3. README actualizado.
4. SMOKE_TEST.md.
5. Una build preview Android (APK) descargable.
6. Cuando la cuenta Apple esté activa: una build iOS subida a TestFlight con al menos 1 tester invitado y validado.
7. Resumen breve en el PR de lo hecho y los pasos manuales pendientes para el usuario.

---

## 18. Vista al futuro (no hacer en esta fase)

- Cuando crezcas de 5 a 50 amigos: pagar 25€ Google Play Console y configurar **Internal Testing track** para reemplazar el envío de APK manual.
- Cuando quieras pasar de 100 testers iOS: configurar **TestFlight External Testing** que requiere Beta App Review (lighter que App Store Review, primera vez 24-48h).
- Cuando estés listo para producción: perfil `production` en `eas.json` + Sentry obligatorio + flag de release en código + smoke test ampliado.
- Configurar **Sentry** y **PostHog** con sus DSN/keys reales (el código ya queda preparado en `lib/env.ts`).
- Plan de versionado: una versión `0.x.y` por feature mensual, parches `0.x.{y+1}` para bugfixes inmediatos.
