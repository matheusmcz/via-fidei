-- VF-082: perfil novo nasce sem permissão (menor privilégio).
--
-- Antes, todo usuário criado no Auth, por qualquer caminho (painel, Dashboard,
-- cadastro público, se habilitado), virava editor ATIVO por causa dos defaults
-- de profiles (role 'editor', is_active true). Agora o perfil nasce inativo:
-- is_admin() e is_editor_of() exigem is_active = true, então ele não acessa
-- nada até um admin (createEditor) ou o script bootstrap-users ativá-lo.
--
-- Não altera perfis existentes: não há UPDATE em profiles. Os usuários atuais
-- continuam com o papel e o status que têm hoje.
--
-- Idempotente: pode ser executada mais de uma vez no SQL Editor.

-- Default da coluna, para inserções que não informem is_active.
alter table public.profiles alter column is_active set default false;

-- Trigger de criação do perfil (mesma forma da 009), agora com papel e status
-- explícitos, sem depender dos defaults da tabela.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, email, role, is_active)
  values (
    new.id,
    coalesce(
      nullif(trim(coalesce(new.raw_user_meta_data->>'name', '')), ''),
      'Usuário'
    ),
    coalesce(new.email, ''),
    'editor',
    false
  );
  return new;
end;
$$;
