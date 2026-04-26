-- BeProud · Fase 14 — objetivos diarios de nutrición. Una fila por user.
-- 'auto' lo escribe la RPC compute_nutrition_targets desde la biometría.
-- 'manual' lo escribe el user al editar; la RPC no pisa salvo force.

create table if not exists public.nutrition_targets (
  user_id            uuid primary key references auth.users(id) on delete cascade,
  daily_kcal         numeric not null check (daily_kcal >= 800 and daily_kcal <= 6000),
  daily_protein_g    numeric not null check (daily_protein_g >= 20 and daily_protein_g <= 500),
  daily_carbs_g      numeric not null check (daily_carbs_g >= 20 and daily_carbs_g <= 1000),
  daily_fat_g        numeric not null check (daily_fat_g >= 10 and daily_fat_g <= 300),
  source             text not null default 'auto' check (source in ('auto','manual')),
  computed_at        timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

drop trigger if exists nutrition_targets_set_updated_at on public.nutrition_targets;
create trigger nutrition_targets_set_updated_at
  before update on public.nutrition_targets
  for each row execute function public.set_updated_at();

alter table public.nutrition_targets enable row level security;

drop policy if exists "nutrition_targets_own" on public.nutrition_targets;
create policy "nutrition_targets_own" on public.nutrition_targets
  for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
