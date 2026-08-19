# SEC-005 — Validação manual

## Progresso em 18/08/2026

- [x] Função, trigger, `search_path` e ACL conferidos no catálogo.
- [x] Gestor alterou `nome_urna` e restaurou o valor original.
- [x] Gestor tentou alterar `slug`; o valor não foi alterado.
- [x] Gestor tentou alterar `ativo`; a API respondeu HTTP `403`.
- [x] Gestor tentou alterar `total_views`; a API respondeu HTTP `403`.
- [x] Gestor tentou alterar `user_id`; a API respondeu HTTP `403`.
- [x] Superadmin alterou `ativo` para `false`; a API respondeu HTTP `200`.
- [x] Superadmin restaurou `ativo` para `true`.
- [x] Fluxos funcionais validados sem erro.

SEC-005 concluída e validada em 18/08/2026.

Execute estes testes somente depois de aplicar
`20260818_protect_candidate_system_fields.sql` no Supabase.

Use um candidato e usuários de teste. Não use a `service_role` nas requisições
REST. Nos exemplos abaixo, substitua os valores entre `<...>` e mantenha a
chave anônima e o JWT apenas no seu cliente local/Postman.

## 1. Conferir função e trigger

Consulta somente de leitura:

```sql
select
  t.tgname as trigger_name,
  pg_get_triggerdef(t.oid) as trigger_definition,
  pg_get_functiondef(t.tgfoid) as function_definition,
  p.proacl as permissions
from pg_trigger t
join pg_class c on c.oid = t.tgrelid
join pg_namespace n on n.oid = c.relnamespace
join pg_proc p on p.oid = t.tgfoid
where n.nspname = 'public'
  and c.relname = 'candidatos'
  and t.tgname = 'protect_candidato_system_fields'
  and not t.tgisinternal;
```

O resultado deve mostrar a lista positiva de campos editáveis e permissões
somente para `postgres`.

## 2. Requisição REST como gestor

Endpoint:

```text
PATCH <SUPABASE_URL>/rest/v1/candidatos?id=eq.<CANDIDATO_ID>
```

Headers:

```text
apikey: <SUPABASE_ANON_KEY>
Authorization: Bearer <JWT_DO_GESTOR>
Content-Type: application/json
Prefer: return=representation
```

### Alteração permitida

Status: [x] Validada com gestor; alteração realizada e restaurada.

```json
{
  "nome_urna": "NOME TEMPORÁRIO DO TESTE"
}
```

Resultado esperado: HTTP `200`. Restaure o nome original depois do teste.

### Alterações proibidas

Status: [x] Validado.

- [x] `slug`: permaneceu inalterado.
- [x] `ativo`: recusado com HTTP `403`.
- [x] `total_views`: recusado com HTTP `403`.
- [x] `user_id`: recusado com HTTP `403`.

Execute separadamente:

```json
{ "slug": "slug-proibido" }
```

```json
{ "ativo": false }
```

```json
{ "total_views": 999999 }
```

```json
{ "user_id": "00000000-0000-0000-0000-000000000000" }
```

Resultado esperado em todos: HTTP `403`, código PostgreSQL `42501` e nenhum
valor alterado.

## 3. Requisição REST como superadmin

Status parcial:

- [x] Alteração de `ativo` para `false`: aceita com HTTP `200`.
- [x] Restauração de `ativo` para `true`: concluída.

Repita em um candidato de teste com o JWT de um superadmin:

```json
{ "ativo": false }
```

Resultado esperado: HTTP `200`. Em seguida, restaure:

```json
{ "ativo": true }
```

O superadmin também deve continuar conseguindo alterar `slug`, mas isso não
deve ser testado em um candidato real porque muda sua URL pública.

## 4. Fluxos funcionais

- [x] Gestor edita nome, partido, número, cargo, cores, foto e molduras.
- [x] Gestor configura os campos travados da colinha.
- [x] Superadmin ativa/inativa e edita um candidato.
- [x] Visualização, compartilhamento, lead e download continuam incrementando seus
  respectivos contadores.
