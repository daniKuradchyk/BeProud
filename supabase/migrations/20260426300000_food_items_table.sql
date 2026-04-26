-- BeProud · Fase 14 — caché compartida de alimentos.
-- source='openfoodfacts': lectura libre para auth, escritura libre para auth
-- (cualquier user puede sembrar el caché tras un lookup OFF).
-- source='user': solo el dueño lee/escribe sus alimentos personalizados.

create extension if not exists pg_trgm;

create table if not exists public.food_items (
  id                  uuid primary key default gen_random_uuid(),
  source              text not null check (source in ('openfoodfacts','user')),
  external_id         text,
  name                text not null check (char_length(name) between 1 and 200),
  brand               text,
  image_url           text,
  serving_size_g      numeric,
  kcal_per_100g       numeric not null check (kcal_per_100g >= 0 and kcal_per_100g <= 1000),
  protein_per_100g    numeric not null default 0 check (protein_per_100g >= 0 and protein_per_100g <= 100),
  carbs_per_100g      numeric not null default 0 check (carbs_per_100g >= 0 and carbs_per_100g <= 100),
  fat_per_100g        numeric not null default 0 check (fat_per_100g >= 0 and fat_per_100g <= 100),
  sugars_per_100g     numeric,
  fiber_per_100g      numeric,
  created_by          uuid references auth.users(id) on delete set null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (source, external_id)
);

create index if not exists idx_food_items_name_trgm
  on public.food_items using gin (name gin_trgm_ops);
create index if not exists idx_food_items_external_id
  on public.food_items (external_id);
create index if not exists idx_food_items_created_by
  on public.food_items (created_by) where source = 'user';

drop trigger if exists food_items_set_updated_at on public.food_items;
create trigger food_items_set_updated_at
  before update on public.food_items
  for each row execute function public.set_updated_at();

alter table public.food_items enable row level security;

drop policy if exists "food_items_select"        on public.food_items;
drop policy if exists "food_items_insert_off"    on public.food_items;
drop policy if exists "food_items_insert_user"   on public.food_items;
drop policy if exists "food_items_update_off"    on public.food_items;
drop policy if exists "food_items_update_user"   on public.food_items;
drop policy if exists "food_items_delete_user"   on public.food_items;

create policy "food_items_select" on public.food_items
  for select to authenticated
  using (source = 'openfoodfacts' or created_by = auth.uid());

create policy "food_items_insert_off" on public.food_items
  for insert to authenticated
  with check (source = 'openfoodfacts');

create policy "food_items_insert_user" on public.food_items
  for insert to authenticated
  with check (source = 'user' and created_by = auth.uid());

create policy "food_items_update_off" on public.food_items
  for update to authenticated
  using (source = 'openfoodfacts')
  with check (source = 'openfoodfacts');

create policy "food_items_update_user" on public.food_items
  for update to authenticated
  using (source = 'user' and created_by = auth.uid())
  with check (source = 'user' and created_by = auth.uid());

create policy "food_items_delete_user" on public.food_items
  for delete to authenticated
  using (source = 'user' and created_by = auth.uid());
