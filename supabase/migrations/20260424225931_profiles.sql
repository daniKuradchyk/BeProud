-- BeProud · Fase 1 — profiles + trigger + RLS + set_username RPC
-- Aplicada vía MCP el 2026-04-24.

create extension if not exists "pgcrypto";
create extension if not exists "citext";

create table if not exists public.profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  username        citext unique not null,
  display_name    text not null,
  avatar_url      text,
  bio             text,
  is_private      boolean not null default false,
  total_points    integer not null default 0,
  streak_current  integer not null default 0,
  streak_best     integer not null default 0,
  level           integer not null default 1,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint username_format check (username ~ '^[a-z0-9_]{3,24}$'),
  constraint display_name_length check (char_length(display_name) between 1 and 40)
);

comment on table public.profiles is 'Perfil público de cada usuario. id == auth.users.id.';
comment on column public.profiles.username is 'Identificador único, minúsculas/dígitos/guión bajo, 3-24 chars.';

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_username citext;
  v_display  text;
begin
  v_username := 'user_' || substr(replace(new.id::text, '-', ''), 1, 8);
  v_display  := coalesce(new.raw_user_meta_data->>'display_name', 'Nuevo usuario');
  insert into public.profiles (id, username, display_name)
  values (new.id, v_username, v_display)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.profile_needs_onboarding(p_id uuid)
returns boolean language sql stable as $$
  select exists (
    select 1 from public.profiles where id = p_id and username like 'user_%'
  );
$$;

alter table public.profiles enable row level security;

drop policy if exists "profiles: select public fields" on public.profiles;
drop policy if exists "profiles: insert self" on public.profiles;
drop policy if exists "profiles: update self" on public.profiles;
drop policy if exists "profiles: delete self" on public.profiles;

create policy "profiles: select public fields"
  on public.profiles for select to authenticated using (true);

create policy "profiles: insert self"
  on public.profiles for insert to authenticated with check (auth.uid() = id);

create policy "profiles: update self"
  on public.profiles for update to authenticated
  using (auth.uid() = id) with check (auth.uid() = id);

create policy "profiles: delete self"
  on public.profiles for delete to authenticated using (auth.uid() = id);

create or replace function public.set_username(new_username citext, new_display text)
returns public.profiles language plpgsql security definer set search_path = public as $$
declare result public.profiles;
begin
  if auth.uid() is null then
    raise exception 'No autenticado' using errcode = '42501';
  end if;
  if new_username is null or new_username !~ '^[a-z0-9_]{3,24}$' then
    raise exception 'Username inválido' using errcode = '22023';
  end if;
  if exists (select 1 from public.profiles where username = new_username and id <> auth.uid()) then
    raise exception 'Username ya en uso' using errcode = '23505';
  end if;
  update public.profiles
     set username = new_username,
         display_name = coalesce(nullif(new_display, ''), display_name)
   where id = auth.uid()
   returning * into result;
  return result;
end;
$$;

grant execute on function public.set_username(citext, text) to authenticated;
