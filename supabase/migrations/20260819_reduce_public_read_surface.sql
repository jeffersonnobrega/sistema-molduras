do $sec007$
begin
  execute $function$
    create or replace function public.is_active_candidato_slug(target_slug text)
    returns boolean language sql stable security definer set search_path = ''
    as $body$
      select exists (
        select 1 from public.candidatos c
        where c.slug = target_slug and c.ativo is true
      );
    $body$
  $function$;

  execute $function$
    create or replace function public.get_public_campaign(target_slug text)
    returns jsonb language sql stable security definer set search_path = ''
    as $body$
      select jsonb_build_object(
        'candidato', jsonb_build_object(
          'id', c.id, 'slug', c.slug, 'nome_urna', c.nome_urna,
          'partido', c.partido, 'numero_candidato', c.numero_candidato,
          'url_foto_perfil', c.url_foto_perfil, 'cargo_id', c.cargo_id,
          'cor_primaria', c.cor_primaria, 'cor_fundo', c.cor_fundo,
          'cor_titulo', c.cor_titulo, 'cor_texto', c.cor_texto,
          'cor_texto_hero', c.cor_texto_hero, 'cor_botao', c.cor_botao,
          'url_moldura', c.url_moldura,
          'url_moldura_feed', c.url_moldura_feed,
          'molduras', coalesce(c.molduras, '[]'::jsonb),
          'config_colinha', jsonb_build_object(
            'tipo_regional', c.config_colinha -> 'tipo_regional'
          ),
          'total_views', coalesce(c.total_views, 0),
          'total_shares', coalesce(c.total_shares, 0),
          'stats_leads_count', coalesce(c.stats_leads_count, 0)
        ),
        'cargos', coalesce((
          select jsonb_agg(jsonb_build_object(
            'id', cp.id, 'nome', cp.nome, 'digitos', cp.digitos,
            'ordem_votacao', cp.ordem_votacao
          ) order by cp.ordem_votacao)
          from public.cargos_politicos cp
        ), '[]'::jsonb),
        'travados', coalesce((
          select jsonb_agg(jsonb_build_object(
            'cargo_nome', ct.cargo_nome, 'nome_urna', ct.nome_urna,
            'partido', ct.partido, 'numero', ct.numero,
            'url_foto', ct.url_foto
          ) order by ct.cargo_nome)
          from public.colinha_config cc
          join public.colinha_travados ct on ct.colinha_config_id = cc.id
          where cc.candidato_id = c.id
        ), '[]'::jsonb),
        'presidente', (
          select jsonb_build_object(
            'nome', p.nome, 'numero', p.numero, 'url_foto', p.url_foto
          )
          from public.colinha_config cc
          join public.presidenciados p on p.id = cc.presidente_id
          where cc.candidato_id = c.id limit 1
        )
      )
      from public.candidatos c
      where c.slug = target_slug and c.ativo is true
      limit 1;
    $body$
  $function$;

  execute $function$
    create or replace function public.get_public_candidate_stats(target_slug text)
    returns jsonb language sql stable security definer set search_path = ''
    as $body$
      select jsonb_build_object(
        'total_views', coalesce(c.total_views, 0),
        'stats_leads_count', coalesce(c.stats_leads_count, 0),
        'total_shares', coalesce(c.total_shares, 0)
      )
      from public.candidatos c
      where c.slug = target_slug and c.ativo is true limit 1;
    $body$
  $function$;

  execute 'revoke all on function public.is_active_candidato_slug(text) from public, anon, authenticated';
  execute 'revoke all on function public.get_public_campaign(text) from public, anon, authenticated';
  execute 'revoke all on function public.get_public_candidate_stats(text) from public, anon, authenticated';
  execute 'grant execute on function public.is_active_candidato_slug(text) to anon, authenticated, service_role';
  execute 'grant execute on function public.get_public_campaign(text) to anon, authenticated, service_role';
  execute 'grant execute on function public.get_public_candidate_stats(text) to anon, authenticated, service_role';

  execute 'drop policy if exists "Gestores visualizam leads vinculados" on public.leads';
  execute 'revoke select on table public.leads from authenticated';
  execute 'grant insert on table public.leads to anon, authenticated';
  execute 'drop policy if exists "Publico insere lead valido" on public.leads';
  execute $policy$
    create policy "Publico insere lead valido"
    on public.leads for insert to anon, authenticated
    with check (
      char_length(btrim(nome)) between 3 and 120
      and whatsapp ~ '^\+[1-9][0-9]{7,14}$'
      and lgpd_consent is true and consent_version = '1.0'
      and public.is_active_candidato_slug(candidato_slug)
    )
  $policy$;

  execute 'drop policy if exists "Site_Publico_Leitura" on public.candidatos';
  execute 'drop policy if exists "Permitir leitura pública de cargos" on public.cargos_politicos';
  execute 'drop policy if exists "Permitir leitura pública para colinha_config" on public.colinha_config';
  execute 'drop policy if exists "Permitir leitura pública para colinha_travados" on public.colinha_travados';
  execute 'drop policy if exists "Permitir leitura pública para colinhas" on public.presidenciados';
  execute 'drop policy if exists "Administradores consultam cargos" on public.cargos_politicos';
  execute 'drop policy if exists "Administradores consultam presidenciados" on public.presidenciados';

  execute $policy$
    create policy "Administradores consultam cargos"
    on public.cargos_politicos for select to authenticated
    using (true)
  $policy$;
  execute $policy$
    create policy "Administradores consultam presidenciados"
    on public.presidenciados for select to authenticated
    using (true)
  $policy$;

  execute 'revoke all privileges on table public.candidatos from anon, authenticated';
  execute 'revoke all privileges on table public.cargos_politicos from anon, authenticated';
  execute 'revoke all privileges on table public.colinha_config from anon, authenticated';
  execute 'revoke all privileges on table public.colinha_travados from anon, authenticated';
  execute 'revoke all privileges on table public.presidenciados from anon, authenticated';
  execute 'grant select, insert, update, delete on table public.candidatos to authenticated';
  execute 'grant select on table public.cargos_politicos to authenticated';
  execute 'grant select, insert, update, delete on table public.colinha_config to authenticated';
  execute 'grant select, insert, update, delete on table public.colinha_travados to authenticated';
  execute 'grant select on table public.presidenciados to authenticated';

  perform pg_notify('pgrst', 'reload schema');
end;
$sec007$;
