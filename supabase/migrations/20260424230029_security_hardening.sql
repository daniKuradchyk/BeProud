-- BeProud · Fase 1 — Hardening tras advisors de Supabase linter.
-- Aplicada vía MCP el 2026-04-24.

-- 1) Fijar search_path en funciones que no lo tenían.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin new.updated_at = now(); return new; end;
$$;

create or replace function public.profile_needs_onboarding(p_id uuid)
returns boolean
language sql
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles where id = p_id and username like 'user_%'
  );
$$;

-- 2) Bucket `avatars` es público: las URLs de objeto ya funcionan sin policy de SELECT.
--    Quitamos las SELECT policies amplias para no permitir "list all objects".
drop policy if exists "avatars: read all authenticated" on storage.objects;
drop policy if exists "avatars: read all anon" on storage.objects;
