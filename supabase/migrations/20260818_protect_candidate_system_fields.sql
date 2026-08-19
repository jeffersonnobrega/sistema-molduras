do $sec005$
begin
  execute $function$
    create or replace function public.protect_candidato_system_fields()
    returns trigger
    language plpgsql
    security invoker
    set search_path = ''
    as $body$
    begin
      -- Os incrementos SECURITY DEFINER executam como postgres e precisam
      -- continuar atualizando exclusivamente os contadores.
      if current_user = 'postgres'
         or public.is_admin((select auth.uid()))
      then
        return new;
      end if;

      -- Lista positiva: gestores podem alterar somente os campos abaixo.
      -- Qualquer coluna adicionada futuramente fica protegida por padrão.
      if (
        to_jsonb(new) - array[
          'nome_urna',
          'partido',
          'numero_partido',
          'numero_candidato',
          'cargo_id',
          'cargo_travado_id',
          'cor_primaria',
          'cor_fundo',
          'cor_titulo',
          'cor_texto',
          'cor_texto_hero',
          'cor_botao',
          'url_foto_perfil',
          'url_moldura',
          'url_moldura_feed',
          'molduras',
          'config_colinha'
        ]::text[]
      ) is distinct from (
        to_jsonb(old) - array[
          'nome_urna',
          'partido',
          'numero_partido',
          'numero_candidato',
          'cargo_id',
          'cargo_travado_id',
          'cor_primaria',
          'cor_fundo',
          'cor_titulo',
          'cor_texto',
          'cor_texto_hero',
          'cor_botao',
          'url_foto_perfil',
          'url_moldura',
          'url_moldura_feed',
          'molduras',
          'config_colinha'
        ]::text[]
      ) then
        raise exception using
          errcode = '42501',
          message = 'Gestor não pode alterar campos sistêmicos do candidato.';
      end if;

      return new;
    end;
    $body$
  $function$;

  -- Garante que a função permaneça acessível somente pelo trigger.
  execute 'revoke execute on function public.protect_candidato_system_fields() from public, anon, authenticated, service_role';

  -- Recria o trigger de forma idempotente e elimina divergências entre ambientes.
  execute 'drop trigger if exists protect_candidato_system_fields on public.candidatos';
  execute $trigger$
    create trigger protect_candidato_system_fields
    before update on public.candidatos
    for each row
    execute function public.protect_candidato_system_fields()
  $trigger$;

  perform pg_notify('pgrst', 'reload schema');
end;
$sec005$;
