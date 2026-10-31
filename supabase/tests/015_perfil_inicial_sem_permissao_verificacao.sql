-- Roteiro de verificação da migration 015 (perfil novo nasce sem permissão, VF-082).
--
-- Como usar:
--   1. Aplique a 015 no SQL Editor do Supabase.
--   2. Cole este arquivo inteiro no SQL Editor e execute.
--   3. Sem erro: todas as verificações passaram. Com erro: a mensagem começa
--      com "FALHOU" (ou "PREPARAÇÃO") e diz qual verificação não bateu.
--
-- Nada é gravado: tudo roda dentro de begin … rollback, inclusive o usuário
-- de teste criado em auth.users. Se uma verificação falhar, a transação é
-- abortada e também não grava nada.
--
-- Usuários: por padrão o roteiro escolhe um admin ativo. Para usar um admin
-- específico, troque '<ADMIN_UUID>' pelo id dele em profiles.
--
-- Os blocos com "set local role authenticated" usam um JWT simulado em
-- request.jwt.claims ({"sub": "<uuid>", "role": "authenticated"}), como uma
-- chamada à API REST com o token do usuário.

begin;

-- ============================================
-- Preparação (role do SQL Editor, sem RLS)
-- ============================================
do $$
declare
  v_admin_in constant text := '<ADMIN_UUID>';
  v_admin uuid;
  v_new_user uuid := gen_random_uuid();
  v_church uuid;
  v_active_before integer;
begin
  if v_admin_in like '<%' then
    select id into v_admin from profiles
    where role = 'admin' and is_active
    order by created_at
    limit 1;
  else
    v_admin := v_admin_in::uuid;
  end if;

  if v_admin is null or not exists (
    select 1 from profiles where id = v_admin and role = 'admin' and is_active
  ) then
    raise exception 'PREPARAÇÃO: nenhum admin ativo encontrado (informe <ADMIN_UUID>)';
  end if;

  select id into v_church from churches order by name limit 1;
  if v_church is null then
    raise exception 'PREPARAÇÃO: nenhuma igreja cadastrada';
  end if;

  select count(*) into v_active_before from profiles where is_active;

  -- Usuário de teste: o trigger on_auth_user_created cria o perfil.
  begin
    insert into auth.users (id, aud, role, email, raw_user_meta_data, created_at, updated_at)
    values (
      v_new_user,
      'authenticated',
      'authenticated',
      'verificacao-015-' || v_new_user || '@example.com',
      '{"name": "Usuário de verificação 015"}'::jsonb,
      now(),
      now()
    );
  exception when insufficient_privilege then
    raise exception 'PREPARAÇÃO: sem permissão para inserir em auth.users; rode no SQL Editor (role postgres)';
  end;

  -- Vínculo com uma igreja, para conferir que o perfil inativo não ganha acesso
  -- mesmo vinculado.
  insert into editor_churches (editor_id, church_id) values (v_new_user, v_church);

  perform set_config('verif.admin_id', v_admin::text, true);
  perform set_config('verif.new_user_id', v_new_user::text, true);
  perform set_config('verif.church_id', v_church::text, true);
  perform set_config('verif.active_before', v_active_before::text, true);

  raise notice 'Admin %, usuário de teste %, igreja %', v_admin, v_new_user, v_church;
end $$;

-- 1. O default de profiles.is_active é false.
do $$
declare
  v_default text;
begin
  select column_default into v_default
  from information_schema.columns
  where table_schema = 'public' and table_name = 'profiles' and column_name = 'is_active';

  if v_default is distinct from 'false' then
    raise exception 'FALHOU 1: default de profiles.is_active é %, esperado false', v_default;
  end if;
  raise notice 'OK 1: profiles.is_active tem default false';
end $$;

-- 2. O perfil criado pelo trigger nasce como editor inativo, com o nome do metadata.
do $$
declare
  v_profile profiles%rowtype;
begin
  select * into v_profile from profiles
  where id = current_setting('verif.new_user_id')::uuid;

  if not found then
    raise exception 'FALHOU 2: o trigger handle_new_user não criou o perfil';
  end if;
  if v_profile.role <> 'editor' or v_profile.is_active then
    raise exception 'FALHOU 2: perfil novo nasceu com role % e is_active %, esperado editor e false',
      v_profile.role, v_profile.is_active;
  end if;
  if v_profile.name <> 'Usuário de verificação 015' then
    raise exception 'FALHOU 2: nome do perfil novo é %, esperado o do metadata', v_profile.name;
  end if;
  raise notice 'OK 2: perfil novo nasce como editor inativo';
end $$;

-- 3. Perfis existentes não mudaram: a criação do usuário de teste não ativou
--    nem desativou ninguém (a 015 não tem UPDATE em profiles).
do $$
declare
  v_active_now integer;
begin
  select count(*) into v_active_now from profiles where is_active;
  if v_active_now <> current_setting('verif.active_before')::integer then
    raise exception 'FALHOU 3: o número de perfis ativos mudou (% → %)',
      current_setting('verif.active_before'), v_active_now;
  end if;
  raise notice 'OK 3: perfis existentes continuam como estavam (% ativos)', v_active_now;
end $$;

-- ============================================
-- Usuário novo (inativo)
-- ============================================
select set_config(
  'request.jwt.claims',
  json_build_object('sub', current_setting('verif.new_user_id'), 'role', 'authenticated')::text,
  true
);
set local role authenticated;

-- 4. Perfil inativo não tem permissão, mesmo vinculado a uma igreja.
do $$
declare
  v_church uuid := current_setting('verif.church_id')::uuid;
  v_rows integer;
begin
  if is_admin() then
    raise exception 'FALHOU 4: perfil inativo passou em is_admin()';
  end if;
  if is_editor_of(v_church) then
    raise exception 'FALHOU 4: perfil inativo passou em is_editor_of() da igreja vinculada';
  end if;

  update churches set phone = '(82) 0000-0015' where id = v_church;
  get diagnostics v_rows = row_count;
  if v_rows <> 0 then
    raise exception 'FALHOU 4: perfil inativo alterou a igreja vinculada';
  end if;
  raise notice 'OK 4: perfil inativo não tem permissão de admin nem de editor';
end $$;

-- 5. O próprio usuário não se ativa (trigger da 010).
do $$
declare
  v_blocked boolean := false;
begin
  begin
    update profiles set is_active = true
    where id = current_setting('verif.new_user_id')::uuid;
  exception when insufficient_privilege then
    v_blocked := true;
  end;
  if not v_blocked then
    raise exception 'FALHOU 5: o usuário novo ativou o próprio perfil';
  end if;
  raise notice 'OK 5: o usuário novo não ativa o próprio perfil';
end $$;

-- ============================================
-- Admin ativa o perfil (como o createEditor)
-- ============================================
reset role;
select set_config(
  'request.jwt.claims',
  json_build_object('sub', current_setting('verif.admin_id'), 'role', 'authenticated')::text,
  true
);
set local role authenticated;

-- 6. Admin ativa o perfil novo como editor.
do $$
declare
  v_rows integer;
begin
  update profiles set name = 'Editor de verificação 015', role = 'editor', is_active = true
  where id = current_setting('verif.new_user_id')::uuid;
  get diagnostics v_rows = row_count;
  if v_rows <> 1 then
    raise exception 'FALHOU 6: admin não ativou o perfil novo (% linhas)', v_rows;
  end if;
  raise notice 'OK 6: admin ativa o perfil novo';
end $$;

-- ============================================
-- Usuário novo, agora ativo
-- ============================================
reset role;
select set_config(
  'request.jwt.claims',
  json_build_object('sub', current_setting('verif.new_user_id'), 'role', 'authenticated')::text,
  true
);
set local role authenticated;

-- 7. Depois de ativado, o editor ganha acesso à igreja vinculada.
do $$
begin
  if not is_editor_of(current_setting('verif.church_id')::uuid) then
    raise exception 'FALHOU 7: editor ativado não passou em is_editor_of() da igreja vinculada';
  end if;
  raise notice 'OK 7: editor ativado acessa a igreja vinculada';
end $$;

reset role;

rollback;
