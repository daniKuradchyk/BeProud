-- BeProud · Fase 15 — tareas personales del usuario.
-- Las propuestas del wizard de diseño de rutina se materializan aquí
-- cuando no se enlazan al catálogo. Mismo shape de columnas que
-- tasks_catalog para que la vista routine_tasks_resolved pueda hacer
-- coalesce columna a columna.

create table if not exists public.user_tasks (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  title         text not null check (char_length(title) between 2 and 80),
  description   text,
  category      text not null check (category in (
    'fitness','study','nutrition','wellbeing','productivity','social'
  )),
  module        text not null default 'generic'
                  check (module in ('generic','gym','study','nutrition')),
  base_points   integer not null default 5  check (base_points between 1 and 30),
  difficulty    integer not null default 1  check (difficulty between 1 and 5),
  source        text not null default 'wizard'
                  check (source in ('wizard','manual','custom')),
  icon          text,
  created_at    timestamptz not null default now()
);

create index if not exists idx_user_tasks_user on public.user_tasks(user_id);

alter table public.user_tasks enable row level security;

drop policy if exists "user_tasks_own" on public.user_tasks;
create policy "user_tasks_own" on public.user_tasks
  for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
