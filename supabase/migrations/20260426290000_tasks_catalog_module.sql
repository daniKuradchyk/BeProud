-- BeProud · Fase 15 — añade `module` al catálogo para enrutar tipos de tarea.

alter table public.tasks_catalog
  add column if not exists module text not null default 'generic';

alter table public.tasks_catalog
  drop constraint if exists tasks_catalog_module_check;
alter table public.tasks_catalog
  add constraint tasks_catalog_module_check
  check (module in ('generic','gym','study','nutrition'));

-- Backfill conservador: solo categoría 'study' → module 'study'.
update public.tasks_catalog
   set module = 'study'
 where category = 'study'
   and module = 'generic';
