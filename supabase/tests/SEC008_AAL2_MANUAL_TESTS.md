# SEC-008 — Validação da exigência AAL2

Execute estes testes depois de aplicar
`20260820_enforce_superadmin_aal2.sql` no Supabase.

## 1. Auditoria do catálogo

```sql
select jsonb_build_object(
  'policies_with_aal', coalesce((
    select jsonb_agg(jsonb_build_object(
      'schema', schemaname,
      'table', tablename,
      'policy', policyname,
      'command', cmd,
      'using', qual,
      'with_check', with_check
    ) order by schemaname, tablename, policyname)
    from pg_policies
    where schemaname in ('public', 'storage')
      and (
        coalesce(qual, '') ilike '%aal%'
        or coalesce(with_check, '') ilike '%aal%'
      )
  ), '[]'::jsonb),
  'functions_with_aal', coalesce((
    select jsonb_agg(jsonb_build_object(
      'signature', p.oid::regprocedure::text,
      'security_definer', p.prosecdef,
      'permissions', p.proacl,
      'configuration', p.proconfig
    ) order by p.oid::regprocedure::text)
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and pg_get_functiondef(p.oid) ilike '%aal%'
  ), '[]'::jsonb)
) as sec008_aal_audit;
```

Resultado esperado:

- `functions_with_aal` contém `is_admin_aal2`, `can_manage_candidato`,
  `get_accessible_leads` e `protect_candidato_system_fields`;
- as políticas exclusivas de superadmin apontam para `is_admin_aal2()`;
- nenhuma função nova possui execução para `PUBLIC` ou `anon`.

## 2. Superadmin em AAL1

- [ ] Login com senha redireciona para `/admin/mfa` antes de mostrar o painel.
- [ ] Se já existir TOTP verificado, a página solicita o código atual.
- [ ] Se não existir TOTP, a página exibe QR Code e segredo para cadastro.
- [ ] Código inválido é recusado.
- [ ] A API `/api/admin/users` retorna `403` usando o JWT AAL1.
- [ ] A API `/api/admin/create-user` retorna `403` usando o JWT AAL1.
- [ ] Escritas exclusivas de superadmin são recusadas diretamente pela Data API.
- [ ] `get_accessible_leads` não retorna todos os leads em AAL1.

## 3. Superadmin em AAL2

- [ ] Código TOTP válido eleva a sessão e abre o destino administrativo.
- [ ] Recarregar dashboard e colinha mantém o acesso.
- [ ] O superadmin continua vendo todos os candidatos e leads.
- [ ] Criar, listar e remover acessos administrativos continua funcionando.
- [ ] Ativar/inativar e cadastrar/excluir candidato continua funcionando.

## 4. Gestor de candidato

- [ ] Gestor vinculado não é enviado para `/admin/mfa`.
- [ ] Gestor continua vendo somente candidatos e leads vinculados.
- [ ] Gestor continua impedido de acessar as APIs exclusivas de superadmin.
- [ ] Um superadmin também vinculado como gestor continua exigindo AAL2.

## 5. Sessão e recuperação

- [ ] Logout na tela MFA encerra a sessão.
- [ ] Após 30 minutos de inatividade, a sessão continua sendo encerrada.
- [ ] Após 8 horas de duração absoluta, a sessão continua sendo encerrada.
- [ ] Convite e recuperação de senha continuam funcionando.

