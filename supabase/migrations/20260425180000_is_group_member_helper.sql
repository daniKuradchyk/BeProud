-- BeProud · Fase 7 — helper SECURITY DEFINER para evitar recursión RLS al
-- consultar group_members desde sus propias policies (mismo patrón que
-- is_thread_member en Fase 6).

create or replace function public.is_group_member(p_group_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
      from public.group_members
     where group_id = p_group_id
       and user_id = auth.uid()
  );
$$;

grant execute on function public.is_group_member(uuid) to authenticated;
