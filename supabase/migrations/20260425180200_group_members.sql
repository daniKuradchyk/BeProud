-- BeProud · Fase 7 — group_members + RLS + trigger que aplica las reglas
-- finas de roles que la policy update por sí sola no puede expresar.

create table if not exists public.group_members (
  group_id  uuid not null references public.groups(id) on delete cascade,
  user_id   uuid not null references auth.users(id) on delete cascade,
  role      text not null default 'member'
              check (role in ('owner','admin','member')),
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

-- FK redundante a profiles para los embeds desde PostgREST.
alter table public.group_members
  drop constraint if exists group_members_user_id_profiles_fkey;
alter table public.group_members
  add constraint group_members_user_id_profiles_fkey
  foreign key (user_id) references public.profiles(id) on delete cascade;

create index if not exists idx_group_members_user
  on public.group_members (user_id);
create index if not exists idx_group_members_group_role
  on public.group_members (group_id, role);

alter table public.group_members enable row level security;

drop policy if exists "group_members: select visible" on public.group_members;
drop policy if exists "group_members: update mods"   on public.group_members;
drop policy if exists "group_members: delete self_or_mods" on public.group_members;

-- Veo miembros si soy miembro o si el grupo es público.
create policy "group_members: select visible"
  on public.group_members for select to authenticated
  using (
    public.is_group_member(group_id)
    or exists (
      select 1 from public.groups g
      where g.id = group_id and g.is_private = false
    )
  );

-- Update solo por owner/admin del grupo. El trigger aplica las reglas finas.
create policy "group_members: update mods"
  on public.group_members for update to authenticated
  using (
    exists (
      select 1 from public.group_members me
      where me.group_id = group_members.group_id
        and me.user_id  = auth.uid()
        and me.role in ('owner','admin')
    )
  )
  with check (
    exists (
      select 1 from public.group_members me
      where me.group_id = group_members.group_id
        and me.user_id  = auth.uid()
        and me.role in ('owner','admin')
    )
  );

-- Delete: el propio user (leave) o owner/admin (kick). Reglas finas vía trigger.
create policy "group_members: delete self_or_mods"
  on public.group_members for delete to authenticated
  using (
    auth.uid() = user_id
    or exists (
      select 1 from public.group_members me
      where me.group_id = group_members.group_id
        and me.user_id  = auth.uid()
        and me.role in ('owner','admin')
    )
  );

-- Trigger BEFORE UPDATE: admin no puede tocar owner ni convertirse en owner.
create or replace function public.group_members_check_update()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_caller_role text;
begin
  if old.user_id <> new.user_id or old.group_id <> new.group_id then
    raise exception 'No se permite cambiar group_id ni user_id.' using errcode = '22023';
  end if;

  select role into v_caller_role
    from public.group_members
   where group_id = new.group_id and user_id = auth.uid();

  if v_caller_role is null then
    raise exception 'No tienes permiso.' using errcode = '42501';
  end if;

  -- Solo el owner puede mover roles a/desde 'owner'.
  if (old.role = 'owner' or new.role = 'owner') and v_caller_role <> 'owner' then
    raise exception 'Solo el owner puede transferir la propiedad.'
      using errcode = '42501';
  end if;

  -- Admin no puede tocar al owner.
  if old.role = 'owner' and v_caller_role <> 'owner' then
    raise exception 'No puedes modificar al owner.' using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists group_members_check_update_upd on public.group_members;
create trigger group_members_check_update_upd
  before update on public.group_members
  for each row execute function public.group_members_check_update();

-- Trigger BEFORE DELETE: admin no puede expulsar al owner.
create or replace function public.group_members_check_delete()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_caller_role text;
begin
  -- Self-delete (leave) siempre permitido excepto si es el owner (para no
  -- dejar el grupo huérfano). El owner debe transferir antes o eliminar el
  -- grupo entero.
  if old.user_id = auth.uid() then
    if old.role = 'owner' then
      raise exception 'El owner no puede salir; transfiere la propiedad o elimina el grupo.'
        using errcode = '42501';
    end if;
    return old;
  end if;

  -- Kick por otro miembro.
  select role into v_caller_role
    from public.group_members
   where group_id = old.group_id and user_id = auth.uid();
  if v_caller_role is null then
    raise exception 'No tienes permiso.' using errcode = '42501';
  end if;
  if old.role = 'owner' then
    raise exception 'No puedes expulsar al owner.' using errcode = '42501';
  end if;
  if v_caller_role = 'admin' and old.role = 'admin' then
    raise exception 'Un admin no puede expulsar a otro admin.' using errcode = '42501';
  end if;

  return old;
end;
$$;

drop trigger if exists group_members_check_delete_del on public.group_members;
create trigger group_members_check_delete_del
  before delete on public.group_members
  for each row execute function public.group_members_check_delete();
