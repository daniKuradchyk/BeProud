-- BeProud · Fase 13 — catálogo de ejercicios de gym (paralelo a tasks_catalog).

create table if not exists public.exercises (
  id                       uuid primary key default gen_random_uuid(),
  slug                     text not null unique check (slug ~ '^[a-z0-9_]{2,80}$'),
  name                     text not null,
  description              text,
  instructions             text not null,
  common_mistakes          text[] not null default '{}',
  muscle_groups_primary    text[] not null default '{}',
  muscle_groups_secondary  text[] not null default '{}',
  equipment                text[] not null default '{}',
  mechanic                 text not null check (mechanic in ('compound','isolation')),
  force                    text check (force is null or force in ('push','pull','static','none')),
  difficulty               integer not null check (difficulty between 1 and 5),
  gif_url                  text,
  image_url                text,
  contraindications        text[] not null default '{}',
  evidence_level           text check (evidence_level is null or evidence_level in ('strong','moderate','weak','consensus')),
  references_text          text,
  created_at               timestamptz not null default now()
);

create index if not exists exercises_primary_idx   on public.exercises using gin (muscle_groups_primary);
create index if not exists exercises_secondary_idx on public.exercises using gin (muscle_groups_secondary);
create index if not exists exercises_equipment_idx on public.exercises using gin (equipment);
create index if not exists exercises_mechanic_idx  on public.exercises (mechanic);

alter table public.exercises enable row level security;

drop policy if exists "exercises: read all" on public.exercises;
create policy "exercises: read all"
  on public.exercises for select to anon, authenticated using (true);
-- Sin INSERT/UPDATE/DELETE policies → solo service_role.
