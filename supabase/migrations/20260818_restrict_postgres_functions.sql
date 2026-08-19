begin;

-- Função sem consumidor que permite contar leads contornando RLS.
drop function if exists public.get_leads_count(text);

-- Funções futuras da aplicação exigirão grants explícitos.
alter default privileges
for role postgres
in schema public
revoke execute on functions from public, anon, authenticated;

create or replace function public.increment_views_count(
  slug_candidato text
)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.candidatos as c
  set total_views = coalesce(c.total_views, 0) + 1
  where c.slug = $1
    and c.ativo is true;
$$;

create or replace function public.increment_shares_count(
  slug_candidato text
)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.candidatos as c
  set total_shares = coalesce(c.total_shares, 0) + 1
  where c.slug = $1
    and c.ativo is true;
$$;

create or replace function public.increment_leads_count(
  slug_candidato text
)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.candidatos as c
  set stats_leads_count = coalesce(c.stats_leads_count, 0) + 1
  where c.slug = $1
    and c.ativo is true;
$$;

create or replace function public.increment_colinha_download(
  slug_candidato text
)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.candidatos as c
  set stats_colinha_downloads =
    coalesce(c.stats_colinha_downloads, 0) + 1
  where c.id::text = $1
    and c.ativo is true;
$$;

revoke all
on function public.increment_views_count(text),
            public.increment_shares_count(text),
            public.increment_leads_count(text),
            public.increment_colinha_download(text)
from public, anon, authenticated;

grant execute
on function public.increment_views_count(text),
            public.increment_shares_count(text),
            public.increment_leads_count(text),
            public.increment_colinha_download(text)
to anon, authenticated, service_role;

-- Gestores continuam impedidos de alterar campos sistêmicos diretamente.
-- As funções SECURITY DEFINER acima executam como postgres e podem incrementar.
create or replace function public.protect_candidato_system_fields()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if current_user <> 'postgres'
     and not public.is_admin((select auth.uid()))
  then
    new.id := old.id;
    new.user_id := old.user_id;
    new.created_at := old.created_at;
    new.total_views := old.total_views;
    new.total_shares := old.total_shares;
    new.stats_leads_count := old.stats_leads_count;
    new.stats_colinha_downloads := old.stats_colinha_downloads;
  end if;

  return new;
end;
$$;

revoke execute
on function public.protect_candidato_system_fields()
from public, anon, authenticated, service_role;

-- O event trigger ensure_rls continua utilizando esta função internamente.
revoke execute
on function public.rls_auto_enable()
from public, anon, authenticated, service_role;

commit;

notify pgrst, 'reload schema';
