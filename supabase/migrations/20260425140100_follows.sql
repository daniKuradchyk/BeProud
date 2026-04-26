-- BeProud · Fase 5 — tabla follows + RLS + trigger de status según privacidad.
-- El cliente NO decide el status: el trigger lo determina a partir de
-- profiles.is_private del target. Adicionalmente bloquea inserts si hay
-- block bidireccional, y bloquea transiciones de status no permitidas.

create table if not exists public.follows (
  follower_id uuid not null references auth.users(id) on delete cascade,
  followed_id uuid not null references auth.users(id) on delete cascade,
  status      text not null default 'pending'
                check (status in ('pending','accepted')),
  created_at  timestamptz not null default now(),
  accepted_at timestamptz,
  primary key (follower_id, followed_id),
  check (follower_id <> followed_id)
);

comment on table public.follows is
  'Relación follower→followed con aprobación opcional. Trigger setea status según is_private del target.';

create index if not exists idx_follows_followed_status
  on public.follows (followed_id, status);
create index if not exists idx_follows_follower_status
  on public.follows (follower_id, status);

-- ── RLS ───────────────────────────────────────────────────────────────────
alter table public.follows enable row level security;

drop policy if exists "follows: select"        on public.follows;
drop policy if exists "follows: insert own"    on public.follows;
drop policy if exists "follows: update target" on public.follows;
drop policy if exists "follows: delete own"    on public.follows;

-- Cualquier authenticated puede ver follows accepted (para contadores y
-- listas de seguidores/siguiendo). Los pending solo el follower o el followed.
create policy "follows: select"
  on public.follows for select to authenticated
  using (
    status = 'accepted'
    or auth.uid() in (follower_id, followed_id)
  );

create policy "follows: insert own"
  on public.follows for insert to authenticated
  with check (
    auth.uid() = follower_id and follower_id <> followed_id
  );

-- Solo el target (followed) puede mutar la fila (aceptar la solicitud).
-- La regla "solo pending → accepted" se refuerza con el trigger de abajo.
create policy "follows: update target"
  on public.follows for update to authenticated
  using (auth.uid() = followed_id)
  with check (auth.uid() = followed_id);

-- Tanto follower (unfollow) como followed ("quitar seguidor") pueden borrar.
create policy "follows: delete own"
  on public.follows for delete to authenticated
  using (auth.uid() in (follower_id, followed_id));

-- ── Trigger: setea status al insertar y bloquea blocks ─────────────────────
create or replace function public.follows_set_status()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_is_private boolean;
begin
  if exists (
    select 1 from public.blocks b
    where (b.blocker_id = new.follower_id and b.blocked_id = new.followed_id)
       or (b.blocker_id = new.followed_id and b.blocked_id = new.follower_id)
  ) then
    raise exception 'No puedes seguir a este usuario.' using errcode = '42501';
  end if;

  select is_private into v_is_private
    from public.profiles
   where id = new.followed_id;

  if v_is_private is null then
    raise exception 'El usuario no existe.' using errcode = 'P0002';
  end if;

  if v_is_private then
    new.status := 'pending';
    new.accepted_at := null;
  else
    new.status := 'accepted';
    new.accepted_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists follows_set_status_ins on public.follows;
create trigger follows_set_status_ins
  before insert on public.follows
  for each row execute function public.follows_set_status();

-- ── Trigger: solo permite pending → accepted (no auto-revertir aceptaciones) ─
create or replace function public.follows_check_update()
returns trigger language plpgsql as $$
begin
  -- Solo se permite la transición pending → accepted.
  if old.status = 'accepted' and new.status = 'pending' then
    raise exception 'No se puede revertir una aceptación.' using errcode = '42501';
  end if;
  -- Si pasa a accepted, sellamos accepted_at.
  if new.status = 'accepted' and old.status = 'pending' then
    new.accepted_at := coalesce(new.accepted_at, now());
  end if;
  return new;
end;
$$;

drop trigger if exists follows_check_update_upd on public.follows;
create trigger follows_check_update_upd
  before update on public.follows
  for each row execute function public.follows_check_update();
