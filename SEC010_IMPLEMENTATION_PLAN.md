# SEC-010 — Plano de execução

Preparado em 21/08/2026. Nenhuma alteração funcional foi aplicada nesta
preparação.

## Progresso

SEC010-A e a validação automatizada da SEC010-B foram concluídas em
21/08/2026:

- `xlsx` removido;
- `write-excel-file@4.1.1` instalado;
- exportação carregada dinamicamente e executada em Web Worker;
- dados controlados pelo usuário protegidos contra fórmulas;
- nome do arquivo sanitizado;
- estado de processamento e mensagem de erro adicionados;
- arquivo real com 5.000 registros gerado em teste;
- 30 testes aprovados;
- build aprovado;
- `npm audit` aprovado com zero vulnerabilidades.

A validação manual de uma exportação real com 5.000 registros foi aprovada no
Excel/LibreOffice em 21/08/2026, incluindo colunas e caracteres em português.

SEC010-C foi implementada em 21/08/2026:

- oito usos de `any` substituídos por tipos explícitos;
- logouts administrativos migrados para o roteador do App Router;
- imports e variáveis sem uso removidos;
- imagens dinâmicas justificadas pontualmente e imagem da landing migrada para
  `next/image`;
- carregamento da moldura no Canvas ajustado para consumir o estado mais
  recente sem iniciar requisições duplicadas;
- ESLint aprovado com zero erros e zero avisos;
- 30 testes e build aprovados.

O checklist funcional `supabase/tests/SEC010_LINT_MANUAL_TESTS.md` foi
integralmente aprovado em produção em 22/08/2026. A SEC010-C está concluída.

Os nove cenários reais de segurança previstos na SEC010-D foram aprovados em
22/08/2026. A fase está concluída sem necessidade de nova correção de RLS.

O workflow `.github/workflows/quality.yml` da SEC010-E foi criado em
22/08/2026 com permissão somente de leitura, valores sintéticos no build e as
etapas `npm ci`, lint, testes, build e auditoria. A validação local aprovou o
ESLint, 30 testes, o build de produção e `npm audit` com zero vulnerabilidades.
O workflow `Quality` foi aprovado no GitHub Actions em 22/08/2026 após o
`push`. A SEC010-E e a SEC-010 estão concluídas.

## Auditoria confirmada

### Dependências

`npm audit` encontrou uma vulnerabilidade direta de severidade alta em
`xlsx@0.18.5`:

- Prototype Pollution em versões anteriores a `0.19.3`;
- Regular Expression Denial of Service em versões anteriores a `0.20.2`;
- o registro npm não oferece correção para o pacote instalado.

O restante da árvore auditada não apresentou vulnerabilidade conhecida nessa
consulta: 1 alta, 0 crítica, 0 moderada e 0 baixa.

`xlsx` é usado somente para gerar o download da planilha em
`src/components/admin/LeadsTable.tsx`. A aplicação não precisa ler arquivos
Excel.

### Alternativa recomendada

Substituir `xlsx` por `write-excel-file@4.1.1`:

- API própria para navegador;
- geração em Web Worker para não bloquear a interface;
- suporte a `.xlsx`, largura de colunas e células de texto;
- uma dependência de runtime (`fflate`);
- aproximadamente 1,8 MB descompactado no registro npm;
- versão publicada e atualizada em 2026.

`exceljs@4.4.0` também gera arquivos no navegador, mas tem aproximadamente
21,8 MB descompactado, diversas dependências e recursos de leitura/edição que
este sistema não utiliza.

### Lint e testes

- suíte atual: 3 arquivos e 27 testes aprovados;
- pinch zoom já está aprovado e a especificação estava desatualizada;
- ESLint: 8 erros e 15 avisos;
- os 8 erros são usos de `any` em `admin/colinha`;
- não existe workflow de integração contínua no repositório.

## Tarefas propostas

### SEC010-A — Substituir `xlsx`

1. Remover `xlsx` e instalar `write-excel-file`.
2. Extrair a montagem da exportação para um utilitário tipado e testável.
3. Carregar o gerador dinamicamente somente ao clicar em exportar.
4. Manter nomes de colunas, larguras, filtro e nome do arquivo atuais.
5. Tratar nome, WhatsApp, candidato e data explicitamente como texto.
6. Neutralizar valores iniciados por `=`, `+`, `-` ou `@` para impedir
   injeção de fórmula em planilhas.
7. Exibir estado de processamento e erro no botão de exportação.

Impacto: muda apenas a implementação do download de Excel. Nenhum dado ou
tabela do Supabase será alterado. O download passa a ser assíncrono e pode
mostrar brevemente um indicador de processamento.

### SEC010-B — Testar a exportação

Criar testes que:

- montem 5.000 leads;
- incluam `João`, `Ângela`, `Cleyton D'Ávila`, cedilha e emojis;
- preservem WhatsApp como texto;
- incluam entradas semelhantes a fórmulas e comprovem sua neutralização;
- gerem um `.xlsx` não vazio dentro de um limite de desempenho razoável;
- validem manualmente a abertura no Excel e LibreOffice.

### SEC010-C — Corrigir lint

1. Criar interfaces para candidato, cargo, presidente, configuração e slots
   travados em `admin/colinha`.
2. Remover os oito usos de `any` sem mudar o comportamento da tela.
3. Trocar navegação interna por `router.replace` no logout.
4. Remover imports e variáveis não utilizados.
5. Analisar o efeito do `CanvasEditor` antes de corrigir dependências; não
   adicionar dependências cegamente porque isso pode criar recarga contínua da
   moldura.
6. Manter `<img>` apenas onde `next/image` não seja apropriado e justificar
   pontualmente; migrar os demais casos.

Meta: `npm run lint` sem erros. A exigência de zero avisos será aplicada ao
workflow somente depois de resolver os usos legítimos de imagens e Canvas.

### SEC010-D — Testes de segurança

Os testes de RLS não devem ser simulados em Vitest, pois isso daria uma falsa
garantia. Preparar dois níveis:

1. auditoria automatizada do catálogo para políticas, grants e funções;
2. testes reais via REST com usuários de teste `anon`, gestor A, gestor B e
   superadmin AAL2.

Os testes devem cobrir todos os nove cenários registrados na especificação.
Qualquer operação de escrita deverá usar candidatos de teste e restaurar os
valores. Nenhum JWT será salvo no repositório.

Não há migration prevista nesta tarefa. Caso um teste revele falha de RLS, a
correção será apresentada separadamente com query e impacto antes da aplicação.

### SEC010-E — Processo de entrega

Criar `.github/workflows/quality.yml`, executado em `push` e `pull_request`:

1. `npm ci`;
2. `npm run lint`;
3. `npm run test:run`;
4. `npm run build`;
5. `npm audit --audit-level=high`.

O workflow terá somente permissão de leitura. O build usará valores públicos
ou sintéticos estritamente necessários e nunca a `service_role`, o segredo do
Turnstile ou credenciais de usuários.

## Ordem recomendada

1. Substituir o pacote vulnerável.
2. Criar e validar os testes de 5.000 leads.
3. Corrigir lint e avisos relevantes.
4. Criar os testes reais de segurança.
5. Adicionar o workflow quando todos os comandos estiverem verdes.
6. Executar novo `npm audit`, build, testes e validação manual.

## Critérios de aceite

- `xlsx` ausente de `package.json`, lockfile e bundle;
- `npm audit` sem vulnerabilidades altas ou críticas;
- arquivo com 5.000 leads abre corretamente e preserva português;
- valores controlados por usuário não executam fórmulas;
- `npm run lint` sem erros;
- todos os testes existentes e novos aprovados;
- cenários reais de RLS validados;
- workflow aprovado em uma execução de `push` ou `pull_request`;
- build de produção aprovado.
