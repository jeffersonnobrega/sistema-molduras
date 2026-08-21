do $sec008$
begin
  execute $function$
    create or replace function public.is_admin_aal2()
    returns boolean
    language sql
    stable
    security definer
    set search_path = ''
    as $body$
      select
        (select auth.uid()) is not null
        and coalesce((select auth.jwt() ->> 'aal') = 'aal2', false)
        and exists (
          select 1
          from public.admins a
          where a.user_id = (select auth.uid())
        );
    $body$
  $function$;

  execute 'revoke all on function public.is_admin_aal2() from public, anon, authenticated';
  execute 'grant execute on function public.is_admin_aal2() to authenticated, service_role';

  execute $function$
    create or replace function public.can_manage_candidato(target_candidato_id uuid)
    returns boolean
    language sql
    stable
    security definer
    set search_path = ''
    as $body$
      select
        public.is_admin_aal2()
        or (
          not public.is_admin((select auth.uid()))
          and exists (
            select 1
            from public.candidato_admins ca
            where ca.user_id = (select auth.uid())
              and ca.candidato_id = target_candidato_id
          )
        );
    $body$
  $function$;

  if to_regprocedure('public.can_manage_candidato_slug(text)') is not null then
    execute $function$
      create or replace function public.can_manage_candidato_slug(target_slug text)
      returns boolean
      language sql
      stable
      security definer
      set search_path = ''
      as $body$
        select
          public.is_admin_aal2()
          or (
            not public.is_admin((select auth.uid()))
            and exists (
              select 1
              from public.candidatos c
              join public.candidato_admins ca on ca.candidato_id = c.id
              where c.slug = target_slug
                and ca.user_id = (select auth.uid())
            )
          );
      $body$
    $function$;
  end if;

  execute $function$
    create or replace function public.get_accessible_leads(target_slug text default null)
    returns jsonb
    language sql
    stable
    security definer
    set search_path = ''
    as $body$
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
          public.is_admin_aal2()
          and (target_slug is null or l.candidato_slug = target_slug)
        )
        or
        (
          not public.is_admin((select auth.uid()))
          and exists (
            select 1
            from public.candidato_admins ca
            join public.candidatos managed on managed.id = ca.candidato_id
            where ca.user_id = (select auth.uid())
              and managed.slug = l.candidato_slug
          )
          and (target_slug is null or l.candidato_slug = target_slug)
        );
    $body$
  $function$;

  execute $function$
    create or replace function public.protect_candidato_system_fields()
    returns trigger
    language plpgsql
    security invoker
    set search_path = ''
    as $body$
    begin
      if current_user = 'postgres' or public.is_admin_aal2() then
        return new;
      end if;

      if (
        to_jsonb(new) - array[
          'nome_urna',
          'partido',
          'numero_partido',
          'numero_candidato',
          'cargo_id',
          'cargo_travado_id',
          'cor_primaria',
          'cor_fundo',
          'cor_titulo',
          'cor_texto',
          'cor_texto_hero',
          'cor_botao',
          'url_foto_perfil',
          'url_moldura',
          'url_moldura_feed',
          'molduras',
          'config_colinha'
        ]::text[]
      ) is distinct from (
        to_jsonb(old) - array[
          'nome_urna',
          'partido',
          'numero_partido',
          'numero_candidato',
          'cargo_id',
          'cargo_travado_id',
          'cor_primaria',
          'cor_fundo',
          'cor_titulo',
          'cor_texto',
          'cor_texto_hero',
          'cor_botao',
          'url_foto_perfil',
          'url_moldura',
          'url_moldura_feed',
          'molduras',
          'config_colinha'
        ]::text[]
      ) then
        raise exception using
          errcode = '42501',
          message = 'Gestor não pode alterar campos sistêmicos do candidato.';
      end if;

      return new;
    end;
    $body$
  $function$;

  execute 'revoke execute on function public.protect_candidato_system_fields() from public, anon, authenticated, service_role';

  execute 'drop policy if exists "Superadmin visualiza administradores" on public.admins';
  execute $policy$
    create policy "Superadmin visualiza administradores"
    on public.admins for select to authenticated
    using (public.is_admin_aal2())
  $policy$;

  execute 'drop policy if exists "Superadmin gerencia vinculos" on public.candidato_admins';
  execute $policy$
    create policy "Superadmin gerencia vinculos"
    on public.candidato_admins for all to authenticated
    using (public.is_admin_aal2())
    with check (public.is_admin_aal2())
  $policy$;

  execute 'drop policy if exists "Superadmin cadastra candidatos" on public.candidatos';
  execute $policy$
    create policy "Superadmin cadastra candidatos"
    on public.candidatos for insert to authenticated
    with check (public.is_admin_aal2())
  $policy$;

  execute 'drop policy if exists "Superadmin exclui candidatos" on public.candidatos';
  execute $policy$
    create policy "Superadmin exclui candidatos"
    on public.candidatos for delete to authenticated
    using (public.is_admin_aal2())
  $policy$;

  execute 'drop policy if exists "Superadmin visualiza colinhas salvas" on public.colinhas_salvas';
  execute $policy$
    create policy "Superadmin visualiza colinhas salvas"
    on public.colinhas_salvas for select to authenticated
    using (public.is_admin_aal2())
  $policy$;

  perform pg_notify('pgrst', 'reload schema');
end;
$sec008$;
