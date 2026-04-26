# BeProud · Prompts para Claude Code (por fases)

Este archivo contiene los prompts que vas a pasarle a Claude Code, **en orden**, una fase por sesión. Cada prompt asume que Claude Code ya leyó `CLAUDE.md`. No saltes fases: cada una depende de las anteriores.

**Cómo usarlo:**
1. Abre una sesión de Claude Code en el repo.
2. Copia y pega el prompt de la fase que toca.
3. Claude Code primero propondrá un plan → di "OK" o pide cambios.
4. Cuando termine, pídele el resumen y prueba manualmente con los pasos que te dé.
5. Haz merge del PR y pasa a la siguiente fase en una sesión nueva.

---

## Fase 0 · Setup del repositorio

```
Estamos empezando BeProud desde cero. Este repo está vacío salvo por CLAUDE.md y
PROMPTS.md. Quiero que prepares el andamiaje del monorepo según la estructura y el
stack definidos en CLAUDE.md.

Objetivos de esta fase:
1. Monorepo pnpm con workspaces: apps/mobile y packages/{ui,api,validation,config}.
2. App Expo SDK 52 con TypeScript strict, Expo Router v4, NativeWind, Tamagui.
3. Cliente Supabase tipado en packages/api (supabase-js + @supabase/ssr para web).
4. Validaciones Zod en packages/validation con un esquema de ejemplo.
5. Config compartida en packages/config: tsconfig base, eslint flat config, tailwind preset.
6. CI en GitHub Actions: lint + typecheck + test en cada PR.
7. Scripts en package.json raíz: dev, lint, typecheck, test, supabase:start,
   supabase:reset, supabase:types, supabase:functions:serve, eas:build:ios,
   eas:build:android, web:build.
8. README corto con cómo arrancar en local.
9. .env.example con las variables necesarias (EXPO_PUBLIC_SUPABASE_URL,
   EXPO_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, ANTHROPIC_API_KEY,
   EXPO_PUBLIC_POSTHOG_KEY, SENTRY_DSN). Los valores van vacíos; el usuario los
   rellena al final.

NO implementes pantallas reales aún. Solo una pantalla "Hola BeProud" para verificar
que Expo corre en iOS, Android y Web.

Entrega:
- Plan propuesto con la lista de archivos.
- Cuando apruebe: todo el código.
- Al final: resumen, comando exacto para arrancar y cómo confirmar que los 3
  targets (iOS sim, Android emu, web) funcionan.
```

**Criterio de aceptación:** ejecutando `pnpm dev` y abriendo los tres targets aparece la pantalla "Hola BeProud".

---

## Fase 1 · Autenticación y perfil mínimo

```
Fase 1: autenticación con Supabase y perfil mínimo.

Alcance:
1. Proyecto Supabase: crea la primera migración con la tabla `profiles`
   (id uuid PK = auth.uid(), username unique, display_name, avatar_url, bio,
   created_at, updated_at) y un trigger que crea el profile al registrar un usuario.
2. Activa RLS en profiles con políticas: select pública (solo columnas públicas
   vía una vista `public_profiles`), update solo por el propio usuario.
3. Auth en la app: email+contraseña, Google y Apple (Apple obligatorio en iOS).
   Configura redirects para iOS, Android y web.
4. Flow de onboarding mínimo post-registro: pedir username único y display_name
   antes de entrar a la app.
5. Pantalla de perfil con edición básica (avatar vía expo-image-picker subiendo
   a bucket `avatars` con policy por user_id).
6. Recuperación de contraseña por email.
7. Guardián de rutas: si no hay sesión → (auth), si hay pero falta username →
   (onboarding)/complete-profile, si todo OK → (tabs).
8. Tests: políticas RLS en profiles (un usuario no puede actualizar a otro).

Añade comandos en `packages/api` para:
- getSession, signIn, signUp, signOut.
- useProfile (TanStack Query hook) y useUpdateProfile.

Al final, dime cómo probar: crear cuenta, cerrar sesión, loguear, cambiar avatar.
```

**Criterio de aceptación:** registro + login funcionales en iOS y web; cambiar avatar persiste y se ve en otro dispositivo.

---

## Fase 2 · Onboarding, catálogo de tareas y rutina

```
Fase 2: formulario inicial, catálogo y generación de rutina.

Paso 1. Migraciones SQL:
- `tasks_catalog` con (id, slug, title, description, category, base_points,
  icon, photo_hint). RLS: select pública, sin insert desde el cliente.
- `goals` (id, user_id, title, horizon, target_points, created_at). RLS:
  owner-only.
- `routines` (id, user_id, horizon, starts_at, ends_at, is_active). RLS:
  owner-only.
- `routine_tasks` (id, routine_id, task_id, target_frequency, points_override,
  position). RLS: owner-only vía routines.user_id.
- Función SQL `generate_routine(user_id, answers jsonb) returns uuid` que crea
  una rutina diaria con tareas del catálogo según las respuestas del formulario.

Paso 2. Seed: rellena `supabase/seed.sql` con ~80 tareas cubriendo fitness,
estudio, nutrición, bienestar, productividad, sociales. Puntos razonables
(gimnasio 50, paseo 15 min 10, leer 30 min 20, etc.).

Paso 3. Pantallas de onboarding en `app/(onboarding)` con 6 pasos:
welcome, goals, availability, level, preferences, review. Persiste respuestas
en Zustand y al confirmar llama a `generate_routine`.

Paso 4. Pantalla "Rutina" en `(tabs)/routine.tsx` mostrando la rutina activa
del día. Permite añadir/quitar tareas desde el catálogo, cambiar frecuencia
y reordenar.

Paso 5. Tests sobre `generate_routine` con distintos perfiles de entrada.

Al final: plan de prueba manual del onboarding completo desde registro hasta
ver la rutina.
```

**Criterio de aceptación:** tras el onboarding el usuario ve una rutina diaria coherente con sus respuestas, y puede editarla.

---

## Fase 3 · Completar tareas con foto

```
Fase 3: el corazón del bucle.

Base de datos:
- Migración `task_completions` (id, user_id, routine_task_id, photo_path,
  points_awarded, ai_validation_status ('pending'|'valid'|'invalid'|'skipped'),
  ai_confidence, ai_reason, is_public, created_at). RLS: select propia siempre;
  de otros solo si is_public=true (en esta fase aún no validamos follows).
- Bucket `task-photos` privado con policy por user_id.

Cliente:
- Botón "Completar" en cada tarea de la rutina del día.
- Sheet modal con cámara o galería, compresión a 1080px webp.
- Toggle "Publicar en el feed" (default ON).
- Tras confirmar: subida a Storage → INSERT task_completions con
  ai_validation_status='skipped' (la IA llega en Fase 9) y points_awarded =
  base_points.
- Suma optimista a profiles.total_points (usa un trigger Postgres que
  incremente total_points en cada insert válido).
- Animación de confirmación con puntos ganados.
- Historial por tarea y calendario mensual en el perfil.

Pantalla "Perfil" (propia) mejorada:
- Grid de fotos (tus completions, público y privado para ti).
- Stats: total_points, racha actual (calcula en Postgres con una función
  `current_streak(user_id)`), completions del mes.

Tests:
- RLS de task_completions (no puedo leer completions privadas de otros).
- Trigger de puntos.
- Función current_streak con varios escenarios.

Al final: pasos para subir una foto y ver que aparece en el perfil con puntos.
```

**Criterio de aceptación:** completo una tarea, gano puntos, la foto aparece en mi perfil y mi total_points se actualiza.

---

## Fase 4 · Feed social (likes y comentarios)

```
Fase 4: feed vertical tipo Instagram.

BBDD:
- `posts` (id, completion_id unique, user_id, caption, likes_count,
  comments_count, created_at). Trigger que crea el post al insertar un
  task_completion con is_public=true.
- `likes` (post_id, user_id, created_at) PK compuesta. Trigger que mantiene
  likes_count en posts.
- `comments` (id, post_id, user_id, parent_id nullable, text, created_at).
  Trigger que mantiene comments_count.
- Vista `feed_for_user(viewer_id)` que retorna posts de la gente seguida + los
  propios (en esta fase aún no hay follows, así que empieza devolviendo los
  posts de cualquier usuario con cuenta pública para poder probar; cuando
  llegue la Fase 5 ajustaremos la vista).

Cliente:
- Pantalla `(tabs)/feed.tsx` con FlatList + paginación por cursor con
  TanStack Query.
- Cada post: foto, autor (avatar+username), tarea con puntos, caption,
  likes, comentarios, tiempo relativo.
- Botón like con animación y actualización optimista.
- Pantalla detalle de post `app/post/[id].tsx` con hilo de comentarios (1 nivel
  de anidación) y campo de respuesta.
- Suscripción Realtime a inserts de posts y likes/comments del post abierto.

Consideraciones:
- La foto se sirve con URL firmada (TTL 1 h).
- Reportar post y bloquear usuario (stub que inserta en tabla `reports` y
  `blocks`).

Tests:
- Triggers de likes_count y comments_count consistentes.
- RLS: un bloqueo mutuo oculta posts correctamente.

Al final: plan de prueba con dos cuentas de test.
```

**Criterio de aceptación:** dos cuentas ven posts una de la otra, dan likes, comentan y los contadores se sincronizan en tiempo real.

---

## Fase 5 · Seguir, seguidores y búsqueda

```
Fase 5: capa social con follows, cuentas privadas y búsqueda.

BBDD:
- `follows` (follower_id, followed_id, status ('pending'|'accepted'), created_at)
  PK compuesta. RLS: insert/delete por follower; update de status por followed.
- Columna `profiles.is_private boolean default false`.
- Actualiza la vista `feed_for_user` para respetar visibilidad: ve posts si
  el autor no es privado O yo le sigo con status='accepted'.
- Función `search_profiles(q text)` con búsqueda insensible a acentos y ordenada
  por relevancia.

Cliente:
- Buscador con debounce 300ms y resultados progresivos.
- Botones "Seguir", "Solicitado", "Siguiendo" según estado.
- Pantallas de listas: seguidores y seguidos en el perfil.
- Notificación in-app (no push aún) cuando te solicitan seguir.
- Ajuste "Cuenta privada" en ajustes.
- Recomendaciones: "amigos de amigos" y "miembros de mi grupo" (devuelve vacío
  hasta la Fase 7) en una sección "Sugerencias para ti".

Tests:
- RLS de follows y visibilidad del feed.
- Cuenta privada oculta posts hasta aceptar.

Al final: cómo probar follow público, privado, aceptar solicitud y cancelar follow.
```

**Criterio de aceptación:** cuentas públicas y privadas funcionan correctamente; feed respeta follows.

---

## Fase 6 · Mensajería directa

```
Fase 6: chats 1-a-1.

BBDD:
- `threads` (id, type ('dm'|'group'), group_id nullable, last_message_at).
- `thread_members` (thread_id, user_id, last_read_at) PK compuesta.
- `messages` (id, thread_id, sender_id, content, media_url nullable, created_at).
- RLS: select/insert en messages solo si soy miembro del thread; thread_members
  select solo para el propio usuario.
- Función `get_or_create_dm(other_user_id)` para reutilizar thread existente.

Cliente:
- `app/messages/index.tsx`: lista de conversaciones con último mensaje, avatar
  del otro usuario, indicador de no leído.
- `app/messages/[threadId].tsx`: chat tipo WhatsApp con bubbles, imágenes
  (subida a bucket `message-media`), Realtime.
- Badge de no leídos en el tab bar.
- Respeto de bloqueos: no puedes escribir a alguien que te bloqueó.

Tests:
- RLS de thread_members (un extraño no puede leer mi DM).
- get_or_create_dm no crea duplicados.

Al final: pasos para chatear entre dos cuentas de prueba.
```

**Criterio de aceptación:** dos usuarios intercambian mensajes y se ven en tiempo real con contador de no leídos.

---

## Fase 7 · Grupos y chat grupal

```
Fase 7: competición en grupo.

BBDD:
- `groups` (id, owner_id, name, description, cover_url, is_private,
  invite_code unique, created_at).
- `group_members` (group_id, user_id, role ('owner'|'admin'|'member'), joined_at).
- Extiende `threads` para que un grupo tenga un único thread asociado.
- Función `join_group_by_code(code)` que valida y añade al llamante.
- RLS: los grupos privados son invisibles salvo para miembros y por código.

Cliente:
- Crear grupo (nombre, descripción, cover, privado sí/no → genera código si sí).
- Invitar compartiendo enlace `beproud://g/<code>` o `https://beproud.app/g/<code>`
  (deep links con expo-linking).
- Listar miembros, cambiar rol, expulsar (owner/admin).
- Chat de grupo reutiliza Fase 6 vía thread.
- Ranking interno del grupo (diario, semanal, mensual) calculado desde
  task_completions. Usa `weekly_leaderboards` filtrado por group_id.

Tests:
- RLS: no miembro no ve posts privados del grupo.
- Deep link de invitación funciona en iOS, Android y web.

Al final: instrucciones para crear grupo, invitar a un amigo y ver ranking.
```

**Criterio de aceptación:** grupo privado funcional con chat y ranking interno diario/semanal/mensual.

---

## Fase 8 · Gamificación (niveles, rachas, ligas, logros)

```
Fase 8: capa de gamificación.

BBDD:
- Columnas `profiles.level`, `profiles.streak_current`, `profiles.streak_best`.
- Tabla `leagues` (id, name, min_points_week, max_points_week, tier 1..5).
- Tabla `weekly_leaderboards` (week date, user_id, group_id nullable, points,
  rank, league_id) PK (week, user_id, coalesce(group_id, '00000000...')).
- Tabla `achievements` (id, slug, title, description, icon) + seed (~20 logros:
  primer completion, 7 días de racha, 30 días, 100 completions, primer post,
  primer grupo, primer comentario recibido, subir de liga…).
- Tabla `user_achievements` (user_id, achievement_id, unlocked_at).
- Función `refresh_weekly_leaderboards()` que calcula el ranking de la semana
  actual por usuario global y por grupo. Programar con `pg_cron` cada hora.
- Triggers para desbloquear logros al cumplir condiciones.

Cliente:
- `(tabs)/rankings.tsx`: tabs "Global", "Mis grupos". Muestra liga actual con
  promoción/descenso y barra de progreso semanal.
- Pantalla "Logros" en el perfil con logros desbloqueados y bloqueados.
- Notificación in-app al subir de liga o desbloquear logro.

Tests:
- refresh_weekly_leaderboards correcto.
- Triggers de logros idempotentes.

Al final: cómo simular una semana con datos de prueba para ver cambios de liga.
```

**Criterio de aceptación:** un usuario con suficientes puntos sube de liga y ve logros desbloqueados.

---

## Fase 9 · Validación IA de fotos con Claude

```
Fase 9: la IA valida lo que el usuario sube.

Edge Function `validate-photo`:
- Entrada: task_completion_id.
- Descarga la foto por URL firmada.
- Obtiene la tarea asociada (título, descripción, category, photo_hint).
- Llama a Anthropic Claude `claude-haiku-4-5` con visión.
- Prompt (en `supabase/functions/validate-photo/prompt.ts`): explica qué tarea
  debería aparecer en la foto y pide JSON con { valid, confidence, reason,
  unsafe }. Temperature 0, max_tokens 200.
- Valida con Zod. Si falla parse → invalid.
- Actualiza task_completions: ai_validation_status, ai_confidence, ai_reason,
  points_awarded (si valid → base_points; si invalid → 0 y reversa el trigger
  de puntos).
- Si unsafe → invalid + flag en reports.

Anti-fraude:
- Calcula pHash de la foto (librería disponible en Deno) y guarda en
  `task_completions.photo_phash`.
- Antes de validar, compara con hashes recientes del usuario; si hay match
  muy cercano, invalid con reason="duplicate_photo".

Trigger:
- `after insert on task_completions` que invoca la Edge Function vía `pg_net`
  con el id del registro.

Ajustes en cliente:
- El estado ai_validation_status se refleja en tiempo real: "Validando...",
  "Validada", "No válida" con motivo.
- Permite reintentar una tarea rechazada con otra foto.

Tests:
- Mock de Anthropic devuelve valid/invalid y el estado queda consistente.
- Duplicado detectado.
- Rollback de puntos tras invalid.

Al final: cómo añadir una ANTHROPIC_API_KEY a los secretos y cómo probar con
una foto buena y una mala.
```

**Criterio de aceptación:** una foto coherente con la tarea se valida; una sin relación se rechaza; los puntos se ajustan correctamente.

---

## Fase 10 · Notificaciones push y ajustes

```
Fase 10: notificaciones push reales y pantallas de ajustes.

BBDD:
- `push_tokens` (user_id, token, platform, updated_at) PK (user_id, token).
- `notifications` (id, user_id, type, payload jsonb, read_at, created_at).
- Preferencias en `profiles.notification_prefs jsonb` con toggles por tipo.

Edge Function `send-push`:
- Consume de `notifications` nuevos vía trigger pg_net.
- Construye payloads Expo Push y los envía en lotes.
- Respeta quiet hours (23:00–08:00 local del usuario).
- Registra fallos y retira tokens inválidos.

Cliente:
- Registro del token Expo Push al iniciar sesión con expo-notifications.
- Pantalla `settings/notifications.tsx` con toggles por tipo (like, comentario,
  seguidor, DM, cambio de liga, recordatorio diario a hora configurable).
- Pantalla `settings/privacy.tsx`: cuenta privada, bloqueos.
- Pantalla `settings/account.tsx`: email, contraseña, borrado de cuenta
  (llama a función `delete_user_account` que anonimiza contenido y elimina
  datos personales; en 30 días se purga físicamente).
- Pantalla `settings/data.tsx`: "Exportar mis datos" genera un zip con
  perfil, completions y fotos. Puede tardar → se envía por email cuando esté
  listo.

Políticas y legales:
- Página estática `app/legal/privacy.tsx` y `app/legal/terms.tsx` con textos
  reales (generados por ti, luego revisados por un abogado antes de lanzar).

Tests:
- Envío push con token de prueba a Expo Push.
- Borrado de cuenta deja datos anonimizados.

Al final: cómo probar una notificación real en un iPhone físico.
```

**Criterio de aceptación:** recibo push real al darme like; puedo borrar mi cuenta y los datos se anonimizan.

---

## Fase 11 · Pulido, builds y distribución (TestFlight + APK + Vercel)

```
Fase 11: dejar la app presentable e instalable.

Pulido:
- Revisa todas las pantallas contra una checklist de accesibilidad (contraste,
  accessibilityLabel, tamaño táctil ≥ 44px).
- Estados vacíos en feed, rankings, mensajes.
- Skeletons de carga en vez de spinners.
- Manejo de errores globales con Sentry y banners amables.
- Dark mode coherente con Tamagui.
- Internacionalización: ES completo, EN como fallback.
- Splash screen y app icon (pide al usuario que suba un logo; si no hay, genera
  uno provisional con Expo Icon y el color ACCENT #1F4E79).

Rendimiento:
- Medir tiempo de arranque; optimizar imports con expo-router lazy.
- Paginación con tamaño adecuado en feed (20 posts) y mensajes (30).
- Precargar fotos visibles.

Seguridad final:
- Ejecuta `supabase inspect db --level=warn` y resuelve warnings.
- Verifica que ninguna tabla quedó sin RLS.
- Rota secretos si los hubo expuestos durante desarrollo.

Builds:
- Configura `eas.json` con perfiles: development, preview (APK + internal
  TestFlight), production.
- iOS: configura bundle id com.beproud.app, App Store Connect, TestFlight.
  Genera build con `eas build -p ios --profile preview` y sube con
  `eas submit -p ios`.
- Android: `eas build -p android --profile preview` para APK; da URL descargable.
- Web: configura Vercel con el output de `expo export --platform web`.
  Dominio `beproud.app` o subdominio `app.beproud.app`.

Analítica y flags:
- Integra PostHog con eventos clave (completion, post, like, signup).
- Flag `ai_validation_enabled` para poder pausar validación IA si Claude API cae.

Documentación final:
- Actualiza README con: cómo invitar a testers a TestFlight, dónde descargar el
  APK, link de la web.
- Runbook corto en `/docs/RUNBOOK.md`: cómo ver logs, cómo revertir un deploy,
  qué hacer si Supabase queda inalcanzable.

Al final: dame los enlaces finales (TestFlight, APK, Vercel) y un resumen de
qué puede probar cada amigo.
```

**Criterio de aceptación:** recibo un link de TestFlight para enviar a amigos con iPhone, un APK para los de Android, y una URL web funcional.

---

## Anexo · Plantilla para cualquier prompt futuro

Si más adelante pides cambios o nuevas funcionalidades, usa esta estructura:

```
Objetivo: <una frase>

Contexto:
- <lo que es relevante del estado actual>
- <quién va a usarlo y cómo>

Alcance:
1. <paso concreto>
2. <paso concreto>
...

Fuera de alcance:
- <para evitar que se lance a cosas extra>

Criterio de aceptación:
- <cómo sabré que está bien>

Formato esperado:
- Plan primero, después implementación.
- Al final: resumen + pasos de prueba.
```

Con esto Claude Code rinde de forma predecible y tú validas sin leer código.
