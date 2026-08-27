-- Corrige "Database error creating new user" ao criar usuário via Auth (incl. admin.createUser).
-- O trigger handle_new_user insere em public.profiles, mas RLS só permitia INSERT com
-- is_admin() (profiles_insert_admin), o que impede a criação do perfil inicial.
-- Ref: https://supabase.com/docs/guides/auth/managing-user-data

-- Trigger alinhado ao guia atual (search_path explícito; nome não vazio para NOT NULL/UX)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, email)
  values (
    new.id,
    coalesce(
      nullif(trim(coalesce(new.raw_user_meta_data->>'name', '')), ''),
      'Usuário'
    ),
    coalesce(new.email, '')
  );
  return new;
end;
$$;

-- Signup pelo cliente: só a própria linha (auth.uid = id)
drop policy if exists "profiles_insert_self" on public.profiles;
create policy "profiles_insert_self"
  on public.profiles for insert
  to authenticated
  with check ((select auth.uid()) = id);

-- Papel interno usado pelo GoTrue em muitos projetos Supabase ao propagar o trigger
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'supabase_auth_admin') then
    execute 'drop policy if exists "profiles_insert_supabase_auth_admin" on public.profiles';
    execute $pol$
      create policy "profiles_insert_supabase_auth_admin"
      on public.profiles for insert
      to supabase_auth_admin
      with check (true)
    $pol$;
  end if;
end $$;

-- Inserções via PostgREST com service_role (scripts, manutenção)
drop policy if exists "profiles_insert_service_role" on public.profiles;
create policy "profiles_insert_service_role"
  on public.profiles for insert
  to service_role
  with check (true);
