# SEC-011 — API pública de leads e eventos

Preparado em 22/08/2026. A API será hospedada como Route Handlers do Next.js
no mesmo projeto da Vercel. Não haverá nova hospedagem.

## Arquitetura aprovada

- `POST /api/public/leads`: valida Turnstile, dados, candidato, rate limit e
  idempotência; cria o lead e incrementa o contador na mesma transação.
- `POST /api/public/events`: recebe `view`, `share` ou `colinha_download` sem
  desafio visual; aplica candidato ativo, rate limit persistente e
  idempotência antes de incrementar a métrica.
- o navegador deixa de inserir leads e executar RPCs públicos diretamente;
- a `SUPABASE_SERVICE_ROLE_KEY` permanece somente no servidor da Vercel;
- o PostgreSQL mantém o estado durável necessário em ambiente serverless.

## Controles

- corpo JSON limitado antes do parse;
- tipos e lista positiva de campos;
- nome, telefone E.164, consentimento e slug validados novamente no servidor;
- Turnstile com ação `lead`, hostname esperado e token de uso único;
- `Origin` validada como defesa adicional, sem ser tratada como autenticação;
- IP obtido de `x-vercel-forwarded-for` somente na Vercel;
- desenvolvimento aceita apenas o endereço da requisição local;
- IP nunca persistido em claro: HMAC-SHA-256 com `PUBLIC_API_HASH_SECRET`;
- nenhum nome, telefone, IP, token ou segredo registrado em logs;
- respostas `no-store` e mensagens públicas genéricas;
- UUID de idempotência criado no cliente e reaproveitado em tentativas da
  mesma operação;
- limpeza limitada e oportunística de registros expirados.

## Limites iniciais propostos

Os limites serão isolados por operação, candidato e hash do cliente:

| Operação          | Limite inicial | Janela |
| ----------------- | -------------- | ------ |
| Criar lead        | 5              | 15 min |
| Visualização      | 30             | 60 min |
| Compartilhamento  | 10             | 15 min |
| Download colinha  | 10             | 15 min |

O rate limit serve para contenção de abuso e custo. Turnstile continua sendo a
proteção principal da coleta de dados pessoais.

## Banco previsto

A migration será entregue em um único bloco executável no SQL Editor:

1. criar tabela privada de rate limit com expiração;
2. criar tabela privada de idempotência de eventos;
3. adicionar chave de idempotência aos leads, preservando registros atuais;
4. criar uma função atômica de lead e uma função atômica de evento;
5. conceder execução dessas funções somente à `service_role`;
6. revogar `INSERT` público em leads;
7. revogar execução pública dos quatro RPCs antigos;
8. manter leitura segmentada de leads e demais acessos administrativos;
9. manter `colinhas_salvas` fechada conforme a SEC-001.

As funções antigas poderão ser mantidas temporariamente para rollback, mas sem
permissão de execução para `anon` ou `authenticated`.

## LGPD

O rate limit armazenará somente um HMAC para uso de segurança e prevenção de
abuso, sem IP em claro. O registro expira junto com sua janela e é removido
oportunisticamente em lotes limitados. A tabela de idempotência de eventos não
armazena o HMAC e expira após 24 horas. Essa finalidade deverá constar na
documentação interna de segurança; os dados não serão usados para publicidade
ou perfil eleitoral.

## Ordem de execução

1. executar `supabase/tests/SEC011_DATABASE_AUDIT.sql` e revisar o resultado;
2. implementar utilitários e Route Handlers;
3. integrar Turnstile ao formulário de lead e migrar eventos do frontend;
4. criar testes automatizados;
5. revisar as migrations e seus impactos com o responsável;
6. aplicar a fundação sem revogar o fluxo antigo;
7. cadastrar `PUBLIC_API_HASH_SECRET` na Vercel e fazer deploy;
8. validar a API legítima;
9. aplicar a migration de fechamento dos acessos antigos;
10. validar o bloqueio direto ao Supabase e executar o workflow `Quality`.

## Critérios de aceite

- lead e contador são gravados atomicamente uma única vez;
- repetição da mesma chave não duplica lead ou métrica;
- candidato inexistente ou inativo é recusado;
- excesso de chamadas retorna HTTP `429`;
- Turnstile inválido recusa lead;
- chamadas diretas públicas ao Supabase são recusadas;
- gestor e superadmin continuam lendo somente os leads autorizados;
- nenhuma PII, token ou IP aparece nos logs;
- lint, testes, build e auditoria aprovados.
