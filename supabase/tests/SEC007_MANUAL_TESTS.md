# SEC-007 — Validação manual da superfície de leitura

Execute `20260819_reduce_public_read_surface.sql` como uma única instrução no
SQL Editor antes destes testes.

## Leitura pública

- [x] Uma campanha ativa abre sem autenticação, incluindo molduras e colinha.
- [x] Uma campanha inativa ou slug inexistente retorna página não encontrada.
- [x] As estatísticas públicas carregam e atualizam em até 30 segundos.
- [x] `get_public_campaign` não retorna `user_id`, datas, status, campos de plano,
  `url_foto_pendente` ou `status_foto`.
- [x] `anon` recebe recusa ao consultar diretamente `candidatos`,
  `cargos_politicos`, `presidenciados`, `colinha_config` e `colinha_travados`.

O catálogo confirmou que `anon` não possui privilégio direto em nenhuma das
cinco tabelas. Para validar que o DTO não contém campos internos sem exibir os
valores, substitua o slug e execute:

```sql
with payload as (
  select public.get_public_campaign('SUBSTITUA-PELO-SLUG') as data
)
select data is not null as campanha_encontrada,
       case
         when data is null then false
         else
           not ((data -> 'candidato') ?| array[
             'user_id', 'created_at', 'ativo', 'cargo_travado_id',
             'stats_colinha_downloads'
           ])
           and not exists (
             select 1
             from jsonb_array_elements(
               coalesce(data -> 'travados', '[]'::jsonb)
             ) item
             where item ?| array[
               'url_foto_pendente', 'status_foto', 'created_at',
               'id', 'colinha_config_id'
             ]
           )
       end as dto_sem_campos_internos
from payload;
```

Substitua o texto pelo slug exato de uma campanha ativa, sem chaves ou barras.
Resultado esperado: `campanha_encontrada = true` e
`dto_sem_campos_internos = true`. Se a campanha não for encontrada, ambos
retornam `false` em vez de um resultado inconclusivo (`null`).

## Leads e painel

- [x] O cadastro público de lead válido continua funcionando.
- [x] `authenticated` recebe recusa em `select` direto de `public.leads`.
- [x] Superadmin visualiza e exporta todos os leads pelo dashboard.
- [x] Gestor visualiza e exporta somente os leads de candidatos vinculados.
- [x] Gestor com dois ou mais candidatos consegue filtrar e exportar cada base separadamente.
- [x] Gestor sem vínculo não obtém leads pelo RPC.
- [x] Dashboard, cadastro/edição de candidato e administração da colinha
  continuam funcionando para os perfis autorizados.

O catálogo confirmou que `authenticated` possui somente `INSERT` em `leads`,
sem `SELECT`. Para validar a autorização do RPC com uma identidade sem vínculo,
execute:

```sql
with claims as materialized (
  select set_config(
    'request.jwt.claim.sub',
    gen_random_uuid()::text,
    true
  )
)
select public.get_accessible_leads(null) as leads_sem_vinculo
from claims;
```

Resultado esperado: `leads_sem_vinculo = []`.

## Resultado

SEC-007 concluída e validada em 19/08/2026. O catálogo confirmou os grants e
ACLs restritos, o DTO público não expôs campos internos, os fluxos públicos e
administrativos permaneceram funcionais e a identidade sem vínculo recebeu
`[]` do RPC de leads.

## Catálogo final

```sql
select schemaname, tablename, policyname, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename in (
    'leads', 'candidatos', 'cargos_politicos', 'presidenciados',
    'colinha_config', 'colinha_travados'
  )
order by tablename, policyname;
```

```sql
select table_name, grantee, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name in (
    'leads', 'candidatos', 'cargos_politicos', 'presidenciados',
    'colinha_config', 'colinha_travados'
  )
  and grantee in ('PUBLIC', 'anon', 'authenticated', 'service_role')
order by table_name, grantee, privilege_type;
```

```sql
select p.oid::regprocedure::text as assinatura,
       p.prosecdef as security_definer,
       p.proacl as permissoes,
       p.proconfig as configuracao
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'get_accessible_leads',
    'get_public_campaign',
    'get_public_candidate_stats',
    'is_active_candidato_slug'
  )
order by p.proname;
```

Resultado esperado: funções `SECURITY DEFINER`, `search_path = ''`, nenhum
`=X` no ACL e somente os RPCs públicos concedidos explicitamente a `anon`.
