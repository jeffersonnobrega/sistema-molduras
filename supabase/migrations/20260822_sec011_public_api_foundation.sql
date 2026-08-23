do $sec011_foundation$
begin
  execute $ddl$
    create table if not exists public.public_api_rate_limits (
      scope text not null
        check (scope in ('lead', 'view', 'share', 'colinha_download')),
      client_hash text not null
        check (client_hash ~ '^[0-9a-f]{64}$'),
      candidato_id uuid not null
        references public.candidatos(id) on delete cascade,
      window_started_at timestamptz not null,
      request_count integer not null check (request_count > 0),
      expires_at timestamptz not null,
      primary key (scope, client_hash, candidato_id)
    )
  $ddl$;

  execute $ddl$
    create table if not exists public.public_api_events (
      request_id uuid primary key,
      candidato_id uuid not null
        references public.candidatos(id) on delete cascade,
      event_type text not null
        check (event_type in ('view', 'share', 'colinha_download')),
      created_at timestamptz not null default now(),
      expires_at timestamptz not null default (now() + interval '24 hours')
    )
  $ddl$;

  execute 'alter table public.public_api_rate_limits enable row level security';
  execute 'alter table public.public_api_rate_limits force row level security';
  execute 'alter table public.public_api_events enable row level security';
  execute 'alter table public.public_api_events force row level security';

  execute $ddl$
    create index if not exists public_api_rate_limits_expires_at_idx
    on public.public_api_rate_limits (expires_at)
  $ddl$;
  execute $ddl$
    create index if not exists public_api_events_expires_at_idx
    on public.public_api_events (expires_at)
  $ddl$;

  execute $ddl$
    alter table public.leads
    add column if not exists request_id uuid
  $ddl$;
  execute $ddl$
    create unique index if not exists leads_request_id_unique
    on public.leads (request_id)
    where request_id is not null
  $ddl$;

  execute $privileges$
    revoke all privileges
    on table public.public_api_rate_limits,
             public.public_api_events
    from public, anon, authenticated
  $privileges$;
  execute $privileges$
    grant select, insert, update, delete
    on table public.public_api_rate_limits,
             public.public_api_events
    to service_role
  $privileges$;

  execute $function$
    create or replace function public.consume_public_api_rate_limit(
      scope_value text,
      candidato_id_value uuid,
      client_hash_value text,
      limit_value integer,
      window_seconds_value integer
    )
    returns boolean
    language plpgsql
    security definer
    set search_path = ''
    as $body$
    declare
      now_value timestamptz := statement_timestamp();
      current_count integer;
    begin
      if scope_value not in ('lead', 'view', 'share', 'colinha_download')
         or client_hash_value !~ '^[0-9a-f]{64}$'
         or limit_value not between 1 and 1000
         or window_seconds_value not between 60 and 86400
      then
        raise exception using
          errcode = '22023',
          message = 'Parâmetros de rate limit inválidos.';
      end if;

      delete from public.public_api_rate_limits
      where ctid in (
        select ctid
        from public.public_api_rate_limits
        where expires_at < now_value
        limit 100
      );

      insert into public.public_api_rate_limits as limits (
        scope,
        client_hash,
        candidato_id,
        window_started_at,
        request_count,
        expires_at
      ) values (
        scope_value,
        client_hash_value,
        candidato_id_value,
        now_value,
        1,
        now_value + pg_catalog.make_interval(secs => window_seconds_value)
      )
      on conflict (scope, client_hash, candidato_id)
      do update set
        window_started_at = case
          when limits.expires_at <= now_value then now_value
          else limits.window_started_at
        end,
        request_count = case
          when limits.expires_at <= now_value then 1
          else limits.request_count + 1
        end,
        expires_at = case
          when limits.expires_at <= now_value
            then now_value + pg_catalog.make_interval(secs => window_seconds_value)
          else limits.expires_at
        end
      returning request_count into current_count;

      return current_count <= limit_value;
    end;
    $body$
  $function$;

  execute $function$
    create or replace function public.create_public_lead(
      request_id_value uuid,
      candidato_slug_value text,
      nome_value text,
      whatsapp_value text,
      consent_version_value text,
      client_hash_value text
    )
    returns jsonb
    language plpgsql
    security definer
    set search_path = ''
    as $body$
    declare
      candidato_id_value uuid;
      lead_id_value uuid;
    begin
      if request_id_value is null
         or candidato_slug_value !~ '^[a-z0-9]+(-[a-z0-9]+)*$'
         or char_length(candidato_slug_value) > 100
         or char_length(btrim(nome_value)) not between 3 and 120
         or nome_value !~ '^[[:alpha:]À-ÿ ''-]+$'
         or whatsapp_value !~ '^\+[1-9][0-9]{7,14}$'
         or consent_version_value <> '1.0'
         or client_hash_value !~ '^[0-9a-f]{64}$'
      then
        raise exception using
          errcode = '22023',
          message = 'Dados de lead inválidos.';
      end if;

      select l.id
      into lead_id_value
      from public.leads l
      where l.request_id = request_id_value;

      if lead_id_value is not null then
        return jsonb_build_object('status', 'duplicate');
      end if;

      select c.id
      into candidato_id_value
      from public.candidatos c
      where c.slug = candidato_slug_value
        and c.ativo is true;

      if candidato_id_value is null then
        return jsonb_build_object('status', 'candidate_unavailable');
      end if;

      if not public.consume_public_api_rate_limit(
        'lead',
        candidato_id_value,
        client_hash_value,
        5,
        900
      ) then
        return jsonb_build_object('status', 'rate_limited');
      end if;

      insert into public.leads (
        request_id,
        nome,
        whatsapp,
        candidato_slug,
        lgpd_consent,
        consent_version,
        consent_at
      ) values (
        request_id_value,
        btrim(nome_value),
        whatsapp_value,
        candidato_slug_value,
        true,
        consent_version_value,
        now()
      )
      on conflict (request_id) where request_id is not null
      do nothing
      returning id into lead_id_value;

      if lead_id_value is null then
        return jsonb_build_object('status', 'duplicate');
      end if;

      update public.candidatos c
      set stats_leads_count = coalesce(c.stats_leads_count, 0) + 1
      where c.id = candidato_id_value;

      return jsonb_build_object('status', 'created');
    end;
    $body$
  $function$;

  execute $function$
    create or replace function public.record_public_event(
      request_id_value uuid,
      candidato_slug_value text,
      event_type_value text,
      client_hash_value text
    )
    returns jsonb
    language plpgsql
    security definer
    set search_path = ''
    as $body$
    declare
      candidato_id_value uuid;
      inserted_request_id uuid;
      limit_value integer;
      window_seconds_value integer;
    begin
      if request_id_value is null
         or candidato_slug_value !~ '^[a-z0-9]+(-[a-z0-9]+)*$'
         or char_length(candidato_slug_value) > 100
         or event_type_value not in ('view', 'share', 'colinha_download')
         or client_hash_value !~ '^[0-9a-f]{64}$'
      then
        raise exception using
          errcode = '22023',
          message = 'Dados de evento inválidos.';
      end if;

      delete from public.public_api_events
      where ctid in (
        select ctid
        from public.public_api_events
        where expires_at < now()
        limit 100
      );

      if exists (
        select 1
        from public.public_api_events e
        where e.request_id = request_id_value
      ) then
        return jsonb_build_object('status', 'duplicate');
      end if;

      select c.id
      into candidato_id_value
      from public.candidatos c
      where c.slug = candidato_slug_value
        and c.ativo is true;

      if candidato_id_value is null then
        return jsonb_build_object('status', 'candidate_unavailable');
      end if;

      limit_value := case event_type_value
        when 'view' then 30
        when 'share' then 10
        when 'colinha_download' then 10
      end;
      window_seconds_value := case event_type_value
        when 'view' then 3600
        else 900
      end;

      if not public.consume_public_api_rate_limit(
        event_type_value,
        candidato_id_value,
        client_hash_value,
        limit_value,
        window_seconds_value
      ) then
        return jsonb_build_object('status', 'rate_limited');
      end if;

      insert into public.public_api_events (
        request_id,
        candidato_id,
        event_type,
        expires_at
      ) values (
        request_id_value,
        candidato_id_value,
        event_type_value,
        now() + interval '24 hours'
      )
      on conflict (request_id) do nothing
      returning request_id into inserted_request_id;

      if inserted_request_id is null then
        return jsonb_build_object('status', 'duplicate');
      end if;

      update public.candidatos c
      set total_views = coalesce(c.total_views, 0)
          + case when event_type_value = 'view' then 1 else 0 end,
          total_shares = coalesce(c.total_shares, 0)
          + case when event_type_value = 'share' then 1 else 0 end,
          stats_colinha_downloads = coalesce(c.stats_colinha_downloads, 0)
          + case when event_type_value = 'colinha_download' then 1 else 0 end
      where c.id = candidato_id_value;

      return jsonb_build_object('status', 'recorded');
    end;
    $body$
  $function$;

  execute $privileges$
    revoke all
    on function public.consume_public_api_rate_limit(text, uuid, text, integer, integer),
                public.create_public_lead(uuid, text, text, text, text, text),
                public.record_public_event(uuid, text, text, text)
    from public, anon, authenticated, service_role
  $privileges$;
  execute $privileges$
    grant execute
    on function public.create_public_lead(uuid, text, text, text, text, text),
                public.record_public_event(uuid, text, text, text)
    to service_role
  $privileges$;

  perform pg_notify('pgrst', 'reload schema');
end;
$sec011_foundation$;
