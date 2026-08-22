# SEC-009 — Validação manual

Execute depois de configurar as variáveis da Vercel e publicar a versão.
Não copie chaves, cookies, tokens ou dados pessoais para este documento.

## 1. Variáveis e deploy

- [ ] Widget Turnstile criado para `nortus.app.br`.
- [ ] `NEXT_PUBLIC_TURNSTILE_SITE_KEY` configurada em produção.
- [ ] `TURNSTILE_SECRET_KEY` configurada em produção.
- [ ] `CANDIDATE_FRAME_ALLOWLIST` configurada com `{}` ou JSON aprovado.
- [ ] Novo deploy executado depois da alteração das variáveis.

## 2. Cabeçalhos

```powershell
curl.exe -sS -I https://nortus.app.br
curl.exe -sS -I https://nortus.app.br/admin/dashboard
curl.exe -sS -I https://nortus.app.br/candidato/<SLUG_NAO_LIBERADO>
curl.exe -sS -I https://nortus.app.br/candidato/<SLUG_LIBERADO>
```

- [ ] Todas as respostas possuem `X-Content-Type-Options: nosniff`.
- [ ] Todas possuem `Referrer-Policy: strict-origin-when-cross-origin`.
- [ ] Todas possuem a `Permissions-Policy` configurada.
- [ ] Todas possuem `Content-Security-Policy-Report-Only`.
- [ ] Landing, admin e candidato não liberado possuem
  `Content-Security-Policy: frame-ancestors 'none'`.
- [ ] Candidato liberado possui apenas `'self'` e as origens aprovadas em
  `frame-ancestors`.
- [ ] Nenhum cabeçalho contém segredo ou chave do Turnstile.

## 3. Teste real de iframe

Em uma página da origem autorizada, testar:

```html
<iframe
  src="https://nortus.app.br/candidato/<SLUG_LIBERADO>"
  title="Campanha"
  style="width:100%;height:900px;border:0"
></iframe>
```

- [ ] O candidato liberado abre na origem autorizada.
- [ ] O mesmo candidato é bloqueado em uma origem não autorizada.
- [ ] Outro candidato não listado é bloqueado na origem autorizada.
- [ ] A landing e o admin não podem ser incorporados.

## 4. Endpoints

```powershell
curl.exe -sS -I https://nortus.app.br/api/stats
curl.exe -sS -X POST https://nortus.app.br/api/contato `
  -H "Content-Type: text/plain" `
  --data "teste"
curl.exe -sS -X POST https://nortus.app.br/api/contato `
  -H "Content-Type: application/json" `
  --data '{"nome":"Teste","whatsapp":"11999999999","cargo":"Outro","website":"","turnstile_token":"invalido","form_started_at":0}'
```

- [ ] `/api/stats` responde `404`.
- [ ] MIME diferente de JSON responde `415`.
- [ ] Corpo acima de 4 KB responde `413`.
- [ ] JSON ou campos inválidos respondem `400`.
- [ ] Token Turnstile inválido responde `403`.
- [ ] Respostas do contato possuem `Cache-Control: no-store`.

## 5. Fluxo legítimo e CSP

- [ ] Formulário mostra o Turnstile e envia uma solicitação válida.
- [ ] E-mail recebido contém nome, WhatsApp e cargo corretos.
- [ ] Texto com `<`, `>`, `&`, aspas ou apóstrofo aparece como texto, nunca
  como marcação executável.
- [ ] Nenhum dado pessoal ou token aparece nos logs da Vercel.
- [ ] Console do navegador foi verificado na landing, candidato e admin.
- [ ] Violações legítimas da CSP foram anotadas antes de considerar modo
  obrigatório.
- [ ] Login, MFA, dashboard, upload, canvas, colinha, compartilhamento,
  convite e recuperação continuam funcionando.

## Resultado

- [ ] Todos os testes aprovados e SEC-009 concluída.
