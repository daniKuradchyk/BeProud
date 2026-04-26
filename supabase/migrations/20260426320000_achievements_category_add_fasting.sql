-- BeProud · Fase 16 — añade categoría 'fasting' al catálogo de achievements.
-- El CHECK constraint actual solo permite 5 categorías; lo expandimos para
-- aceptar los logros del módulo de ayuno (Fase 16).

alter table public.achievements
  drop constraint if exists achievements_category_check;

alter table public.achievements
  add constraint achievements_category_check
  check (category in ('completion','streak','social','points','group','fasting'));
