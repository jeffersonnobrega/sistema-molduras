do $sec006$
begin
  update storage.buckets
  set public = true,
      file_size_limit = 10485760,
      allowed_mime_types = array[
        'image/png',
        'image/jpeg',
        'image/webp'
      ]::text[]
  where id = 'molduras';

  if not found then
    raise exception 'Bucket molduras não encontrado.';
  end if;

  execute 'drop policy if exists "Gestores inserem molduras vinculadas" on storage.objects';
  execute 'drop policy if exists "Gestores atualizam molduras vinculadas" on storage.objects';

  execute $policy$
    create policy "Gestores inserem molduras vinculadas"
    on storage.objects for insert to authenticated
    with check (
      bucket_id = 'molduras'
      and lower(storage.extension(name)) in ('png', 'jpg', 'jpeg', 'webp')
      and exists (
        select 1
        from public.candidatos c
        where c.slug = (storage.foldername(name))[1]
          and public.can_manage_candidato(c.id)
      )
    )
  $policy$;

  execute $policy$
    create policy "Gestores atualizam molduras vinculadas"
    on storage.objects for update to authenticated
    using (
      bucket_id = 'molduras'
      and exists (
        select 1
        from public.candidatos c
        where c.slug = (storage.foldername(name))[1]
          and public.can_manage_candidato(c.id)
      )
    )
    with check (
      bucket_id = 'molduras'
      and lower(storage.extension(name)) in ('png', 'jpg', 'jpeg', 'webp')
      and exists (
        select 1
        from public.candidatos c
        where c.slug = (storage.foldername(name))[1]
          and public.can_manage_candidato(c.id)
      )
    )
  $policy$;

  perform pg_notify('pgrst', 'reload schema');
end;
$sec006$;
