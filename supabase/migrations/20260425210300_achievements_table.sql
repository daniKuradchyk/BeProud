-- BeProud · Fase 8 — achievements: catálogo de 20 logros + seed.

create table if not exists public.achievements (
  id          integer primary key,
  slug        text not null unique,
  title       text not null,
  description text not null,
  icon        text not null,
  category    text not null check (category in ('completion','streak','social','points','group')),
  tier        integer not null check (tier between 1 and 3)
);

alter table public.achievements enable row level security;

drop policy if exists "achievements: read all" on public.achievements;
create policy "achievements: read all"
  on public.achievements for select to anon, authenticated using (true);

insert into public.achievements (id, slug, title, description, icon, category, tier) values
  -- Completion (5)
  ( 1, 'first_completion',       'Primera tarea',  'Has completado tu primera tarea',         '🌱', 'completion', 1),
  ( 2, 'ten_completions',        '10 tareas',      'Has completado 10 tareas',                 '🌿', 'completion', 1),
  ( 3, 'fifty_completions',      '50 tareas',      'Has completado 50 tareas',                 '🌳', 'completion', 2),
  ( 4, 'hundred_completions',    '100 tareas',     'Has completado 100 tareas',                '🏆', 'completion', 3),
  ( 5, 'five_in_a_day',          'Día completo',   'Completaste 5 tareas en un día',           '🚀', 'completion', 2),
  -- Streak (4)
  ( 6, 'streak_3',               'Racha de 3',     '3 días consecutivos',                      '🔥', 'streak', 1),
  ( 7, 'streak_7',               'Una semana',     '7 días consecutivos',                      '🔥🔥', 'streak', 2),
  ( 8, 'streak_30',              'Un mes',         '30 días consecutivos',                     '🔥🔥🔥', 'streak', 3),
  ( 9, 'streak_back',            'Volver',         'Vuelves tras romper racha',                '💪', 'streak', 1),
  -- Social (5)
  (10, 'first_post',             'Primer post',    'Tu primera tarea pública',                 '📸', 'social', 1),
  (11, 'first_like',             'Primer like',    'Te dieron tu primer like',                 '❤️', 'social', 1),
  (12, 'ten_followers',          'Popular',        '10 seguidores',                            '🌟', 'social', 2),
  (13, 'first_comment_received', 'Conversación',   'Recibiste tu primer comentario',           '💬', 'social', 1),
  (14, 'helpful',                'Servicial',      'Diste 50 likes a otros',                   '🤝', 'social', 2),
  -- Points (3)
  (15, 'hundred_points',         '100 puntos',     'Total de 100 puntos',                      '⭐', 'points', 1),
  (16, 'thousand_points',        '1000 puntos',    'Total de 1000 puntos',                     '🌟', 'points', 2),
  (17, 'ten_thousand_points',    '10000 puntos',   'Total de 10000 puntos',                    '💫', 'points', 3),
  -- Group (3)
  (18, 'first_group',            'Primer grupo',   'Te uniste a tu primer grupo',              '👥', 'group', 1),
  (19, 'group_owner',            'Líder',          'Creaste tu primer grupo',                  '👑', 'group', 2),
  (20, 'group_top_week',         'Top semanal',    '1º en ranking de un grupo en una semana',  '🏅', 'group', 3)
on conflict (id) do update set
  slug        = excluded.slug,
  title       = excluded.title,
  description = excluded.description,
  icon        = excluded.icon,
  category    = excluded.category,
  tier        = excluded.tier;
