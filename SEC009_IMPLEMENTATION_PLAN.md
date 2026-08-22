# SEC-009 — Cabeçalhos e endpoints

Implementação preparada em 21/08/2026. Esta etapa não exige migration nem
alteração no Supabase.

## Implementado

- cabeçalhos globais `X-Content-Type-Options`, `Referrer-Policy` e
  `Permissions-Policy`;
- CSP global em `Report-Only`, derivando a origem do Supabase da variável já
  existente e incluindo somente os recursos usados pela aplicação;
- proteção contra iframe efetiva por `frame-ancestors 'none'`;
- exceção de iframe por candidato e origem HTTPS exata através de
  `CANDIDATE_FRAME_ALLOWLIST`;
- `allowedDevOrigins` restrito ao IP exato `192.168.1.4` e somente em
  desenvolvimento;
- remoção de `/api/stats` e do número global/fallback artificial da landing;
- limite de 4 KB e validações server-side no contato;
- escape de HTML antes de gerar o e-mail;
- respostas sem cache e logs sem payload, telefone ou token;
- honeypot e Cloudflare Turnstile com validação obrigatória no servidor.

## Allowlist de iframe

Sem a variável, nenhuma página pode ser incorporada. A variável é um objeto
JSON em uma única linha, no qual cada chave é o slug e cada item da lista é uma
origem HTTPS exata:

```text
CANDIDATE_FRAME_ALLOWLIST={"pepa":["https://parceiro.com.br"],"berg40":["https://site-a.com.br","https://site-b.com.br"]}
```

Regras:

- não incluir caminho, query, fragmento ou barra final;
- `https://www.exemplo.com.br` e `https://exemplo.com.br` são origens
  diferentes e devem ser declaradas separadamente quando ambas forem usadas;
- somente `/candidato/<slug>` recebe a exceção;
- landing, admin, autenticação, APIs e candidatos não listados continuam
  bloqueados;
- a variável é processada no build, portanto qualquer alteração exige novo
  deploy;
- JSON, slug ou origem inválida interrompem o build em vez de ampliar acesso.

Não foi usado `X-Frame-Options`, pois ele não suporta com segurança uma
allowlist moderna com múltiplas origens. A diretiva CSP `frame-ancestors` é a
proteção efetiva e granular.

## Variáveis para produção

Configurar na Vercel, sem registrar os valores no repositório:

```text
NEXT_PUBLIC_TURNSTILE_SITE_KEY
TURNSTILE_SECRET_KEY
CANDIDATE_FRAME_ALLOWLIST
```

Crie o widget Turnstile autorizando `nortus.app.br`. A chave pública fica no
navegador; a chave secreta permanece somente no servidor. Se alguma chave do
Turnstile estiver ausente, o formulário falha de forma segura e não envia.

Em desenvolvimento, a aplicação usa exclusivamente o par oficial de chaves de
teste da Cloudflare. Essas chaves funcionam em `localhost` e no IP da rede
local, não são usadas quando `NODE_ENV=production` e não substituem as
variáveis reais da Vercel.

Use `{}` na allowlist enquanto nenhum parceiro estiver autorizado.

## Impactos

- `/api/stats` passa a responder `404` após o deploy;
- integrações antigas do contato sem Turnstile passam a ser recusadas;
- páginas deixam de funcionar em iframes, exceto os pares slug/origem
  explicitamente autorizados;
- a CSP de recursos está somente em observação e ainda não bloqueia recursos;
- `frame-ancestors` já está em modo efetivo, porque proteção contra clickjacking
  não deve aguardar a fase de observação.

## Validação local concluída

- lint direcionado: aprovado;
- `npm run test:run`: 27 testes aprovados;
- `npm run build`: aprovado;
- build não contém a rota `/api/stats`.

## Próximo passo

Configurar as variáveis, publicar e executar
`supabase/tests/SEC009_MANUAL_TESTS.md`. A SEC-009 só deve ser marcada como
concluída depois dessa validação de produção.
