-- BeProud · Fase 11B — añade metadata científica al catálogo de tareas.

alter table public.tasks_catalog
  add column if not exists duration_min        integer
    check (duration_min is null or duration_min between 1 and 720),
  add column if not exists calories_burned     integer
    check (calories_burned is null or calories_burned between 0 and 1500),
  add column if not exists equipment_required  text[] not null default '{}',
  add column if not exists muscle_groups       text[] not null default '{}',
  add column if not exists difficulty          integer
    check (difficulty is null or difficulty between 1 and 5),
  add column if not exists contraindications   text[] not null default '{}',
  add column if not exists evidence_level      text
    check (evidence_level is null or evidence_level in ('strong','moderate','weak','consensus')),
  add column if not exists references_text     text,
  add column if not exists subcategory         text;

-- Si la migración inicial creó duration_min con [1,240], la relajamos a [1,720]
-- para acomodar tareas de sueño y rutas largas.
alter table public.tasks_catalog
  drop constraint if exists tasks_catalog_duration_min_check;
alter table public.tasks_catalog
  add constraint tasks_catalog_duration_min_check
  check (duration_min is null or duration_min between 1 and 720);

alter table public.tasks_catalog
  drop constraint if exists tasks_catalog_subcategory_chk;
alter table public.tasks_catalog
  add constraint tasks_catalog_subcategory_chk
  check (subcategory is null or subcategory in (
    'cardio_liss','cardio_hiit','strength_compound','strength_isolation',
    'mobility','flexibility','reading','language','course','deep_focus',
    'meditation','sleep','cooking','hydration','social_outdoor',
    'social_indoor','none'));

create index if not exists tasks_catalog_equipment_idx
  on public.tasks_catalog using gin (equipment_required);
create index if not exists tasks_catalog_muscles_idx
  on public.tasks_catalog using gin (muscle_groups);
create index if not exists tasks_catalog_subcategory_idx
  on public.tasks_catalog (subcategory);
