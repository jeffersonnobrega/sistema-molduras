do $sec004$
declare
  legacy_count bigint;
  deleted_count bigint;
begin
  -- Estes 13 registros foram confirmados pelo responsável como dados de teste.
  select count(*)
  into legacy_count
  from public.leads
  where lgpd_consent is distinct from true
    and whatsapp !~ '^\+[1-9][0-9]{7,14}$'
    and regexp_replace(whatsapp, '\D', '', 'g') ~ '^[0-9]{10,11}$';

  if legacy_count <> 13 then
    raise exception
      'SEC-004 cancelada: esperados 13 leads legados de teste, encontrados %.',
      legacy_count;
  end if;

  delete from public.leads
  where lgpd_consent is distinct from true
    and whatsapp !~ '^\+[1-9][0-9]{7,14}$'
    and regexp_replace(whatsapp, '\D', '', 'g') ~ '^[0-9]{10,11}$';

  get diagnostics deleted_count = row_count;

  if deleted_count <> 13 then
    raise exception
      'SEC-004 cancelada: esperados 13 leads excluídos, excluídos %.',
      deleted_count;
  end if;

  -- Cancela a migration se algum dado remanescente violar as novas regras.
  if exists (
    select 1
    from public.leads l
    where char_length(btrim(l.nome)) not between 3 and 120
       or l.whatsapp !~ '^\+[1-9][0-9]{7,14}$'
       or l.lgpd_consent is distinct from true
       or l.consent_version is distinct from '1.0'
       or l.created_at is null
       or l.consent_at is null
       or not exists (
         select 1
         from public.candidatos c
         where c.slug = l.candidato_slug
           and c.ativo is true
       )
  ) then
    raise exception
      'SEC-004 cancelada: existem leads remanescentes incompatíveis com as novas regras.';
  end if;

  execute 'alter table public.leads enable row level security';

  execute 'alter table public.leads drop constraint if exists leads_nome_check';
  execute 'alter table public.leads drop constraint if exists nome_length_check';
  execute 'alter table public.leads drop constraint if exists leads_nome_valid_check';
  execute 'alter table public.leads drop constraint if exists leads_whatsapp_e164_check';
  execute 'alter table public.leads drop constraint if exists leads_lgpd_consent_check';
  execute 'alter table public.leads drop constraint if exists leads_consent_version_check';

  execute $ddl$
    alter table public.leads
      alter column created_at set default now(),
      alter column created_at set not null,
      alter column consent_at set default now(),
      alter column consent_at set not null,
      alter column consent_version set default '1.0',
      alter column consent_version set not null,
      alter column lgpd_consent drop default
  $ddl$;

  execute $ddl$
    alter table public.leads
      add constraint leads_nome_valid_check
        check (char_length(btrim(nome)) between 3 and 120),
      add constraint leads_whatsapp_e164_check
        check (whatsapp ~ '^\+[1-9][0-9]{7,14}$'),
      add constraint leads_lgpd_consent_check
        check (lgpd_consent is true),
      add constraint leads_consent_version_check
        check (consent_version = '1.0')
  $ddl$;

  execute 'drop policy if exists "Leads: Apenas inserção pública" on public.leads';
  execute 'drop policy if exists "Publico insere lead valido" on public.leads';

  execute $policy$
    create policy "Publico insere lead valido"
    on public.leads
    for insert
    to anon, authenticated
    with check (
      char_length(btrim(nome)) between 3 and 120
      and whatsapp ~ '^\+[1-9][0-9]{7,14}$'
      and lgpd_consent is true
      and consent_version = '1.0'
      and exists (
        select 1
        from public.candidatos c
        where c.slug = leads.candidato_slug
          and c.ativo is true
      )
    )
  $policy$;

  execute 'revoke all privileges on table public.leads from public, anon, authenticated';

  execute $grant$
    grant insert (nome, whatsapp, candidato_slug, lgpd_consent, consent_version)
    on table public.leads
    to anon, authenticated
  $grant$;

  perform pg_notify('pgrst', 'reload schema');
end;
$sec004$;
