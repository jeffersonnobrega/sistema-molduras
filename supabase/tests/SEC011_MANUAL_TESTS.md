# SEC-011 — Rollout e validação manual

As duas migrations são intencionalmente separadas para evitar indisponibilidade.
Cada arquivo contém um único bloco compatível com o SQL Editor utilizado no
projeto.

## 1. Preparação da Vercel

Crie uma chave aleatória de no mínimo 32 bytes e cadastre somente em
`Production`:

```text
PUBLIC_API_HASH_SECRET=<valor aleatório>
```

- marque como `Sensitive`;
- não use prefixo `NEXT_PUBLIC_`;
- não copie a chave para Git, logs ou documentos;
- mantenha as chaves existentes do Turnstile.

## 2. Fundação sem quebra

Status: [x] Aplicada e validada em 23/08/2026.

Aplicar:

```text
supabase/migrations/20260822_sec011_public_api_foundation.sql
```

Impacto: cria duas tabelas privadas, duas funções server-side, um helper
privado e a coluna anulável `leads.request_id`. O frontend atual continua
funcionando porque os acessos públicos antigos ainda não são revogados.

Executar depois:

```text
supabase/tests/SEC011_FOUNDATION_VALIDATION.sql
```

Esperado:

- tabelas e coluna presentes;
- `service_role` executa as duas funções novas;
- `anon` não executa as funções novas;
- os dois campos `legacy_*` ainda retornam `true` nesta fase.

Resultado confirmado: tabelas e coluna presentes; novas funções executáveis
somente por `service_role`; acessos legados ainda disponíveis para preservar a
versão atualmente publicada.

## 3. Deploy da aplicação

Fazer commit, push e aguardar:

- workflow `Quality` verde;
- deployment de produção concluído;
- `PUBLIC_API_HASH_SECRET` presente no deployment.

## 4. Teste funcional antes do fechamento

Em uma campanha ativa de teste:

- abrir a página e confirmar incremento único de visualização por aba;
- gerar foto, preencher lead, resolver Turnstile e liberar download;
- confirmar um lead novo e apenas um incremento de `stats_leads_count`;
- compartilhar a imagem e confirmar um incremento de compartilhamento;
- baixar a colinha e confirmar um incremento de download;
- repetir a mesma requisição no navegador/Postman com o mesmo `request_id` e
  confirmar que a métrica ou lead não duplica;
- enviar origem diferente e confirmar HTTP `403`;
- enviar candidato inativo e confirmar HTTP `404`;
- confirmar que nenhum log contém nome, telefone, IP, token ou segredo.

## 5. Fechamento dos acessos antigos

Somente depois dos testes acima, aplicar:

```text
supabase/migrations/20260822_sec011_close_direct_writes.sql
```

Impacto: visitantes e usuários autenticados deixam de inserir diretamente em
`leads` e deixam de executar os quatro RPCs antigos. A partir deste ponto, uma
versão antiga do frontend não consegue registrar leads ou métricas.

Executar depois:

```text
supabase/tests/SEC011_CLOSURE_VALIDATION.sql
```

Esperado:

- todos os campos de acesso `anon` e `authenticated` retornam `false`;
- `service_create_lead` e `service_record_event` retornam `true`.

## 6. Regressão final

- gestor continua vendo somente leads vinculados;
- superadmin continua vendo todos os leads;
- exportação de leads continua funcionando;
- foto, compartilhamento e colinha funcionam no iPhone, Android e desktop;
- contato da landing continua validando Turnstile;
- workflow `Quality` permanece verde.
