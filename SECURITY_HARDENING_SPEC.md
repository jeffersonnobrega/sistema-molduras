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

Status: [x] Concluída e validada no Supabase e na aplicação em 19/08/2026.

Situação atual: bucket público `molduras`, limite de 10 MB e MIME types restritos a PNG, JPEG e WEBP.

- [x] Preparar bucket público para servir ativos da campanha.
- [x] Definir limite de 10 MB após conferir o maior arquivo legítimo versionado (aproximadamente 218 KB).
- [x] Permitir somente `image/png`, `image/jpeg` e `image/webp`.
- [x] Validar tamanho e tipo também no formulário administrativo.
- [x] Impedir extensão não suportada no formulário e nas políticas de escrita.
- [x] Avaliar limpeza de arquivos substituídos; o modal remove os objetos antigos somente após salvar os novos vínculos.
- [x] Preservar o formato de caminho `{slug}/arquivo`.
- [x] Aplicar `supabase/migrations/20260819_limit_molduras_storage.sql`.
- [x] Executar `supabase/tests/SEC006_MANUAL_TESTS.md` e validar o aceite.

### Aceite

- [x] Upload fora da pasta vinculada, acima do limite ou com MIME proibido é recusado.
- [x] Molduras públicas continuam carregando.

---

## SEC-007 — Reduzir a superfície de leitura

Prioridade: média-alta.

Status: [x] Concluída e validada no Supabase e na aplicação em 19/08/2026.

- [x] Mapear consumidores de leitura no código.
- [x] Confirmar que dashboard e exportação usam `get_accessible_leads`.
- [x] Preparar `supabase/tests/SEC007_AUDIT.md` com consultas somente de leitura.
- [x] Auditar políticas, grants, colunas públicas e definição do RPC no banco.
- [x] Preparar migration e alterações da aplicação com base no inventário confirmado.
- [x] Criar `supabase/migrations/20260819_reduce_public_read_surface.sql`.
- [x] Criar `supabase/tests/SEC007_MANUAL_TESTS.md`.
- [x] Aplicar a migration e validar o catálogo final.
- [x] Concluir os testes manuais.

### Leads

- [x] Revogar `SELECT` direto de `authenticated` em `public.leads` após validar o RPC.
- [x] Remover a política direta de leitura de leads.
- [x] Manter apenas `EXECUTE` em `get_accessible_leads`.
- [x] Validar dashboard e exportação para superadmin e gestor.

### Candidatos

- [x] Parar de usar `select('*')` na página pública.
- [x] Criar RPC público somente com os campos necessários.
- [x] Não expor `user_id` ou campos administrativos a `anon`.
- [x] Não criar view; o RPC usa `SECURITY DEFINER`, `search_path = ''` e ACL explícita.

### Outras leituras públicas

- [x] Confirmar e limitar os campos públicos de `cargos_politicos`, `presidenciados`, `colinha_config` e `colinha_travados`.
- [x] Substituir grants ao role `public` por grants explícitos quando apropriado.

---

## SEC-008 — Fortalecer autenticação administrativa

Prioridade: média-alta.

Status: [x] Concluída e validada no Supabase e na aplicação em 21/08/2026.

Decisão do P.O.: exigir senha de no mínimo 8 caracteres, em substituição aos 12 caracteres inicialmente propostos.

- [x] Logout client-side após 30 minutos de inatividade.
- [x] Duração absoluta client-side de 8 horas.
- [!] Limites server-side de sessão indisponíveis no plano atual; mitigação client-side mantida.
- [x] Exigir senha de no mínimo 8 caracteres conforme decisão do P.O.; Supabase configurado também com minúsculas, maiúsculas, números e símbolos.
- [!] Proteção contra senhas vazadas indisponível no plano atual.
- [x] TOTP e enforcement AAL2 ativos em produção; catálogo, desafio MFA, guard, APIs, permissões e limites temporais da sessão validados.
- [x] `Site URL`, rotas de produção e localhost conferidos; curingas amplos removidos.
- [x] Revalidar autorização nas páginas/rotas sensíveis, sem depender apenas do proxy.
- [x] Testar logout em múltiplas abas e remoção de usuário com sessão ativa.
- [x] Preparar `supabase/tests/SEC008_AUTH_CHECKLIST.md`.

---

## SEC-009 — Cabeçalhos e endpoints existentes

Prioridade: média.

Status: [~] Implementação local concluída em 21/08/2026. Build, lint direcionado e 27 testes aprovados. Aguarda configuração das variáveis, deploy e validação de produção conforme `supabase/tests/SEC009_MANUAL_TESTS.md`.

### Cabeçalhos

- [x] `Strict-Transport-Security: max-age=63072000` confirmado em produção pela Vercel em 21/08/2026.
- [x] `X-Content-Type-Options: nosniff` implementado; aguarda validação em produção.
- [x] `Referrer-Policy` implementada; aguarda validação em produção.
- [x] `Permissions-Policy` implementada; aguarda validação em produção.
- [x] Proteção contra framing implementada com exceções exatas por candidato e origem via `CANDIDATE_FRAME_ALLOWLIST`; aguarda validação em produção.
- [x] CSP de recursos implementada em `Report-Only`, incluindo apenas origens necessárias; aguarda inspeção em produção.

### Endpoints

- [x] Remover/substituir `/api/leads`, concluído na SEC-004.
- [x] Remover `/api/stats`, que consultava `leads_candidatos`.
- [x] Remover logs com PII, payload ou tokens.
- [x] Validar tamanhos e formatos em `/api/contato`.
- [x] Escapar campos inseridos no HTML do e-mail.
- [x] Adicionar honeypot e Cloudflare Turnstile ao contato; aguarda chaves e teste em produção.
- [x] Restringir `allowedDevOrigins` ao IP exato e somente em desenvolvimento.

---

## SEC-010 — Dependências, lint, testes e auditoria

Prioridade: média.

Status: [~] Auditoria inicial concluída e plano preparado em `SEC010_IMPLEMENTATION_PLAN.md` em 21/08/2026. Nenhuma dependência ou código funcional foi alterado nesta preparação.

- [x] Corrigir vulnerabilidades transitivas do Next.js, NanoID, PostCSS, Sharp e WS.
- [x] Substituir `xlsx@0.18.5` por `write-excel-file@4.1.1`; `npm audit` retornou zero vulnerabilidades em 21/08/2026.
- [x] Alternativa validada com 5.000 leads, caracteres em português e abertura correta no Excel/LibreOffice em 21/08/2026.
- [x] ESLint corrigido: zero erros e zero avisos em 21/08/2026; aguarda validação funcional curta da SEC010-C.
- [x] Teste de pinch zoom aprovado; a suíte completa passou com 27 testes em 21/08/2026.
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
