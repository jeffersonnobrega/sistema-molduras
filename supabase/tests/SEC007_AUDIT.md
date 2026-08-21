# SEC-007 — Auditoria antes da redução de leitura

As consultas abaixo são exclusivamente de leitura e podem ser executadas
separadamente no SQL Editor. Não aplique revogações antes de conferir todos os
resultados.

## 1. Políticas ativas

```sql
select schemaname, tablename, policyname, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename in (
    'leads',
    'candidatos',
    'cargos_politicos',
    'presidenciados',
    'colinha_config',
    'colinha_travados'
  )
order by tablename, policyname;
```

## 2. Privilégios concedidos

```sql
select table_schema, table_name, grantee, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name in (
    'leads',
    'candidatos',
    'cargos_politicos',
    'presidenciados',
    'colinha_config',
    'colinha_travados'
  )
  and grantee in ('PUBLIC', 'anon', 'authenticated', 'service_role')
order by table_name, grantee, privilege_type;
```

## 3. Colunas expostas pelas tabelas públicas

```sql
select table_name, ordinal_position, column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name in (
    'candidatos',
    'cargos_politicos',
    'presidenciados',
    'colinha_config',
    'colinha_travados'
  )
order by table_name, ordinal_position;
```

Revise especialmente qualquer coluna de proprietário, e-mail, telefone,
token, observação interna, plano ou configuração administrativa. Não envie
valores reais sensíveis ao registrar o resultado; nomes e tipos das colunas são
suficientes para preparar a migration.

## 4. RPC de leads

```sql
select p.oid::regprocedure::text as assinatura,
       p.prosecdef as security_definer,
       p.proacl as permissoes,
       p.proconfig as configuracao,
       pg_get_functiondef(p.oid) as definicao
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname = 'get_accessible_leads';
```

Resultado esperado antes do fechamento: `SECURITY DEFINER`, `search_path = ''`,
execução para `authenticated` e `service_role`, sem `anon` ou `PUBLIC`.

## 5. Dependências encontradas no código

- O dashboard e a exportação usam `get_accessible_leads`; não foi encontrado
  consumidor de leitura direta de `public.leads`.
- A página pública ainda usa `select("*")` em `public.candidatos`.
- A colinha pública ainda consulta diretamente `cargos_politicos`,
  `presidenciados`, `colinha_config` e `colinha_travados`.

## Próxima etapa

Com os resultados acima, preparar uma migration atômica para:

1. revogar a leitura direta de `leads` e remover suas políticas de `SELECT`;
2. criar um RPC público com uma lista positiva de campos do candidato;
3. remover a leitura pública direta de `candidatos`;
4. manter ou substituir as demais leituras públicas conforme as colunas reais;
5. preservar as políticas administrativas e o RPC de leads.

## Resultado da auditoria

Inventário recebido e revisado em 19/08/2026:

- `get_accessible_leads` está com `SECURITY DEFINER`, `search_path = ''` e ACL
  restrita a `authenticated` e `service_role`;
- `authenticated` ainda possuía `SELECT` direto em `leads`;
- `anon` lia toda a linha de `candidatos`, inclusive `user_id`, status e datas;
- `anon` possuía grants de escrita excessivos nas tabelas auxiliares;
- `colinha_travados` publicava campos internos de moderação de fotos.

A migration e os testes de aplicação foram preparados com base nesse estado.
