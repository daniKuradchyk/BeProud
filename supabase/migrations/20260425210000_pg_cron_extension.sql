-- BeProud · Fase 8 — habilita pg_cron. En Supabase, pg_cron crea su propio
-- schema "cron" con la tabla cron.job. La extensión se instala globalmente
-- (no aceptamos schema custom en Supabase managed).
create extension if not exists pg_cron;
grant usage on schema cron to postgres;
