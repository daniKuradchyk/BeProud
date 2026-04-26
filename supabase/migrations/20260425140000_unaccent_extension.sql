-- BeProud · Fase 5 — habilita la extensión unaccent en el schema "extensions"
-- (recomendación oficial de Supabase para evitar el warning del advisor sobre
-- extensiones en public). El schema y los grants son idempotentes.

create schema if not exists extensions;

-- Si ya existía en public, el create extension idempotente no la mueve;
-- pero search_profiles llama a extensions.unaccent explícitamente, así que el
-- caso real con la extensión en otro schema seguirá funcionando.
create extension if not exists unaccent with schema extensions;

grant usage on schema extensions to authenticated, anon;
