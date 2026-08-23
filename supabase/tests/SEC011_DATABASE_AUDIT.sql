select jsonb_build_object(
  'tables', coalesce((
    select jsonb_agg(jsonb_build_object(
      'table', c.relname,
      'rls_enabled', c.relrowsecurity,
      'rls_forced', c.relforcerowsecurity
    ) order by c.relname)
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind in ('r', 'p')
      and c.relname in (
        'candidatos',
        'leads',
        'colinhas_salvas',
        'public_api_rate_limits',
        'public_api_events'
      )
  ), '[]'::jsonb),
  'columns', coalesce((
    select jsonb_agg(jsonb_build_object(
      'table', table_name,
      'column', column_name,
      'type', data_type,
      'nullable', is_nullable,
      'default', column_default,
      'max_length', character_maximum_length
    ) order by table_name, ordinal_position)
    from information_schema.columns
    where table_schema = 'public'
      and table_name in (
        'candidatos',
        'leads',
        'colinhas_salvas',
        'public_api_rate_limits',
        'public_api_events'
      )
  ), '[]'::jsonb),
  'constraints', coalesce((
    select jsonb_agg(jsonb_build_object(
      'table', rel.relname,
      'name', con.conname,
      'type', con.contype,
      'validated', con.convalidated,
      'definition', pg_get_constraintdef(con.oid)
    ) order by rel.relname, con.conname)
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace n on n.oid = rel.relnamespace
    where n.nspname = 'public'
      and rel.relname in (
        'candidatos',
        'leads',
        'colinhas_salvas',
        'public_api_rate_limits',
        'public_api_events'
      )
  ), '[]'::jsonb),
  'indexes', coalesce((
    select jsonb_agg(jsonb_build_object(
      'table', tablename,
      'name', indexname,
      'definition', indexdef
    ) order by tablename, indexname)
    from pg_indexes
    where schemaname = 'public'
      and tablename in (
        'candidatos',
        'leads',
        'colinhas_salvas',
        'public_api_rate_limits',
        'public_api_events'
      )
  ), '[]'::jsonb),
  'policies', coalesce((
    select jsonb_agg(jsonb_build_object(
      'table', tablename,
      'policy', policyname,
      'roles', roles,
      'command', cmd,
      'using', qual,
      'with_check', with_check
    ) order by tablename, policyname)
    from pg_policies
    where schemaname = 'public'
      and tablename in (
        'candidatos',
        'leads',
        'colinhas_salvas',
        'public_api_rate_limits',
        'public_api_events'
      )
  ), '[]'::jsonb),
  'table_grants', coalesce((
    select jsonb_agg(jsonb_build_object(
      'table', table_name,
      'grantee', grantee,
      'privilege', privilege_type
    ) order by table_name, grantee, privilege_type)
    from information_schema.role_table_grants
    where table_schema = 'public'
      and table_name in (
        'candidatos',
        'leads',
        'colinhas_salvas',
        'public_api_rate_limits',
        'public_api_events'
      )
      and grantee in ('anon', 'authenticated', 'service_role')
  ), '[]'::jsonb),
  'column_grants', coalesce((
    select jsonb_agg(jsonb_build_object(
      'table', table_name,
      'column', column_name,
      'grantee', grantee,
      'privilege', privilege_type
    ) order by table_name, column_name, grantee, privilege_type)
    from information_schema.column_privileges
    where table_schema = 'public'
      and table_name in ('leads', 'colinhas_salvas')
      and grantee in ('anon', 'authenticated', 'service_role')
  ), '[]'::jsonb),
  'functions', coalesce((
    select jsonb_agg(jsonb_build_object(
      'signature', p.oid::regprocedure::text,
      'owner', pg_get_userbyid(p.proowner),
      'security_definer', p.prosecdef,
      'permissions', p.proacl,
      'configuration', p.proconfig,
      'definition', pg_get_functiondef(p.oid)
    ) order by p.oid::regprocedure::text)
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prokind = 'f'
      and p.proname in (
        'increment_views_count',
        'increment_shares_count',
        'increment_leads_count',
        'increment_colinha_download',
        'create_public_lead',
        'record_public_event'
      )
  ), '[]'::jsonb),
  'extensions', coalesce((
    select jsonb_agg(jsonb_build_object(
      'name', extname,
      'version', extversion,
      'schema', n.nspname
    ) order by extname)
    from pg_extension e
    join pg_namespace n on n.oid = e.extnamespace
    where extname in ('pgcrypto', 'uuid-ossp')
  ), '[]'::jsonb),
  'data_summary', jsonb_build_object(
    'leads', (select count(*) from public.leads),
    'leads_without_candidate', (
      select count(*)
      from public.leads l
      where not exists (
        select 1 from public.candidatos c where c.slug = l.candidato_slug
      )
    ),
    'saved_ballots', (select count(*) from public.colinhas_salvas),
    'active_candidates', (
      select count(*) from public.candidatos where ativo is true
    ),
    'inactive_candidates', (
      select count(*) from public.candidatos where ativo is not true
    )
  )
) as sec011_database_audit;
