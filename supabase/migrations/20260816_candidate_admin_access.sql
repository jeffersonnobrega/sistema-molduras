begin;

create table if not exists public.candidato_admins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  candidato_id uuid not null references public.candidatos(id) on delete cascade,
  nome text not null check (char_length(nome) between 2 and 120),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  unique (user_id, candidato_id)
);

create index if not exists candidato_admins_user_id_idx
  on public.candidato_admins(user_id);
create index if not exists candidato_admins_candidato_id_idx
  on public.candidato_admins(candidato_id);
create index if not exists candidatos_user_id_idx
  on public.candidatos(user_id);
create index if not exists leads_candidato_slug_idx
  on public.leads(candidato_slug);

alter table public.candidato_admins enable row level security;

-- Mantém os acessos de candidato existentes durante a migração.
insert into public.candidato_admins (user_id, candidato_id, nome)
select c.user_id, c.id, c.nome_urna
from public.candidatos c
where c.user_id is not null
on conflict (user_id, candidato_id) do nothing;

create or replace function public.is_admin(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.admins a where a.user_id = uid
  );
$$;

create or replace function public.can_manage_candidato(target_candidato_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    public.is_admin((select auth.uid()))
    or exists (
      select 1
      from public.candidato_admins ca
      where ca.user_id = (select auth.uid())
        and ca.candidato_id = target_candidato_id
    );
$$;

revoke all on function public.is_admin(uuid) from public, anon;
revoke all on function public.can_manage_candidato(uuid) from public, anon;
grant execute on function public.is_admin(uuid) to authenticated, service_role;
grant execute on function public.can_manage_candidato(uuid) to authenticated, service_role;

drop policy if exists "Admins podem ler tabela de admins" on public.admins;
create policy "Superadmin visualiza administradores"
on public.admins for select to authenticated
using (public.is_admin((select auth.uid())));

create policy "Superadmin gerencia vinculos"
on public.candidato_admins for all to authenticated
using (public.is_admin((select auth.uid())))
with check (public.is_admin((select auth.uid())));

drop policy if exists "Admin Management" on public.candidatos;
drop policy if exists "Admin_Full_Access" on public.candidatos;
drop policy if exists "Candidato_Update_Own" on public.candidatos;

create policy "Gestores visualizam candidatos vinculados"
on public.candidatos for select to authenticated
using (public.can_manage_candidato(id));

create policy "Gestores atualizam candidatos vinculados"
on public.candidatos for update to authenticated
using (public.can_manage_candidato(id))
with check (public.can_manage_candidato(id));

create policy "Superadmin cadastra candidatos"
on public.candidatos for insert to authenticated
with check (public.is_admin((select auth.uid())));

create policy "Superadmin exclui candidatos"
on public.candidatos for delete to authenticated
using (public.is_admin((select auth.uid())));

create or replace function public.protect_candidato_system_fields()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not public.is_admin((select auth.uid())) then
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

drop trigger if exists protect_candidato_system_fields on public.candidatos;
create trigger protect_candidato_system_fields
before update on public.candidatos
for each row execute function public.protect_candidato_system_fields();

drop policy if exists "Escrita total para autenticados" on public.colinha_config;
create policy "Gestores visualizam configuracao propria"
on public.colinha_config for select to authenticated
using (public.can_manage_candidato(candidato_id));
create policy "Gestores inserem configuracao propria"
on public.colinha_config for insert to authenticated
with check (public.can_manage_candidato(candidato_id));
create policy "Gestores atualizam configuracao propria"
on public.colinha_config for update to authenticated
using (public.can_manage_candidato(candidato_id))
with check (public.can_manage_candidato(candidato_id));
create policy "Gestores excluem configuracao propria"
on public.colinha_config for delete to authenticated
using (public.can_manage_candidato(candidato_id));

drop policy if exists "Escrita total para autenticados travados" on public.colinha_travados;
create policy "Gestores visualizam travados proprios"
on public.colinha_travados for select to authenticated
using (exists (
  select 1 from public.colinha_config cc
  where cc.id = colinha_config_id
    and public.can_manage_candidato(cc.candidato_id)
));
create policy "Gestores inserem travados proprios"
on public.colinha_travados for insert to authenticated
with check (exists (
  select 1 from public.colinha_config cc
  where cc.id = colinha_config_id
    and public.can_manage_candidato(cc.candidato_id)
));
create policy "Gestores atualizam travados proprios"
on public.colinha_travados for update to authenticated
using (exists (
  select 1 from public.colinha_config cc
  where cc.id = colinha_config_id
    and public.can_manage_candidato(cc.candidato_id)
))
with check (exists (
  select 1 from public.colinha_config cc
  where cc.id = colinha_config_id
    and public.can_manage_candidato(cc.candidato_id)
));
create policy "Gestores excluem travados proprios"
on public.colinha_travados for delete to authenticated
using (exists (
  select 1 from public.colinha_config cc
  where cc.id = colinha_config_id
    and public.can_manage_candidato(cc.candidato_id)
));

drop policy if exists "Gestao_Segmentada_Leads" on public.leads;
drop policy if exists "Leads: Admin pode ler" on public.leads;
drop policy if exists "Leads: Proibir leitura pública" on public.leads;
create policy "Gestores visualizam leads vinculados"
on public.leads for select to authenticated
using (
  exists (
    select 1
    from public.candidatos c
    where c.slug = candidato_slug
      and public.can_manage_candidato(c.id)
  )
);

-- Remove políticas de Storage amplas e sobrepostas.
drop policy if exists "Admin_Upload_Molduras" on storage.objects;
drop policy if exists "Controle total admin 1skj8dl_0" on storage.objects;
drop policy if exists "Controle total admin 1skj8dl_1" on storage.objects;
drop policy if exists "Controle total admin 1skj8dl_2" on storage.objects;
drop policy if exists "Controle total admin 1skj8dl_3" on storage.objects;
drop policy if exists "Gestão Restrita para Admins" on storage.objects;
drop policy if exists "Upload Restrito para Admins" on storage.objects;
drop policy if exists "Upload Seguro de Imagens" on storage.objects;
drop policy if exists "Acesso Público de Leitura" on storage.objects;
drop policy if exists "permitir leitura pública 1skj8dl_0" on storage.objects;

create policy "Gestores consultam objetos vinculados"
on storage.objects for select to authenticated
using (
  bucket_id = 'molduras'
  and exists (
    select 1 from public.candidatos c
    where c.slug = (storage.foldername(name))[1]
      and public.can_manage_candidato(c.id)
  )
);

create policy "Gestores inserem molduras vinculadas"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'molduras'
  and exists (
    select 1 from public.candidatos c
    where c.slug = (storage.foldername(name))[1]
      and public.can_manage_candidato(c.id)
  )
);

create policy "Gestores atualizam molduras vinculadas"
on storage.objects for update to authenticated
using (
  bucket_id = 'molduras'
  and exists (
    select 1 from public.candidatos c
    where c.slug = (storage.foldername(name))[1]
      and public.can_manage_candidato(c.id)
  )
)
with check (
  bucket_id = 'molduras'
  and exists (
    select 1 from public.candidatos c
    where c.slug = (storage.foldername(name))[1]
      and public.can_manage_candidato(c.id)
  )
);

create policy "Gestores excluem molduras vinculadas"
on storage.objects for delete to authenticated
using (
  bucket_id = 'molduras'
  and exists (
    select 1 from public.candidatos c
    where c.slug = (storage.foldername(name))[1]
      and public.can_manage_candidato(c.id)
  )
);

commit;
