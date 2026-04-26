-- BeProud · Fase 14 — meal_logs (uno por user/comida/día) + meal_log_items
-- (alimentos dentro de la comida con macros denormalizados).

do $$
begin
  if not exists (select 1 from pg_type where typname = 'meal_type') then
    create type public.meal_type as enum ('breakfast','lunch','snack','dinner');
  end if;
end $$;

create table if not exists public.meal_logs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  meal_type   public.meal_type not null,
  log_date    date not null default current_date,
  eaten_at    timestamptz not null default now(),
  notes       text,
  created_at  timestamptz not null default now(),
  unique (user_id, meal_type, log_date)
);

create index if not exists idx_meal_logs_user_date
  on public.meal_logs (user_id, log_date desc);

alter table public.meal_logs enable row level security;
drop policy if exists "meal_logs_own" on public.meal_logs;
create policy "meal_logs_own" on public.meal_logs
  for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists public.meal_log_items (
  id              uuid primary key default gen_random_uuid(),
  meal_log_id     uuid not null references public.meal_logs(id) on delete cascade,
  user_id         uuid not null references auth.users(id) on delete cascade,
  food_item_id    uuid not null references public.food_items(id) on delete restrict,
  quantity_g      numeric not null check (quantity_g > 0 and quantity_g <= 5000),
  -- Macros denormalizados al momento del registro: si el food_item se actualiza
  -- en el futuro, las entradas históricas del user no cambian.
  kcal            numeric not null check (kcal >= 0),
  protein_g       numeric not null default 0 check (protein_g >= 0),
  carbs_g         numeric not null default 0 check (carbs_g >= 0),
  fat_g           numeric not null default 0 check (fat_g >= 0),
  created_at      timestamptz not null default now()
);

create index if not exists idx_meal_log_items_meal
  on public.meal_log_items (meal_log_id);
create index if not exists idx_meal_log_items_user_date
  on public.meal_log_items (user_id, created_at desc);
create index if not exists idx_meal_log_items_food
  on public.meal_log_items (food_item_id);

alter table public.meal_log_items enable row level security;
drop policy if exists "meal_log_items_own" on public.meal_log_items;
create policy "meal_log_items_own" on public.meal_log_items
  for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
