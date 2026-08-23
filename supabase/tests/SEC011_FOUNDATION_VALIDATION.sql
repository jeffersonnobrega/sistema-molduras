select jsonb_build_object(
  'rate_limits_table', to_regclass('public.public_api_rate_limits'),
  'events_table', to_regclass('public.public_api_events'),
  'lead_request_id_column', exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'leads'
      and column_name = 'request_id'
      and data_type = 'uuid'
  ),
  'create_lead_service_role', has_function_privilege(
    'service_role',
    'public.create_public_lead(uuid,text,text,text,text,text)',
    'EXECUTE'
  ),
  'create_lead_anon', has_function_privilege(
    'anon',
    'public.create_public_lead(uuid,text,text,text,text,text)',
    'EXECUTE'
  ),
  'record_event_service_role', has_function_privilege(
    'service_role',
    'public.record_public_event(uuid,text,text,text)',
    'EXECUTE'
  ),
  'record_event_anon', has_function_privilege(
    'anon',
    'public.record_public_event(uuid,text,text,text)',
    'EXECUTE'
  ),
  'legacy_anon_insert_still_available',
    has_table_privilege('anon', 'public.leads', 'INSERT')
    or has_any_column_privilege('anon', 'public.leads', 'INSERT'),
  'legacy_anon_view_rpc_still_available', has_function_privilege(
    'anon',
    'public.increment_views_count(text)',
    'EXECUTE'
  )
) as sec011_foundation_validation;
