# SEC-008 — Checklist de autenticação administrativa

As configurações abaixo ficam no Supabase Dashboard e não devem ser tratadas
por migration SQL sem suporte oficial do ambiente. Registre os valores
confirmados, sem copiar segredos, tokens ou dados de usuários.

## Decisão de senha

O P.O. definiu senha mínima de **8 caracteres**. Essa decisão substitui a
recomendação inicial de 12 caracteres da especificação. A aplicação valida o
mesmo limite no formulário; o Supabase Auth deve aplicar a proteção definitiva.

## Supabase Auth

Em **Authentication → Sign In / Providers → Email** ou na seção equivalente
do projeto:

- [x] Tamanho mínimo da senha configurado como `8`.
- [x] Complexidade configurada no Supabase: minúsculas, maiúsculas, números e símbolos.
- [!] Proteção contra senhas vazadas indisponível no plano atual.
- [!] Limites server-side de duração/inatividade da sessão indisponíveis no plano atual; permanecem os limites client-side de 30 minutos/8 horas.
- [x] Indisponibilidades do plano registradas neste checklist.

Em **Authentication → URL Configuration**:

- [x] `Site URL` aponta exatamente para a origem HTTPS de produção.
- [x] Redirect URLs contêm somente as origens e rotas utilizadas.
- [x] Produção não possui mais curingas amplos; entradas com `*`/`**` foram removidas em 20/08/2026.
- [x] Localhost está restrito às rotas necessárias para desenvolvimento.
- [x] Convite passa pelo endpoint de verificação do Supabase e usa `redirect_to=https://nortus.app.br/auth/callback`.
- [x] Recuperação usa `redirect_to=https://nortus.app.br/admin/reset-password`.

O endereço `...supabase.co/auth/v1/verify?...&type=invite&redirect_to=...` é o
fluxo esperado: o Supabase verifica o token e depois redireciona para a rota da
aplicação. Nunca registre o valor real do parâmetro `token` neste documento.

## MFA de superadmin

- [x] Suporte a TOTP confirmado no plano/projeto.
- [x] Decisão definida: MFA será obrigatório para todos os superadmins.
- [x] Ao menos dois superadmins cadastrados e testados para reduzir risco de bloqueio.
- [x] Cadastro, desafio, recuperação e remoção de fator testados.
- [~] Exigência de sessão `AAL2` reportada como implementada e validada, mas duas auditorias locais em 20/08/2026 não encontraram checagem de `aal`, `getAuthenticatorAssuranceLevel`, desafio ou verificação MFA no código/migrations. Pendente localizar eventual implementação aplicada diretamente no banco.

## Testes da aplicação

- [x] Senha com 7 caracteres é recusada no reset e pelo Supabase.
- [x] Senha com 8 ou mais caracteres, contendo minúscula, maiúscula, número e símbolo, é aceita.
- [x] Senha com 8 ou mais caracteres sem uma das quatro categorias é recusada pelo Supabase.
- [x] Usuário autenticado sem papel de superadmin ou candidato vinculado é
      redirecionado para `/login?reason=unauthorized`.
- [x] Gestor vinculado continua acessando dashboard e colinha.
- [x] Superadmin continua acessando todas as áreas administrativas.
- [x] Logout em uma aba encerra o acesso nas demais abas abertas.
- [x] Remover o último vínculo de um gestor com sessão ativa bloqueia seu
      próximo acesso/recarregamento.
- [x] Excluir o usuário do Auth com sessão ativa bloqueia seu próximo
      acesso/recarregamento.
