-- BeProud · Fase 2 — Catálogo público de tareas.
-- Aplicada vía MCP el 2026-04-25.

create table if not exists public.tasks_catalog (
  id            uuid primary key default gen_random_uuid(),
  slug          text unique not null,
  title         text not null,
  description   text not null,
  category      text not null,
  base_points   integer not null check (base_points between 1 and 200),
  icon          text,
  photo_hint    text not null,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  constraint slug_format check (slug ~ '^[a-z0-9_]{2,64}$'),
  constraint category_allowed check (
    category in ('fitness','study','nutrition','wellbeing','productivity','social')
  )
);

comment on table public.tasks_catalog is
  'Catálogo público de tareas disponibles para componer rutinas. Solo lectura desde el cliente.';
comment on column public.tasks_catalog.photo_hint is
  'Pista para el validador IA en Fase 9: qué se espera ver en la foto.';

create index if not exists tasks_catalog_category_idx
  on public.tasks_catalog (category)
  where is_active = true;

alter table public.tasks_catalog enable row level security;

drop policy if exists "tasks_catalog: select all" on public.tasks_catalog;
create policy "tasks_catalog: select all"
  on public.tasks_catalog for select
  to anon, authenticated
  using (is_active = true);
-- No hay policies de insert/update/delete: el catálogo se mantiene vía migraciones.
