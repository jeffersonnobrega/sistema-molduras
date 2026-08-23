do $sec011_close$
begin
  execute 'drop policy if exists "Publico insere lead valido" on public.leads';
  execute 'drop policy if exists "Leads: Apenas inserção pública" on public.leads';

  execute 'revoke all privileges on table public.leads from public, anon, authenticated';
  execute $privileges$
    revoke insert (
      id,
      request_id,
      nome,
      whatsapp,
      candidato_slug,
      created_at,
      lgpd_consent,
      consent_version,
      consent_at
    ) on public.leads
    from anon, authenticated
  $privileges$;

  execute $privileges$
    revoke all
    on function public.increment_views_count(text),
                public.increment_shares_count(text),
                public.increment_leads_count(text),
                public.increment_colinha_download(text)
    from public, anon, authenticated
  $privileges$;

  perform pg_notify('pgrst', 'reload schema');
end;
$sec011_close$;
