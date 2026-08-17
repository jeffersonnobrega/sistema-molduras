begin;

drop policy if exists "Gestores visualizam leads vinculados"
on public.leads;

create policy "Gestores visualizam leads vinculados"
on public.leads
for select
to authenticated
using (
  exists (
    select 1
    from public.candidatos c
    where c.slug = candidato_slug
      and public.can_manage_candidato(c.id)
  )
);

commit;

notify pgrst, 'reload schema';
