begin;

create or replace function public.get_accessible_leads(target_slug text default null)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', l.id,
        'nome', l.nome,
        'whatsapp', l.whatsapp,
        'candidato_slug', l.candidato_slug,
        'created_at', l.created_at,
        'candidatos', jsonb_build_object(
          'nome_urna', c.nome_urna,
          'url_foto_perfil', c.url_foto_perfil
        )
      )
      order by l.created_at desc
    ),
    '[]'::jsonb
  )
  from public.leads l
  left join public.candidatos c on c.slug = l.candidato_slug
  where
    (
      public.is_admin((select auth.uid()))
      and (target_slug is null or l.candidato_slug = target_slug)
    )
    or
    (
      exists (
        select 1
        from public.candidato_admins ca
        join public.candidatos managed on managed.id = ca.candidato_id
        where ca.user_id = (select auth.uid())
          and managed.slug = l.candidato_slug
      )
      and (target_slug is null or l.candidato_slug = target_slug)
    );
$$;

revoke all on function public.get_accessible_leads(text)
from public, anon;
grant execute on function public.get_accessible_leads(text)
to authenticated, service_role;

commit;

notify pgrst, 'reload schema';
