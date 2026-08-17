begin;

create or replace function public.can_manage_candidato_slug(target_slug text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    public.is_admin((select auth.uid()))
    or exists (
      select 1
      from public.candidatos c
      join public.candidato_admins ca on ca.candidato_id = c.id
      where c.slug = target_slug
        and ca.user_id = (select auth.uid())
    );
$$;

revoke all on function public.can_manage_candidato_slug(text)
from public, anon;
grant execute on function public.can_manage_candidato_slug(text)
to authenticated, service_role;

grant select on table public.leads to authenticated;

drop policy if exists "Gestores visualizam leads vinculados"
on public.leads;

create policy "Gestores visualizam leads vinculados"
on public.leads
for select
to authenticated
using (public.can_manage_candidato_slug(candidato_slug));

commit;

notify pgrst, 'reload schema';
