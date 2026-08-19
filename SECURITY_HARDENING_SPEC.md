# Especificação de Hardening de Segurança

Última revisão: 18/08/2026

Checklist oficial de segurança do Sistema Moldura. Atualize os marcadores conforme cada medida for implementada e validada.

## Legenda

- `[ ]` Pendente
- `[~]` Parcialmente concluído
- `[x]` Concluído e validado
- `[!]` Risco aceito temporariamente

## Regra para queries no Supabase

O SQL Editor utilizado neste projeto executa somente uma instrução por vez.
Operações que dependam de atomicidade devem ser fornecidas como uma única
execução, usando `DO $$ ... $$` quando necessário. Não separar `BEGIN`, comandos
mutáveis e `COMMIT`/`ROLLBACK` em execuções diferentes. Consultas exclusivamente
de leitura podem ser executadas separadamente.

## Estado confirmado

- A separação entre superadministradores e gestores de candidatos está ativa.
- `get_accessible_leads`, `can_manage_candidato` e `is_admin` usam `SECURITY DEFINER`, `search_path = ''` e não possuem execução para `anon` ou `PUBLIC`.
- O RPC de leads limita o gestor aos candidatos vinculados.
- A escrita de `colinha_config`, `colinha_travados` e Storage verifica o vínculo do candidato.
- O bucket `molduras` é público, sem limite de tamanho e sem lista de MIME types.
- `colinhas_salvas` foi fechada pela SEC-001; `anon` não possui privilégios e somente superadmin tem política de leitura.
- `leads` ainda aceita inserção pública com `WITH CHECK true`.
- Os RPCs de estatísticas não possuem mais execução para `PUBLIC`; os quatro incrementos permanecem concedidos explicitamente a `anon` até a SEC-011.
- A sessão administrativa possui encerramento client-side após 30 minutos de inatividade ou 8 horas de duração absoluta.
- Nenhum segredo real foi encontrado nos arquivos versionados.

## Progresso geral

- [x] Executar `npm audit fix`.
- [x] Next.js instalado em `16.3.1`, acima da correção mínima `16.2.11`.
- [x] Reduzir o audit de 6 vulnerabilidades altas para 1 (`xlsx`).
- [x] Reexecutar o build com Next.js `16.3.1` em 17/08/2026.
- [x] Resolver a falha do teste de pinch zoom em `tests/performance.test.ts`.
- [ ] Concluir SEC-001 a SEC-011.

---

## SEC-001 — Fechar `colinhas_salvas`

Prioridade: crítica.

Status: [x] Concluída e validada no Supabase em 17/08/2026.

Situação confirmada: `Permitir inserção e leitura pública da colinha` está aplicada ao role `public`, comando `ALL`, com `USING true`. A migração anterior que deveria removê-la não está ativa no banco consultado.

### Implementação

- [x] Criar migração emergencial específica: `supabase/migrations/20260817_close_colinhas_salvas.sql`.
- [x] Remover a política pública `ALL`.
- [x] Revogar `SELECT`, `INSERT`, `UPDATE` e `DELETE` de `anon`.
- [x] Não criar política pública de `UPDATE` ou `DELETE`.
- [x] Manter `INSERT` público desabilitado até SEC-011; o front atualmente envia `lead_id: undefined`.
- [x] Criar `SELECT` somente para superadmin com `is_admin(auth.uid())`.

### Aceite

- `anon` recebe `permission denied` em todas as operações.
- Superadmin consegue consultar os registros.
- Não existe política `ALL` nessa tabela.

---

## SEC-002 — Validar a atualização do Next.js

Prioridade: crítica.

Status: [x] Concluída e validada em 17/08/2026.

- [x] `npm audit fix` instalou `next@16.3.1` no `node_modules` e lockfile.
- [x] Fixar `next` em `16.3.1` no `package.json` e lockfile.
- [x] Alinhar `eslint-config-next` em `16.3.1` com a versão do Next.js.
- [x] Executar `npm run build` e confirmar `Next.js 16.3.1` no log.
- [x] Executar `npm run test:run`: 20 testes aprovados em 17/08/2026.
- [x] Executar `npm audit --omit=dev`: nenhum advisory do Next.js; resta somente `xlsx`, tratado na SEC-010.
- [x] Corrigir o aviso de múltiplos lockfiles definindo `turbopack.root`, sem remover arquivos da pasta pai.
- [x] Migrar `src/middleware.ts` para `src/proxy.ts`, usando a convenção do Next.js 16.

### Aceite

- [x] Build de produção concluído com `16.3.1`.
- [x] Nenhum advisory do Next.js no audit.
- [x] Acesso anônimo a `/admin/dashboard` redireciona para `/login?next=%2Fadmin%2Fdashboard`.
- [x] Rota pública `/login` responde normalmente.
- [x] Login autenticado, convite e reset de senha validados.
- [x] Logout manual e logout após 30 minutos de inatividade/8 horas de duração absoluta validados.

---

## SEC-003 — Restringir funções PostgreSQL

Prioridade: crítica.

Status: [x] Concluída e validada no Supabase em 18/08/2026.

No ACL, `=X/postgres` significa execução concedida a `PUBLIC`.

### Já adequadas

- [x] `can_manage_candidato`
- [x] `is_admin`
- [x] `get_accessible_leads`

### Corrigir

- [x] `get_leads_count`
- [x] `increment_colinha_download`
- [x] `increment_leads_count`
- [x] `increment_shares_count`
- [x] `increment_views_count`
- [x] `protect_candidato_system_fields`
- [x] `rls_auto_enable`

### Implementação

- [x] Revisar `pg_get_functiondef` antes de substituir qualquer função.
- [x] Criar `supabase/migrations/20260818_restrict_postgres_functions.sql`.
- [x] Revogar `EXECUTE` de `PUBLIC` nas funções da aplicação.
- [x] Revogar execução de `anon` e `authenticated` em funções de trigger/manutenção.
- [x] Manter os incrementos concedidos explicitamente a `anon` apenas enquanto o front depender deles.
- [x] Definir `search_path = ''` e qualificar relações, como `public.candidatos`.
- [x] Validar candidato existente e ativo antes de incrementar.
- [x] Remover `get_leads_count` se estiver sem consumidor.
- [x] Verificar se `rls_auto_enable` é usada por event trigger e removê-la da Data API.
- [x] Revogar por padrão a execução pública de novas funções.

### Aceite

- [x] Nenhuma função sensível apresenta `=X` no ACL.
- [x] Funções administrativas recusam `anon`.
- [x] Contadores continuam funcionando até SEC-011.
- [x] O RPC de leads continua funcionando para ambos os tipos de administrador.

---

## SEC-004 — Endurecer temporariamente o INSERT de leads

Prioridade: alta. Mitigação até SEC-011.

Status: [x] Concluída e validada no Supabase e na aplicação em 18/08/2026.

Situação atual: `Leads: Apenas inserção pública` usa `WITH CHECK true`.

- [x] Auditar estrutura, constraints, políticas, privilégios e dados existentes.
- [x] Confirmar suporte a telefones internacionais no padrão E.164.
- [x] Criar `supabase/migrations/20260818_harden_leads_insert.sql` como uma única execução atômica.
- [x] Remover o endpoint placeholder `src/app/api/leads/route.ts`, que não participava do fluxo real.

- [x] Exigir candidato existente e ativo.
- [x] Exigir nome entre 3 e 120 caracteres.
- [x] Exigir WhatsApp internacional normalizado no padrão E.164, preservando números brasileiros e estrangeiros.
- [x] Exigir `lgpd_consent = true`.
- [x] Validar `consent_version`.
- [x] Adicionar constraints equivalentes diretamente na tabela.
- [x] Garantir `created_at` definido pelo banco.
- [x] Avaliar FK entre `leads.candidato_slug` e `candidatos.slug`.
- [x] Manter `SELECT`, `UPDATE` e `DELETE` indisponíveis para `anon`.

### Aceite

- [x] Slug inexistente, consentimento falso, telefone inválido e campos excessivos são recusados pelas políticas/constraints.
- [x] O fluxo legítimo continua registrando lead.
- [x] Visitante não lê, altera ou exclui leads.
- [!] Bots ainda poderão enviar dados válidos até CAPTCHA e rate limit em SEC-011.

---

## SEC-005 — Proteger campos sistêmicos do candidato

Prioridade: alta.

Status: [x] Concluída e validada no Supabase e na aplicação em 18/08/2026.

- [x] Impedir gestores de alterar `slug`.
- [x] Impedir gestores de alterar `ativo`.
- [x] Manter protegidos `id`, `user_id`, `created_at` e todos os contadores.
- [x] Definir futuros campos comerciais/plano como exclusivos do superadmin.
- [x] Manter editáveis nome, número, partido, cargo, cores, fotos, molduras e colinha.
- [x] Testar por requisição REST manual, não apenas pela interface.

### Implementação preparada

- [x] Criar `supabase/migrations/20260818_protect_candidate_system_fields.sql` como uma única execução atômica.
- [x] Aplicar a migration e validar função, trigger, `search_path` e ACL no catálogo.
- [x] Usar lista positiva de campos editáveis para proteger automaticamente futuras colunas.
- [x] Fazer tentativas indevidas retornarem erro PostgreSQL `42501`.
- [x] Preservar superadmin e incrementos executados pelas funções `SECURITY DEFINER`.
- [x] Remover `slug` e `ativo` do payload enviado por gestores no modal.
- [x] Exibir o controle de ativação somente para superadmin no modal.
- [x] Documentar validações em `supabase/tests/SEC005_MANUAL_TESTS.md`.

### Aceite

- Gestor não altera identidade, status, proprietário ou métricas.
- Superadmin continua podendo administrar esses campos.

---

## SEC-006 — Limitar o Storage

Prioridade: alta.

Situação atual: bucket público `molduras`, `file_size_limit = null`, `allowed_mime_types = null`.

- [ ] Manter o bucket público para servir ativos da campanha.
- [ ] Definir limite entre 10 MB e 15 MB após conferir o maior arquivo legítimo.
- [ ] Permitir somente `image/png`, `image/jpeg` e `image/webp`.
- [ ] Validar tamanho e tipo também no formulário administrativo.
- [ ] Impedir extensão não suportada.
- [ ] Avaliar limpeza de arquivos substituídos.
- [ ] Preservar o formato de caminho `{slug}/arquivo`.

### Aceite

- Upload fora da pasta vinculada, acima do limite ou com MIME proibido é recusado.
- Molduras públicas continuam carregando.

---

## SEC-007 — Reduzir a superfície de leitura

Prioridade: média-alta.

### Leads

- [ ] Revogar `SELECT` direto de `authenticated` em `public.leads` após validar o RPC.
- [ ] Remover a política direta de leitura de leads.
- [ ] Manter apenas `EXECUTE` em `get_accessible_leads`.
- [ ] Validar dashboard e exportação para superadmin e gestor.

### Candidatos

- [ ] Parar de usar `select('*')` na página pública.
- [ ] Criar view/RPC público somente com os campos necessários.
- [ ] Não expor `user_id` ou campos administrativos a `anon`.
- [ ] Usar `security_invoker = true` em views que devam obedecer à RLS.

### Outras leituras públicas

- [ ] Confirmar ausência de PII/segredos em `cargos_politicos`, `presidenciados`, `colinha_config` e `colinha_travados`.
- [ ] Substituir grants ao role `public` por grants explícitos quando apropriado.

---

## SEC-008 — Fortalecer autenticação administrativa

Prioridade: média-alta.

- [x] Logout client-side após 30 minutos de inatividade.
- [x] Duração absoluta client-side de 8 horas.
- [ ] Configurar limites também no Supabase Auth, se disponíveis no plano.
- [ ] Exigir senha de no mínimo 12 caracteres.
- [ ] Ativar proteção contra senhas vazadas.
- [ ] Habilitar MFA para superadmins.
- [ ] Revisar `Site URL` e Redirect URLs exatas, sem curingas amplos.
- [ ] Revalidar autorização nas páginas/rotas sensíveis, sem depender apenas do proxy.
- [ ] Testar logout em múltiplas abas e remoção de usuário com sessão ativa.

---

## SEC-009 — Cabeçalhos e endpoints existentes

Prioridade: média.

### Cabeçalhos

- [ ] `Strict-Transport-Security` em produção.
- [ ] `X-Content-Type-Options: nosniff`.
- [ ] `Referrer-Policy`.
- [ ] `Permissions-Policy`.
- [ ] Proteção contra framing.
- [ ] CSP inicialmente em `Report-Only`, incluindo apenas origens necessárias.

### Endpoints

- [ ] Remover/substituir `/api/leads`, que apenas imprime PII no log.
- [ ] Remover `/api/stats`, que consulta `leads_candidatos`.
- [ ] Remover logs com PII, payload ou tokens.
- [ ] Validar tamanhos e formatos em `/api/contato`.
- [ ] Escapar campos inseridos no HTML do e-mail.
- [ ] Adicionar proteção contra spam ao contato.
- [ ] Corrigir/remover `allowedDevOrigins` da configuração de produção.

---

## SEC-010 — Dependências, lint, testes e auditoria

Prioridade: média.

- [x] Corrigir vulnerabilidades transitivas do Next.js, NanoID, PostCSS, Sharp e WS.
- [ ] Substituir `xlsx@0.18.5`; o audit ainda aponta Prototype Pollution e ReDoS sem correção disponível nesse pacote npm.
- [ ] Validar a alternativa exportando 5.000 leads e caracteres em português.
- [ ] Corrigir os 16 erros atuais do ESLint.
- [ ] Corrigir o teste de pinch zoom: esperado `3`, recebido aproximadamente `2.18`.
- [ ] Adicionar build, lint, testes e audit ao processo de entrega.

### Testes de segurança a criar

- [ ] `anon` não lê leads.
- [ ] Gestor A não acessa candidato B.
- [ ] Gestor não altera `slug`, `ativo`, proprietário ou métricas.
- [ ] Gestor não cria/exclui candidatos.
- [ ] Superadmin acessa todos os candidatos e leads.
- [ ] RPC de leads recusa usuário sem vínculo.
- [ ] Funções administrativas recusam `anon`.
- [ ] Storage recusa upload em pasta alheia.
- [ ] Reaplicar migrations não reabre políticas antigas.

---

## SEC-011 — Criar API pública de leads e eventos

Prioridade de segurança: alta. Ordem de implementação: última por decisão do projeto.

### Endpoints previstos

- [ ] Registrar lead.
- [ ] Incrementar visualização.
- [ ] Incrementar compartilhamento.
- [ ] Incrementar download de colinha.

### Requisitos

- [ ] CAPTCHA, preferencialmente Cloudflare Turnstile.
- [ ] Rate limit persistente compatível com serverless.
- [ ] Validação server-side e limite do corpo.
- [ ] Verificação de candidato existente e ativo.
- [ ] Operação atômica para lead e contador.
- [ ] Idempotência contra repetição da mesma requisição.
- [ ] Não confiar em `x-forwarded-for` fora da infraestrutura conhecida.
- [ ] Documentar finalidade/retenção se houver IP ou hash de IP, por LGPD.
- [ ] Não registrar PII ou tokens em logs.
- [ ] Manter service role somente no servidor.

### Fechamento do banco após a API

- [ ] Revogar `INSERT` de `anon` em `leads` e `colinhas_salvas`.
- [ ] Revogar execução de `anon` nos RPCs de incremento.
- [ ] Conceder escritas somente ao backend confiável.
- [ ] Atualizar `CanvasEditor`, `ViewCounter` e `CandidatoColinha` para usar a API.

### Aceite

- Chamadas diretas ao Supabase para criar lead ou incrementar contador falham.
- O fluxo legítimo funciona somente pela API.
- Repetições automatizadas são bloqueadas/desafiadas e não duplicam dados.

---

## Matriz final esperada

| Recurso | Visitante | Gestor | Superadmin | Backend |
| --- | --- | --- | --- | --- |
| Candidato | Ler campos públicos | Editar vinculado | Total | Total |
| Leads | Criar via API | Ler vinculados via RPC | Ler todos via RPC | Criar |
| Colinha config/travados | Ler | Gerenciar vinculado | Total | Total |
| Colinhas salvas | Criar via API | Sem acesso até regra explícita | Ler | Gerenciar |
| Storage | Ler | Gerenciar pasta vinculada | Gerenciar | Total |
| Usuários administrativos | Sem acesso | Sem acesso | Gerenciar | Total |
| Métricas | Incrementar via API | Visualizar | Visualizar | Incrementar |

## Consultas recorrentes

Executar após migrations de segurança:

```sql
select schemaname, tablename, policyname, roles, cmd, qual, with_check
from pg_policies
where schemaname in ('public', 'storage')
order by schemaname, tablename, policyname;

select n.nspname as schema_name,
       p.proname as function_name,
       p.prosecdef as security_definer,
       p.proacl as permissions,
       p.proconfig as configuration
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
order by p.proname;

select id, public, file_size_limit, allowed_mime_types
from storage.buckets;
```

## Ordem resumida

1. SEC-001 — `colinhas_salvas`.
2. SEC-002 — Next.js.
3. SEC-003 — Funções.
4. SEC-004 — Leads temporário.
5. SEC-005 — Campos de candidato.
6. SEC-006 — Storage.
7. SEC-007 — Leituras.
8. SEC-008 — Auth.
9. SEC-009 — Cabeçalhos/endpoints.
10. SEC-010 — Dependências/testes.
11. SEC-011 — API e fechamento definitivo das escritas públicas.
