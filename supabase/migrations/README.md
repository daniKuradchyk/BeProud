# Migraciones SQL · BeProud

Cada archivo es una migración versionada por timestamp. Se aplican en orden creciente.

## Cómo aplicar una migración (mientras no tengas el CLI conectado)

1. Entra a tu proyecto en Supabase: <https://supabase.com/dashboard/project/hupgxfrijdnphltpbcnd>.
2. Menú lateral → **SQL Editor** → **+ New query**.
3. Abre el archivo `.sql` correspondiente, copia su contenido completo y pégalo en el editor.
4. Pulsa **Run** (Ctrl/Cmd + Enter).
5. Si aparece "Success. No rows returned" la migración se aplicó.

Las migraciones de BeProud son idempotentes: se pueden volver a ejecutar sin romper datos.

## Cómo aplicarla con el CLI (cuando tengas tiempo de instalarlo)

```bash
brew install supabase/tap/supabase   # macOS
supabase login                       # te pedirá un token desde la dashboard
supabase link --project-ref hupgxfrijdnphltpbcnd
supabase db push
```

`supabase db push` aplica todas las migraciones pendientes automáticamente.

## Migraciones actuales

| Fecha | Archivo | Contenido |
|---|---|---|
| 2026-04-24 | `20260424000001_profiles.sql` | Tabla `profiles`, trigger `handle_new_user`, RLS, función `set_username`, políticas de Storage para `avatars`. |

## Bucket de avatares (paso manual una sola vez)

Las políticas de Storage se aplican solas, pero el bucket lo creas desde la UI:

1. Supabase Dashboard → **Storage** → **New bucket**.
2. Nombre: `avatars`. Public bucket: **OFF** (privado).
3. Guardar.
4. Vuelve a ejecutar la migración para que se apliquen las policies del bucket.
