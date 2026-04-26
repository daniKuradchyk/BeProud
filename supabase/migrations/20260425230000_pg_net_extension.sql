-- BeProud · Fase 10 — habilita pg_net (HTTP async desde Postgres).
-- Lo usa dispatch_push para invocar la Edge Function send-push.
create extension if not exists pg_net;
grant usage on schema net to postgres;
