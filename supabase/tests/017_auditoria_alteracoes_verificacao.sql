-- Roteiro de verificação da migration 017 (VF-093: auditoria de alterações).
--
-- Como usar:
--   1. Aplique a 017 no SQL Editor do Supabase.
--   2. Cole este arquivo inteiro no SQL Editor e execute.
--   3. Sem erro: todas as verificações passaram. Com erro: a mensagem começa
--      com "FALHOU" e diz qual verificação não bateu.
--
-- Nada é gravado: tudo roda dentro de begin … rollback, inclusive os
-- registros de auditoria gerados pelo próprio roteiro. Se uma verificação
-- falhar, a transação é abortada e também não grava nada.
--
-- Usuários: por padrão o roteiro escolhe um admin ativo e um editor ativo com
-- pelo menos uma igreja vinculada. Para usar usuários específicos, troque
-- '<ADMIN_UUID>' e '<EDITOR_UUID>' pelos ids de profiles.
--
-- Os blocos do editor, do admin e do service role rodam com "set local role"
-- e um JWT simulado em request.jwt.claims, como uma chamada à API REST. As
-- conferências do log rodam com a role do SQL Editor, que lê tudo.

begin;

-- ============================================
-- 0. Estrutura: tabela, RLS, privilégios, função e triggers
-- ============================================
do $$
declare
  v_table text;
  v_missing text[] := '{}';
  v_role text;
  v_privilege text;
begin
  if to_regclass('public.audit_log') is null then
    raise exception 'FALHOU 0: a tabela public.audit_log não existe (a 017 foi aplicada?)';
  end if;

  if not (select relrowsecurity from pg_class where oid = 'public.audit_log'::regclass) then
    raise exception 'FALHOU 0: RLS desativado em audit_log';
  end if;

  if not exists (
    select 1 from pg_proc
    where oid = 'public.audit_log_changes()'::regprocedure
      and prosecdef
      and proconfig @> array['search_path=public']
  ) then
    raise exception 'FALHOU 0: audit_log_changes() precisa ser security definer com search_path = public';
  end if;

  foreach v_table in array array[
    'churches', 'schedule_events', 'activities', 'activity_schedules',
    'church_ministries', 'ministries', 'clergy', 'church_clergy',
    'profiles', 'editor_churches'
  ] loop
    if not exists (
      select 1 from pg_trigger t
      where t.tgrelid = format('public.%I', v_table)::regclass
        and t.tgname = 'audit_log_changes'
        and t.tgfoid = 'public.audit_log_changes()'::regprocedure
        and not t.tgisinternal
        and t.tgenabled <> 'D'
        -- AFTER (bit 2 = BEFORE desligado), FOR EACH ROW (bit 1),
        -- INSERT (4), DELETE (8) e UPDATE (16).
        and (t.tgtype & 2) = 0
        and (t.tgtype & 1) = 1
        and (t.tgtype & 28) = 28
    ) then
      v_missing := v_missing || v_table;
    end if;
  end loop;
  if cardinality(v_missing) > 0 then
    raise exception 'FALHOU 0: trigger AFTER INSERT/UPDATE/DELETE de auditoria ausente em %', v_missing;
  end if;

  foreach v_role in array array['anon', 'authenticated', 'service_role'] loop
    if not exists (select 1 from pg_roles where rolname = v_role) then
      continue;
    end if;
    foreach v_privilege in array array['INSERT', 'UPDATE', 'DELETE', 'TRUNCATE'] loop
      if has_table_privilege(v_role, 'public.audit_log', v_privilege) then
        raise exception 'FALHOU 0: % tem % em audit_log', v_role, v_privilege;
      end if;
    end loop;
    if has_function_privilege(v_role, 'public.audit_log_changes()', 'EXECUTE') then
      raise exception 'FALHOU 0: % tem EXECUTE em audit_log_changes()', v_role;
    end if;
  end loop;

  if has_table_privilege('anon', 'public.audit_log', 'SELECT') then
    raise exception 'FALHOU 0: anon tem SELECT em audit_log';
  end if;

  raise notice 'OK 0: tabela com RLS, função security definer, triggers nas 10 tabelas e sem escrita pela API';
end $$;

-- ============================================
-- Preparação (role do SQL Editor, sem RLS)
-- ============================================
do $$
declare
  v_admin_in  constant text := '<ADMIN_UUID>';
  v_editor_in constant text := '<EDITOR_UUID>';
  v_admin uuid;
  v_editor uuid;
  v_linked uuid;
  v_unlinked uuid;
  v_ministry uuid;
begin
  if v_admin_in like '<%' then
    select id into v_admin from profiles
    where role = 'admin' and is_active
    order by created_at
    limit 1;
  else
    v_admin := v_admin_in::uuid;
  end if;

  if v_editor_in like '<%' then
    select p.id into v_editor from profiles p
    where p.role = 'editor' and p.is_active
      and exists (select 1 from editor_churches ec where ec.editor_id = p.id)
    order by p.created_at
    limit 1;
  else
    v_editor := v_editor_in::uuid;
  end if;

  if v_admin is null or not exists (
    select 1 from profiles where id = v_admin and role = 'admin' and is_active
  ) then
    raise exception 'PREPARAÇÃO: nenhum admin ativo encontrado (informe <ADMIN_UUID>)';
  end if;

  if v_editor is null or not exists (
    select 1 from profiles where id = v_editor and role = 'editor' and is_active
  ) then
    raise exception 'PREPARAÇÃO: nenhum editor ativo encontrado (informe <EDITOR_UUID>)';
  end if;

  select church_id into v_linked from editor_churches
  where editor_id = v_editor
  order by created_at
  limit 1;

  select c.id into v_unlinked from churches c
  where not exists (
    select 1 from editor_churches ec
    where ec.editor_id = v_editor and ec.church_id = c.id
  )
  order by c.name
  limit 1;

  if v_linked is null or v_unlinked is null then
    raise exception 'PREPARAÇÃO: o editor precisa de uma igreja vinculada e de outra não vinculada';
  end if;

  -- Telefone conhecido antes do teste, para o editor trocá-lo por outro e o
  -- registro esperado ser exato. Esta alteração fica antes do marco abaixo.
  update churches set phone = '(82) 0000-1017' where id = v_linked;

  -- Ministério do catálogo ainda não vinculado à igreja do editor (D14).
  select m.id into v_ministry from ministries m
  where not exists (
    select 1 from church_ministries cm
    where cm.church_id = v_linked and cm.ministry_id = m.id
  )
  order by m.label
  limit 1;
  if v_ministry is null then
    insert into ministries (label, category) values ('Ministério de verificação 017 (vínculo)', 'group')
    returning id into v_ministry;
  end if;
  perform set_config('verif.ministry_id', v_ministry::text, true);

  perform set_config('verif.admin_id', v_admin::text, true);
  perform set_config('verif.editor_id', v_editor::text, true);
  perform set_config('verif.editor_name', (select name from profiles where id = v_editor), true);
  perform set_config('verif.linked_church', v_linked::text, true);
  perform set_config('verif.unlinked_church', v_unlinked::text, true);
  -- Marco: os registros gerados pelo roteiro são os de id maior que este.
  perform set_config(
    'verif.audit_start',
    (select coalesce(max(id), 0) from audit_log)::text,
    true
  );

  raise notice 'Admin %, editor %, igreja vinculada %, não vinculada %',
    v_admin, v_editor, v_linked, v_unlinked;
end $$;

-- Confere um registro de auditoria gerado pelo roteiro. Função temporária
-- (pg_temp): some no fim da sessão e não fica no schema public.
create function pg_temp.verif_expect_audit(
  p_check text,
  p_table text,
  p_operation text,
  p_record_pk jsonb,
  p_actor uuid,
  p_actor_db_role text,
  p_actor_app_role text,
  p_church uuid,
  p_old_data jsonb,
  p_new_data jsonb
) returns void
language plpgsql
as $$
declare
  v_entry public.audit_log%rowtype;
  v_count integer;
begin
  select count(*) into v_count from public.audit_log
  where id > current_setting('verif.audit_start')::bigint
    and table_name = p_table
    and operation = p_operation
    and record_pk = p_record_pk;

  if v_count <> 1 then
    raise exception 'FALHOU %: esperava 1 registro % em % para %, achou %',
      p_check, p_operation, p_table, p_record_pk, v_count;
  end if;

  select * into v_entry from public.audit_log
  where id > current_setting('verif.audit_start')::bigint
    and table_name = p_table
    and operation = p_operation
    and record_pk = p_record_pk;

  if v_entry.actor_id is distinct from p_actor
     or v_entry.actor_db_role is distinct from p_actor_db_role
     or v_entry.actor_app_role is distinct from p_actor_app_role then
    raise exception 'FALHOU %: autor de % em % é (%, %, %), esperado (%, %, %)',
      p_check, p_operation, p_table,
      v_entry.actor_id, v_entry.actor_db_role, v_entry.actor_app_role,
      p_actor, p_actor_db_role, p_actor_app_role;
  end if;

  if v_entry.church_id is distinct from p_church then
    raise exception 'FALHOU %: church_id de % em % é %, esperado %',
      p_check, p_operation, p_table, v_entry.church_id, p_church;
  end if;

  -- p_old_data/p_new_data nulos: o lado precisa ser nulo. Senão, o registro
  -- precisa ter exatamente essas chaves (UPDATE) ou contê-las (INSERT/DELETE,
  -- que guardam a linha inteira).
  if p_operation = 'UPDATE' then
    if v_entry.old_data is distinct from p_old_data
       or v_entry.new_data is distinct from p_new_data then
      raise exception 'FALHOU %: UPDATE em % gravou old=% new=%, esperado old=% new=%',
        p_check, p_table, v_entry.old_data, v_entry.new_data, p_old_data, p_new_data;
    end if;
  else
    if (p_old_data is null) <> (v_entry.old_data is null)
       or (p_new_data is null) <> (v_entry.new_data is null)
       or (p_old_data is not null and not v_entry.old_data @> p_old_data)
       or (p_new_data is not null and not v_entry.new_data @> p_new_data) then
      raise exception 'FALHOU %: % em % gravou old=% new=%, esperado conter old=% new=%',
        p_check, p_operation, p_table, v_entry.old_data, v_entry.new_data, p_old_data, p_new_data;
    end if;
  end if;
end;
$$;

-- ============================================
-- Editor: grava horários e contato
-- ============================================
select set_config(
  'request.jwt.claims',
  json_build_object('sub', current_setting('verif.editor_id'), 'role', 'authenticated')::text,
  true
);
set local role authenticated;

-- 1. Editor cria, altera e apaga um horário; altera o contato da igreja.
do $$
declare
  v_church uuid := current_setting('verif.linked_church')::uuid;
  v_event uuid;
  v_church_ministry uuid;
  v_rows integer;
  v_blocked boolean := false;
begin
  insert into schedule_events (church_id, category, day_of_week, time)
  values (v_church, 'mass', 0, '07:00')
  returning id into v_event;
  update schedule_events set time = '08:00' where id = v_event;
  delete from schedule_events where id = v_event;
  get diagnostics v_rows = row_count;
  if v_rows <> 1 then
    raise exception 'FALHOU 1: editor não gerenciou o horário de teste';
  end if;

  update churches set phone = '(82) 0000-0017' where id = v_church;
  get diagnostics v_rows = row_count;
  if v_rows <> 1 then
    raise exception 'FALHOU 1: editor não alterou o contato da igreja vinculada';
  end if;

  -- Vincula e desvincula um item do catálogo (D14).
  insert into church_ministries (church_id, ministry_id)
  values (v_church, current_setting('verif.ministry_id')::uuid)
  returning id into v_church_ministry;
  delete from church_ministries where id = v_church_ministry;
  get diagnostics v_rows = row_count;
  if v_rows <> 1 then
    raise exception 'FALHOU 1: editor não desvinculou o ministério de teste';
  end if;
  perform set_config('verif.editor_church_ministry', v_church_ministry::text, true);

  -- Gravação recusada (identidade da igreja, 014) e igreja não vinculada
  -- (RLS): não podem deixar registro.
  begin
    update churches set name = name || ' (verificação 017)' where id = v_church;
  exception when insufficient_privilege then
    v_blocked := true;
  end;
  if not v_blocked then
    raise exception 'FALHOU 1: editor alterou o nome da igreja (a 014 deveria recusar)';
  end if;
  update churches set phone = '(82) 0000-0017'
  where id = current_setting('verif.unlinked_church')::uuid;

  perform set_config('verif.editor_event', v_event::text, true);
  raise notice 'OK 1: editor gravou horário, contato e ministério';
end $$;

-- 2. Editor não lê o log.
do $$
declare
  v_count integer;
begin
  select count(*) into v_count from audit_log;
  if v_count <> 0 then
    raise exception 'FALHOU 2: editor leu % registros de audit_log', v_count;
  end if;
  raise notice 'OK 2: editor não lê o log';
end $$;

-- 3. Editor não grava, altera nem apaga o log.
do $$
declare
  v_operation text;
  v_blocked boolean;
begin
  foreach v_operation in array array['insert', 'update', 'delete', 'truncate'] loop
    v_blocked := false;
    begin
      execute case v_operation
        when 'insert' then
          'insert into audit_log (actor_db_role, table_name, operation, record_pk)
           values (''authenticated'', ''churches'', ''UPDATE'', ''{}'')'
        when 'update' then 'update audit_log set actor_id = null'
        when 'delete' then 'delete from audit_log'
        else 'truncate audit_log'
      end;
    exception when insufficient_privilege then
      v_blocked := true;
    end;
    if not v_blocked then
      raise exception 'FALHOU 3: editor conseguiu % em audit_log', v_operation;
    end if;
  end loop;
  raise notice 'OK 3: editor não grava, altera nem apaga o log';
end $$;

-- ============================================
-- Anon: não lê nem grava o log
-- ============================================
reset role;
select set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
set local role anon;

-- 4. Anon não lê nem grava o log.
do $$
declare
  v_operation text;
  v_blocked boolean;
begin
  foreach v_operation in array array['select', 'insert', 'update', 'delete'] loop
    v_blocked := false;
    begin
      execute case v_operation
        when 'select' then 'select count(*) from audit_log'
        when 'insert' then
          'insert into audit_log (actor_db_role, table_name, operation, record_pk)
           values (''anon'', ''churches'', ''UPDATE'', ''{}'')'
        when 'update' then 'update audit_log set actor_id = null'
        else 'delete from audit_log'
      end;
    exception when insufficient_privilege then
      v_blocked := true;
    end;
    if not v_blocked then
      raise exception 'FALHOU 4: anon conseguiu % em audit_log', v_operation;
    end if;
  end loop;
  raise notice 'OK 4: anon não lê nem grava o log';
end $$;

-- ============================================
-- Admin: grava clero, vínculo de editor e atividade; lê o log
-- ============================================
reset role;
select set_config(
  'request.jwt.claims',
  json_build_object('sub', current_setting('verif.admin_id'), 'role', 'authenticated')::text,
  true
);
set local role authenticated;

-- 5. Admin cria, altera e apaga um clérigo; vincula o editor a outra igreja;
--    cria uma atividade com horário.
do $$
declare
  v_clergy uuid;
  v_activity uuid;
  v_activity_schedule uuid;
  v_link_clergy uuid;
  v_link uuid;
  v_rows integer;
begin
  insert into clergy (name, role) values ('Clérigo de verificação 017', 'vicar')
  returning id into v_clergy;
  update clergy set bio = 'Bio de verificação 017' where id = v_clergy;
  -- UPDATE sem mudança real: não gera registro.
  update clergy set bio = bio where id = v_clergy;
  delete from clergy where id = v_clergy;
  get diagnostics v_rows = row_count;
  if v_rows <> 1 then
    raise exception 'FALHOU 5: admin não gerenciou o clérigo de teste';
  end if;

  -- Vínculo clérigo-igreja (inativo, para não esbarrar na regra de um vínculo
  -- ativo por clérigo) e upsert com os mesmos valores, como o seed: o upsert
  -- não pode gerar UPDATE.
  insert into clergy (name, role) values ('Clérigo de verificação 017 (vínculo)', 'vicar')
  returning id into v_link_clergy;
  insert into church_clergy (church_id, clergy_id, start_date, is_active)
  values (current_setting('verif.linked_church')::uuid, v_link_clergy, '1900', false)
  returning id into v_link;
  insert into church_clergy (church_id, clergy_id, start_date, is_active)
  values (current_setting('verif.linked_church')::uuid, v_link_clergy, '1900', false)
  on conflict (church_id, clergy_id, start_date) do update set is_active = excluded.is_active;
  delete from church_clergy where id = v_link;
  get diagnostics v_rows = row_count;
  if v_rows <> 1 then
    raise exception 'FALHOU 5: admin não removeu o vínculo de teste em church_clergy';
  end if;
  perform set_config('verif.admin_link', v_link::text, true);
  perform set_config('verif.admin_link_clergy', v_link_clergy::text, true);

  insert into editor_churches (editor_id, church_id)
  values (
    current_setting('verif.editor_id')::uuid,
    current_setting('verif.unlinked_church')::uuid
  );

  insert into activities (church_id, name)
  values (current_setting('verif.linked_church')::uuid, 'Atividade de verificação 017')
  returning id into v_activity;
  insert into activity_schedules (activity_id, day_of_week, time)
  values (v_activity, 2, '19:00')
  returning id into v_activity_schedule;
  -- Apagar a atividade apaga o horário em cascata: os dois ficam no log.
  delete from activities where id = v_activity;

  -- Perfil do editor: só o nome muda (updated_at, do trigger, não conta).
  update profiles set name = name || ' (verificação 017)'
  where id = current_setting('verif.editor_id')::uuid;
  get diagnostics v_rows = row_count;
  if v_rows <> 1 then
    raise exception 'FALHOU 5: admin não alterou o perfil do editor';
  end if;

  perform set_config('verif.admin_clergy', v_clergy::text, true);
  perform set_config('verif.admin_activity', v_activity::text, true);
  perform set_config('verif.admin_activity_schedule', v_activity_schedule::text, true);
  raise notice 'OK 5: admin gravou clero, vínculo de editor e atividade';
end $$;

-- 6. Admin lê o log, inclusive o que o editor gravou.
do $$
declare
  v_count integer;
begin
  select count(*) into v_count from audit_log
  where id > current_setting('verif.audit_start')::bigint
    and actor_id = current_setting('verif.editor_id')::uuid;
  if v_count = 0 then
    raise exception 'FALHOU 6: admin não leu os registros do editor';
  end if;
  raise notice 'OK 6: admin lê o log (% registros do editor)', v_count;
end $$;

-- 7. Admin também não altera nem apaga o log.
do $$
declare
  v_operation text;
  v_blocked boolean;
begin
  foreach v_operation in array array['insert', 'update', 'delete', 'truncate'] loop
    v_blocked := false;
    begin
      execute case v_operation
        when 'insert' then
          'insert into audit_log (actor_db_role, table_name, operation, record_pk)
           values (''authenticated'', ''churches'', ''UPDATE'', ''{}'')'
        when 'update' then 'update audit_log set actor_id = null'
        when 'delete' then 'delete from audit_log'
        else 'truncate audit_log'
      end;
    exception when insufficient_privilege then
      v_blocked := true;
    end;
    if not v_blocked then
      raise exception 'FALHOU 7: admin conseguiu % em audit_log', v_operation;
    end if;
  end loop;
  raise notice 'OK 7: admin não grava, altera nem apaga o log';
end $$;

-- ============================================
-- Service role (seed, scripts): grava sem autor; não mexe no log
-- ============================================
reset role;
select set_config('request.jwt.claims', json_build_object('role', 'service_role')::text, true);
set local role service_role;

-- 8. Service role cria um ministério; lê o log mas não o altera.
do $$
declare
  v_ministry uuid;
  v_operation text;
  v_blocked boolean;
begin
  insert into ministries (label, category) values ('Ministério de verificação 017', 'group')
  returning id into v_ministry;
  perform set_config('verif.service_ministry', v_ministry::text, true);

  perform count(*) from audit_log;

  foreach v_operation in array array['insert', 'update', 'delete', 'truncate'] loop
    v_blocked := false;
    begin
      execute case v_operation
        when 'insert' then
          'insert into audit_log (actor_db_role, table_name, operation, record_pk)
           values (''service_role'', ''churches'', ''UPDATE'', ''{}'')'
        when 'update' then 'update audit_log set actor_id = null'
        when 'delete' then 'delete from audit_log'
        else 'truncate audit_log'
      end;
    exception when insufficient_privilege then
      v_blocked := true;
    end;
    if not v_blocked then
      raise exception 'FALHOU 8: service role conseguiu % em audit_log', v_operation;
    end if;
  end loop;
  raise notice 'OK 8: service role grava dados sem autor e não altera o log';
end $$;

-- ============================================
-- Conferência dos registros (role do SQL Editor)
-- ============================================
reset role;
select set_config('request.jwt.claims', '', true);

-- 9. Registros do editor: autor, role, papel, igreja e só as colunas que mudaram.
do $$
declare
  v_editor uuid := current_setting('verif.editor_id')::uuid;
  v_church uuid := current_setting('verif.linked_church')::uuid;
  v_event jsonb := jsonb_build_object('id', current_setting('verif.editor_event'));
  v_count integer;
begin
  perform pg_temp.verif_expect_audit('9', 'schedule_events', 'INSERT', v_event,
    v_editor, 'authenticated', 'editor', v_church,
    null, jsonb_build_object('time', '07:00', 'category', 'mass', 'church_id', v_church));
  perform pg_temp.verif_expect_audit('9', 'schedule_events', 'UPDATE', v_event,
    v_editor, 'authenticated', 'editor', v_church,
    '{"time": "07:00"}', '{"time": "08:00"}');
  perform pg_temp.verif_expect_audit('9', 'schedule_events', 'DELETE', v_event,
    v_editor, 'authenticated', 'editor', v_church,
    jsonb_build_object('time', '08:00', 'church_id', v_church), null);

  -- Contato: só phone (updated_at não conta). O UPDATE recusado pela 014
  -- não deixa registro: o helper exige exatamente um UPDATE na igreja.
  perform pg_temp.verif_expect_audit('9', 'churches', 'UPDATE', jsonb_build_object('id', v_church),
    v_editor, 'authenticated', 'editor', v_church,
    '{"phone": "(82) 0000-1017"}', '{"phone": "(82) 0000-0017"}');

  perform pg_temp.verif_expect_audit('9', 'church_ministries', 'INSERT',
    jsonb_build_object('id', current_setting('verif.editor_church_ministry')),
    v_editor, 'authenticated', 'editor', v_church,
    null, jsonb_build_object('church_id', v_church, 'ministry_id', current_setting('verif.ministry_id')));
  perform pg_temp.verif_expect_audit('9', 'church_ministries', 'DELETE',
    jsonb_build_object('id', current_setting('verif.editor_church_ministry')),
    v_editor, 'authenticated', 'editor', v_church,
    jsonb_build_object('church_id', v_church, 'ministry_id', current_setting('verif.ministry_id')), null);

  select count(*) into v_count from audit_log
  where id > current_setting('verif.audit_start')::bigint
    and actor_id = v_editor;
  if v_count <> 6 then
    raise exception 'FALHOU 9: esperava 6 registros do editor (3 do horário, 1 do contato e 2 do ministério), achou %', v_count;
  end if;

  if exists (
    select 1 from audit_log
    where id > current_setting('verif.audit_start')::bigint
      and table_name = 'churches'
      and record_pk = jsonb_build_object('id', current_setting('verif.unlinked_church'))
  ) then
    raise exception 'FALHOU 9: UPDATE do editor em igreja não vinculada (0 linhas) deixou registro';
  end if;

  raise notice 'OK 9: registros do editor com autor, papel, igreja e só as colunas alteradas';
end $$;

-- 10. Registros do admin.
do $$
declare
  v_admin uuid := current_setting('verif.admin_id')::uuid;
  v_editor uuid := current_setting('verif.editor_id')::uuid;
  v_linked uuid := current_setting('verif.linked_church')::uuid;
  v_unlinked uuid := current_setting('verif.unlinked_church')::uuid;
  v_clergy jsonb := jsonb_build_object('id', current_setting('verif.admin_clergy'));
  v_activity jsonb := jsonb_build_object('id', current_setting('verif.admin_activity'));
  v_activity_schedule jsonb := jsonb_build_object('id', current_setting('verif.admin_activity_schedule'));
begin
  -- Clérigo: INSERT, um só UPDATE (o UPDATE sem mudança não grava) e DELETE.
  perform pg_temp.verif_expect_audit('10', 'clergy', 'INSERT', v_clergy,
    v_admin, 'authenticated', 'admin', null,
    null, '{"name": "Clérigo de verificação 017", "role": "vicar"}');
  perform pg_temp.verif_expect_audit('10', 'clergy', 'UPDATE', v_clergy,
    v_admin, 'authenticated', 'admin', null,
    '{"bio": null}', '{"bio": "Bio de verificação 017"}');
  perform pg_temp.verif_expect_audit('10', 'clergy', 'DELETE', v_clergy,
    v_admin, 'authenticated', 'admin', null,
    '{"bio": "Bio de verificação 017"}', null);

  -- Vínculo clérigo-igreja: INSERT e DELETE; o upsert sem mudança não grava.
  perform pg_temp.verif_expect_audit('10', 'church_clergy', 'INSERT',
    jsonb_build_object('id', current_setting('verif.admin_link')),
    v_admin, 'authenticated', 'admin', v_linked,
    null, jsonb_build_object('clergy_id', current_setting('verif.admin_link_clergy'), 'start_date', '1900'));
  perform pg_temp.verif_expect_audit('10', 'church_clergy', 'DELETE',
    jsonb_build_object('id', current_setting('verif.admin_link')),
    v_admin, 'authenticated', 'admin', v_linked,
    jsonb_build_object('clergy_id', current_setting('verif.admin_link_clergy'), 'start_date', '1900'), null);
  if exists (
    select 1 from audit_log
    where id > current_setting('verif.audit_start')::bigint
      and table_name = 'church_clergy'
      and operation = 'UPDATE'
  ) then
    raise exception 'FALHOU 10: upsert sem mudança em church_clergy gerou registro de UPDATE';
  end if;

  -- Chave composta em editor_churches.
  perform pg_temp.verif_expect_audit('10', 'editor_churches', 'INSERT',
    jsonb_build_object('editor_id', v_editor, 'church_id', v_unlinked),
    v_admin, 'authenticated', 'admin', v_unlinked,
    null, jsonb_build_object('editor_id', v_editor, 'church_id', v_unlinked));

  -- Atividade e horário: a igreja do horário vem da atividade.
  perform pg_temp.verif_expect_audit('10', 'activities', 'INSERT', v_activity,
    v_admin, 'authenticated', 'admin', v_linked,
    null, '{"name": "Atividade de verificação 017"}');
  perform pg_temp.verif_expect_audit('10', 'activity_schedules', 'INSERT', v_activity_schedule,
    v_admin, 'authenticated', 'admin', v_linked,
    null, jsonb_build_object('activity_id', current_setting('verif.admin_activity'), 'time', '19:00'));

  -- Cascata: o DELETE do horário leva o autor de quem apagou a atividade.
  -- A igreja do horário fica nula (a atividade já foi apagada); o registro
  -- da atividade tem a igreja.
  perform pg_temp.verif_expect_audit('10', 'activities', 'DELETE', v_activity,
    v_admin, 'authenticated', 'admin', v_linked,
    '{"name": "Atividade de verificação 017"}', null);
  perform pg_temp.verif_expect_audit('10', 'activity_schedules', 'DELETE', v_activity_schedule,
    v_admin, 'authenticated', 'admin', null,
    '{"time": "19:00"}', null);

  -- Perfil: só o nome.
  perform pg_temp.verif_expect_audit('10', 'profiles', 'UPDATE', jsonb_build_object('id', v_editor),
    v_admin, 'authenticated', 'admin', null,
    jsonb_build_object('name', current_setting('verif.editor_name')),
    jsonb_build_object('name', current_setting('verif.editor_name') || ' (verificação 017)'));

  raise notice 'OK 10: registros do admin com autor, papel, chave composta e cascata';
end $$;

-- 11. Registro do service role: sem autor.
do $$
begin
  perform pg_temp.verif_expect_audit('11', 'ministries', 'INSERT',
    jsonb_build_object('id', current_setting('verif.service_ministry')),
    null, 'service_role', null, null,
    null, '{"label": "Ministério de verificação 017", "category": "group"}');
  raise notice 'OK 11: gravação do service role fica sem autor, com role service_role';
end $$;

-- 12. Gravação pelo SQL Editor: sem autor, com a role da sessão.
do $$
declare
  v_ministry uuid;
begin
  insert into ministries (label, category) values ('Ministério de verificação 017 (SQL Editor)', 'pastoral')
  returning id into v_ministry;

  perform pg_temp.verif_expect_audit('12', 'ministries', 'INSERT',
    jsonb_build_object('id', v_ministry),
    null, session_user::text, null, null,
    null, '{"label": "Ministério de verificação 017 (SQL Editor)"}');
  raise notice 'OK 12: gravação pelo SQL Editor fica sem autor, com a role %', session_user;
end $$;

-- ============================================
-- Admin que altera o próprio papel (último bloco: depois dele não é mais admin)
-- ============================================
select set_config(
  'request.jwt.claims',
  json_build_object('sub', current_setting('verif.admin_id'), 'role', 'authenticated')::text,
  true
);
set local role authenticated;

-- 13. O admin se rebaixa a editor (a 010 deixa, porque ele ainda é admin).
do $$
declare
  v_rows integer;
begin
  update profiles set role = 'editor' where id = current_setting('verif.admin_id')::uuid;
  get diagnostics v_rows = row_count;
  if v_rows <> 1 then
    raise exception 'FALHOU 13: admin não alterou o próprio papel';
  end if;
end $$;

reset role;
select set_config('request.jwt.claims', '', true);

-- O registro leva o papel de antes da gravação (admin), não o novo.
do $$
declare
  v_admin uuid := current_setting('verif.admin_id')::uuid;
begin
  perform pg_temp.verif_expect_audit('13', 'profiles', 'UPDATE', jsonb_build_object('id', v_admin),
    v_admin, 'authenticated', 'admin', null,
    '{"role": "admin"}', '{"role": "editor"}');
  raise notice 'OK 13: quem altera o próprio papel fica registrado com o papel de antes';
end $$;

rollback;
