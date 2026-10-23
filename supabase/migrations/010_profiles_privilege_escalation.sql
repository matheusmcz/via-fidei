-- Impede que usuários autenticados alterem o próprio papel ou status.
-- A política profiles_update_own (008) libera UPDATE na própria linha sem
-- restrição de coluna; sem este trigger, um editor podia virar admin via API.
--
-- SECURITY INVOKER (padrão) é obrigatório: dentro de uma função SECURITY
-- DEFINER, current_user seria o dono da função e não a role de quem chamou.
-- Chamadas com service role ou pelo SQL Editor não usam a role
-- 'authenticated' e continuam podendo alterar esses campos.
create or replace function public.prevent_profile_privilege_escalation()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_user = 'authenticated'
     and (new.role is distinct from old.role
          or new.is_active is distinct from old.is_active)
     and not public.is_admin() then
    raise exception 'Apenas administradores podem alterar papel ou status do perfil'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_prevent_privilege_escalation on public.profiles;
create trigger profiles_prevent_privilege_escalation
  before update on public.profiles
  for each row execute function public.prevent_profile_privilege_escalation();

-- O perfil é criado pelo trigger handle_new_user(), que pertence ao dono da
-- tabela e não passa pelo RLS. Estas políticas da 009 eram desnecessárias, e
-- profiles_insert_self deixava um usuário sem perfil inserir a própria linha
-- com qualquer papel.
drop policy if exists "profiles_insert_self" on public.profiles;
drop policy if exists "profiles_insert_service_role" on public.profiles;
drop policy if exists "profiles_insert_supabase_auth_admin" on public.profiles;
