# SMOKE_TEST · BeProud beta

Lista de comprobación antes de mandar una build preview a amigos. Hazla **completa** en un dispositivo iOS y otro Android. **Cualquier fallo bloquea el envío.** Un bug es bug, no "ya lo arreglo cuando suba".

> Versión actual: ver `apps/mobile/app.config.ts` → `version`.

## Cuenta y onboarding

- [ ] Instalar la build preview en el dispositivo (TestFlight para iOS, APK para Android).
- [ ] Abrir la app por primera vez: aparece la pantalla de bienvenida.
- [ ] Registrar usuario nuevo desde 0 con un email no usado antes.
- [ ] Recibir email de confirmación de Supabase y confirmar.
- [ ] Completar onboarding entero (los 9 pasos, incluyendo biometría: peso, altura, fecha de nacimiento, sexo, días/semana, objetivo).

## Rutina

- [ ] Tras onboarding se genera la rutina y aparece la pantalla Rutina con bloques temporales y la Now Card.
- [ ] El carrusel "Hoy" muestra al menos las cards de los módulos Gym, Estudio y Nutrición.
- [ ] Completar 1 tarea genérica con foto desde la cámara real → suma puntos y aparece tickada.

## Estudio

- [ ] Iniciar 1 sesión Pomodoro de prueba (25/5; baja focus a 1 minuto para acelerar el test).
- [ ] Al completar el ciclo se cierra la sesión y se crea la `task_completion` correspondiente si la rutina la incluye.

## Nutrición (Fase 14)

- [ ] Abrir `/nutrition`: si tienes biometría completa, los anillos de macros aparecen calculados.
- [ ] Buscar un alimento por texto (ej. "yogur") → mezcla de resultados locales y Open Food Facts.
- [ ] Escanear un código de barras de un producto envasado → detecta el producto y permite añadirlo.
- [ ] Crear un alimento personalizado y añadirlo a una comida.
- [ ] Si tienes "Desayuno saludable" en la rutina, al añadir el primer item al breakfast la fila queda tickada al volver.

## Social

- [ ] Abrir feed → dar like a un post (al menos uno propio o de cuenta de prueba).
- [ ] Crear o unirse a un grupo de prueba → enviar un mensaje en su chat.

## Notificaciones

- [ ] Activar push notifications cuando la app las pide.
- [ ] Disparar una notificación de prueba desde Supabase / consola y verificar que llega al dispositivo.

## Persistencia

- [ ] Cerrar la app por completo y reabrirla → la sesión persiste, no pide login otra vez.

## Settings y legales

- [ ] En **Ajustes** aparecen y abren correctamente los enlaces a **Política de privacidad** y **Términos de uso**.
- [ ] El texto se renderiza completo, sin errores ni placeholders.

## Borrado de cuenta

- [ ] Desde **Settings → Cuenta** intentar borrar la cuenta → confirmar que el flujo termina sin error y la sesión se cierra.

## Sentry / observabilidad (si está configurado)

- [ ] Tras una sesión completa de smoke test, en Sentry no aparecen errores nuevos ni warnings críticos.

---

## Si algo falla

1. Captura el bug (screenshot / vídeo / pasos exactos).
2. Anota la versión (`version` + `buildNumber` o `versionCode`).
3. **No envíes** la build a amigos hasta arreglarlo o decidir explícitamente que es aceptable.
