-- BeProud · Fase 14 — marca las tareas de comida principal con module='nutrition'
-- y añade la merienda que faltaba. El resto del catálogo nutrition (track_calories,
-- protein_target, etc.) NO se marca como module='nutrition' porque el módulo solo
-- gestiona el flujo de "registrar comida" — esas tareas siguen el flujo genérico
-- de foto.

update public.tasks_catalog
   set module = 'nutrition'
 where slug in ('healthy_breakfast', 'healthy_lunch', 'healthy_dinner');

-- Nueva tarea: merienda saludable. Mismos parámetros que las otras 3 main meals.
insert into public.tasks_catalog (
  slug, title, description, category, base_points, icon, photo_hint,
  duration_min, calories_burned, equipment_required, muscle_groups,
  difficulty, contraindications, evidence_level, references_text, subcategory,
  module
) values
('healthy_snack','Merienda saludable','Merienda equilibrada (fruta, frutos secos, yogur).','nutrition',8,'🍎','Foto de la merienda.',
 10, 0, '{}', '{none}', 1, '{}', 'moderate',
 'Njike et al. (2016), doi:10.3945/an.116.012583 — snacks saludables.', 'cooking',
 'nutrition')
on conflict (slug) do update set
  module = 'nutrition';
