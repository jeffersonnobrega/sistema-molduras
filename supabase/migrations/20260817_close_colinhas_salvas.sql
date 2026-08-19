begin;

alter table public.colinhas_salvas enable row level security;

-- Remove a política pública ampla encontrada no ambiente atual.
drop policy if exists
  "Permitir inserção e leitura pública da colinha"
on public.colinhas_salvas;

-- Remove políticas de tentativas anteriores, caso existam em outro ambiente.
drop policy if exists
  "Publico pode inserir colinha"
on public.colinhas_salvas;

drop policy if exists
  "Admins podem ler colinhas"
on public.colinhas_salvas;

drop policy if exists
  "Superadmin visualiza colinhas salvas"
on public.colinhas_salvas;

-- Visitantes ficam sem acesso e usuários autenticados recebem apenas SELECT.
-- A política RLS abaixo limita esse SELECT aos superadministradores.
revoke all privileges
on table public.colinhas_salvas
from public, anon, authenticated;

grant select
on table public.colinhas_salvas
to authenticated;

-- Mantém o acesso necessário para futuras operações server-side.
grant select, insert, update, delete
on table public.colinhas_salvas
to service_role;

create policy "Superadmin visualiza colinhas salvas"
on public.colinhas_salvas
for select
to authenticated
using (
  public.is_admin((select auth.uid()))
);

commit;

notify pgrst, 'reload schema';
