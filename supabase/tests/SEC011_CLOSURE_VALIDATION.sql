select jsonb_build_object(
  'anon_leads_insert',
    has_table_privilege('anon', 'public.leads', 'INSERT')
    or has_any_column_privilege('anon', 'public.leads', 'INSERT'),
  'authenticated_leads_insert',
    has_table_privilege('authenticated', 'public.leads', 'INSERT')
    or has_any_column_privilege('authenticated', 'public.leads', 'INSERT'),
  'anon_increment_views', has_function_privilege(
    'anon', 'public.increment_views_count(text)', 'EXECUTE'
  ),
  'anon_increment_shares', has_function_privilege(
    'anon', 'public.increment_shares_count(text)', 'EXECUTE'
  ),
  'anon_increment_leads', has_function_privilege(
    'anon', 'public.increment_leads_count(text)', 'EXECUTE'
  ),
  'anon_increment_colinha', has_function_privilege(
    'anon', 'public.increment_colinha_download(text)', 'EXECUTE'
  ),
  'authenticated_increment_views', has_function_privilege(
    'authenticated', 'public.increment_views_count(text)', 'EXECUTE'
  ),
  'service_create_lead', has_function_privilege(
    'service_role',
    'public.create_public_lead(uuid,text,text,text,text,text)',
    'EXECUTE'
  ),
  'service_record_event', has_function_privilege(
    'service_role',
    'public.record_public_event(uuid,text,text,text)',
    'EXECUTE'
  )
) as sec011_closure_validation;
