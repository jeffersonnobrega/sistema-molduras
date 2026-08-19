# SEC-006 — Validação manual do Storage

Execute a migration `20260819_limit_molduras_storage.sql` como uma única
instrução no SQL Editor antes destes testes.

## Configuração do bucket

```sql
select id, public, file_size_limit, allowed_mime_types
from storage.buckets
where id = 'molduras';
```

Resultado esperado: `public = true`, `file_size_limit = 10485760` e somente
`image/png`, `image/jpeg` e `image/webp` em `allowed_mime_types`.

Validado em 19/08/2026.

## Matriz de upload

- [x] Gestor envia PNG, JPG e WEBP menores ou iguais a 10 MB na pasta do candidato vinculado.
- [x] Gestor recebe recusa ao enviar na pasta de outro candidato (HTTP 403).
- [x] Gestor recebe recusa ao enviar arquivo acima de 10 MB.
- [x] Gestor recebe recusa ao enviar GIF, SVG, PDF ou outro MIME não permitido.
- [x] Gestor recebe recusa ao usar extensão fora de PNG, JPG, JPEG e WEBP.
- [x] Superadmin envia imagens válidas na pasta de qualquer candidato existente.
- [x] As URLs públicas existentes e as novas continuam carregando sem autenticação.
- [x] Substituir/remover uma moldura pelo modal e salvar remove o objeto antigo.
- [x] Os caminhos novos mantêm o prefixo `{slug}/`.

### Como concluir os itens pendentes

**Pasta de outro candidato:** a ausência dessa opção na interface é esperada,
mas não testa a proteção do banco. Esse item exige uma requisição manual
autenticada como gestor, alterando o primeiro segmento do caminho para o slug de
um candidato não vinculado. O resultado esperado é HTTP 403 ou erro de RLS.

**Leitura pública:** copie a URL de uma moldura exibida no painel, encerre a
sessão administrativa e abra a URL em uma janela anônima. A imagem deve abrir
diretamente, sem redirecionamento ou autenticação.

**Prefixo dos caminhos:** execute a consulta abaixo e compare `primeira_pasta`
com `slug`. Todas as linhas devem retornar `caminho_valido = true`.

```sql
select o.name,
       (storage.foldername(o.name))[1] as primeira_pasta,
       c.slug,
       ((storage.foldername(o.name))[1] = c.slug) as caminho_valido
from storage.objects o
left join public.candidatos c
  on c.slug = (storage.foldername(o.name))[1]
where o.bucket_id = 'molduras'
order by o.created_at desc;
```

Confirme as políticas finais:

```sql
select policyname, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'storage'
  and tablename = 'objects'
order by policyname;
```

As quatro políticas finais foram conferidas em 19/08/2026. As escritas exigem
o bucket `molduras`, extensão permitida e `can_manage_candidato` para o slug da
primeira pasta.

## Resultado

SEC-006 concluída e validada em 19/08/2026. O teste de pasta alheia retornou
HTTP 403, a leitura anônima carregou a imagem diretamente e todos os objetos
consultados apresentaram `caminho_valido = true`.
