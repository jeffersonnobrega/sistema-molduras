# SEC-010 — Validação funcional da fase C

As alterações desta fase foram de tipagem, navegação, imagens e sincronização
do Canvas. Execute em uma campanha de teste.

## Administração

- [x] Superadmin abre `/admin/dashboard` normalmente.
- [x] Gestor abre somente seus candidatos normalmente.
- [x] `Sair do Sistema` no dashboard encerra a sessão e abre `/login`.
- [x] `Sair do Sistema` em Configurar Colinha encerra a sessão e abre `/login`.
- [x] Configurar Colinha carrega candidatos, cargos, presidente e slots.
- [x] Travar/destravar slot e salvar continua funcionando.
- [x] Enviar, trocar e remover foto do governador continua funcionando.
- [x] Prévias de foto de perfil e molduras aparecem após upload/troca.

## Página pública e Canvas

- [x] Imagem demonstrativa da landing aparece corretamente.
- [x] Página de candidato carrega a moldura inicial.
- [x] Trocar entre Stories, Feed e Perfil atualiza a moldura correta.
- [x] Trocar entre conjuntos de molduras não mantém a imagem anterior.
- [x] Upload de foto, zoom e arraste continuam atualizando o Canvas.
- [x] Moldura permanece correta quando o usuário altera zoom durante a carga.
- [x] Download e compartilhamento continuam funcionando.

## Resultado

- [x] Validação funcional aprovada e SEC010-C concluída em 22/08/2026.
