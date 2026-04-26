-- BeProud · Fase 8 — tabla leagues + seed de las 5 ligas (bronce..diamante).

create table if not exists public.leagues (
  id              integer primary key,
  slug            text not null unique,
  name            text not null,
  tier            integer not null check (tier between 1 and 5),
  min_points_week integer not null,
  max_points_week integer,
  icon            text not null,
  color           text not null check (color ~ '^[0-9A-Fa-f]{6}$')
);

alter table public.leagues enable row level security;

drop policy if exists "leagues: read all" on public.leagues;
create policy "leagues: read all"
  on public.leagues for select to anon, authenticated using (true);

-- Seed idempotente.
insert into public.leagues (id, slug, name, tier, min_points_week, max_points_week, icon, color) values
  (1, 'bronce',   'Bronce',   1,   0,   99, '🥉', '8B5A2B'),
  (2, 'plata',    'Plata',    2, 100,  299, '🥈', '9CA3AF'),
  (3, 'oro',      'Oro',      3, 300,  599, '🥇', 'FBBF24'),
  (4, 'platino',  'Platino',  4, 600, 1199, '💎', '7DD3FC'),
  (5, 'diamante', 'Diamante', 5,1200, null, '💠', 'A78BFA')
on conflict (id) do update set
  slug            = excluded.slug,
  name            = excluded.name,
  tier            = excluded.tier,
  min_points_week = excluded.min_points_week,
  max_points_week = excluded.max_points_week,
  icon            = excluded.icon,
  color           = excluded.color;
