-- BeProud · Fase 7 — tabla groups + trigger generador de invite_code (10
-- chars hex, hasta 5 reintentos contra colisión) + trigger updated_at.

create table if not exists public.groups (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references auth.users(id) on delete restrict,
  name        text not null check (char_length(name) between 3 and 60),
  description text check (description is null or char_length(description) <= 280),
  cover_url   text,
  is_private  boolean not null default false,
  invite_code text not null unique,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists idx_groups_owner   on public.groups (owner_id);
create index if not exists idx_groups_created on public.groups (created_at desc);

-- Trigger: si invite_code es null al insertar, lo genera. Hasta 5 reintentos
-- en caso muy improbable de colisión. Tras la migración handle_new_user
-- usamos gen_random_uuid disponible vía pgcrypto.
create or replace function public.groups_set_invite_code()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_attempt int := 0;
  v_code text;
begin
  if new.invite_code is not null and new.invite_code <> '' then
    return new;
  end if;
  loop
    v_code := substr(replace(gen_random_uuid()::text, '-', ''), 1, 10);
    if not exists (
      select 1 from public.groups where invite_code = v_code
    ) then
      new.invite_code := v_code;
      return new;
    end if;
    v_attempt := v_attempt + 1;
    if v_attempt >= 5 then
      raise exception 'No se pudo generar invite_code único.' using errcode = 'XX000';
    end if;
  end loop;
end;
$$;

drop trigger if exists groups_set_invite_code_ins on public.groups;
create trigger groups_set_invite_code_ins
  before insert on public.groups
  for each row execute function public.groups_set_invite_code();

drop trigger if exists groups_set_updated_at on public.groups;
create trigger groups_set_updated_at
  before update on public.groups
  for each row execute function public.set_updated_at();

-- ── RLS ───────────────────────────────────────────────────────────────────
alter table public.groups enable row level security;

drop policy if exists "groups: select visible" on public.groups;
drop policy if exists "groups: insert own"     on public.groups;
drop policy if exists "groups: update owner"   on public.groups;
drop policy if exists "groups: delete owner"   on public.groups;

create policy "groups: select visible"
  on public.groups for select to authenticated
  using (
    is_private = false
    or public.is_group_member(groups.id)
  );

create policy "groups: insert own"
  on public.groups for insert to authenticated
  with check (auth.uid() = owner_id);

create policy "groups: update owner"
  on public.groups for update to authenticated
  using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

create policy "groups: delete owner"
  on public.groups for delete to authenticated
  using (auth.uid() = owner_id);
