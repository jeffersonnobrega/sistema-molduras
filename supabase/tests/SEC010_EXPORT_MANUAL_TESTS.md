# SEC-010 — Validação manual da exportação

Execute com um superadmin ou gestor vinculado. Não use leads reais para inserir
conteúdo de ataque; use uma campanha e registros de teste.

## Arquivo pequeno

- [x] Abrir a Base de Leads.
- [x] Aplicar busca e filtro por candidato.
- [x] Clicar em `Baixar Excel`.
- [x] O botão exibe `Gerando...` e impede clique duplicado.
- [x] O arquivo contém somente os registros filtrados.
- [x] O nome segue `leads-<candidato>-AAAA-MM-DD.xlsx`.
- [x] As colunas Nome, WhatsApp, Candidato e Data de Captura estão corretas.
- [x] Na visão de um candidato, a coluna Candidato não é incluída.

## Português e segurança

- [x] `João`, `Ângela`, `Conceição`, `D'Ávila`, `ação` e emojis são exibidos
  corretamente.
- [x] WhatsApp permanece como texto e não perde `+` ou zeros.
- [x] Um nome de teste iniciado por `=`, `+`, `-` ou `@` aparece como texto e
  não é executado como fórmula.

## Volume

- [x] Exportar 5.000 registros.
- [x] O navegador não congela durante a geração.
- [x] O arquivo abre sem reparo ou aviso no Microsoft Excel.
- [x] O arquivo abre sem reparo ou aviso no LibreOffice Calc, se disponível.
- [x] Conferir primeira, uma intermediária e última linha.

## Resultado

- [x] Validação manual aprovada em 21/08/2026.
