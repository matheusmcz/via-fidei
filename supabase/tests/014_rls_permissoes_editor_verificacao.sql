-- Roteiro de verificação da migration 014 (permissões do editor, D3).
--
-- Como usar:
--   1. Aplique a 014 no SQL Editor do Supabase.
--   2. Cole este arquivo inteiro no SQL Editor e execute.
--   3. Sem erro: todas as verificações passaram. Com erro: a mensagem começa
--      com "FALHOU" e diz qual verificação não bateu.
--
-- Nada é gravado: tudo roda dentro de begin … rollback. Se uma verificação
-- falhar, a transação é abortada e também não grava nada.
--
-- Usuários: por padrão o roteiro escolhe um admin ativo e um editor ativo com
-- pelo menos uma igreja vinculada. Para usar usuários específicos, troque
-- '<ADMIN_UUID>' e '<EDITOR_UUID>' pelos ids de profiles.
--
-- Cada bloco roda com "set local role authenticated" e um JWT simulado em
-- request.jwt.claims ({"sub": "<uuid>", "role": "authenticated"}), como uma
-- chamada à API REST com o token do usuário.

begin;

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
  v_clergy uuid;
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

  -- Clérigo e vínculo de teste para as verificações de church_clergy.
  select id into v_clergy from clergy order by name limit 1;
  if v_clergy is null then
    insert into clergy (name, role) values ('Clérigo de verificação 014', 'vicar')
    returning id into v_clergy;
  end if;

  insert into church_clergy (church_id, clergy_id, start_date, is_active)
  values (v_linked, v_clergy, '1900', false);

  -- Ministério do catálogo ainda não vinculado à igreja do editor.
  select m.id into v_ministry from ministries m
  where not exists (
    select 1 from church_ministries cm
    where cm.church_id = v_linked and cm.ministry_id = m.id
  )
  order by m.label
  limit 1;
  if v_ministry is null then
    insert into ministries (label, category) values ('Ministério de verificação 014', 'group')
    returning id into v_ministry;
  end if;

  perform set_config('verif.admin_id', v_admin::text, true);
  perform set_config('verif.editor_id', v_editor::text, true);
  perform set_config('verif.linked_church', v_linked::text, true);
  perform set_config('verif.unlinked_church', v_unlinked::text, true);
  perform set_config('verif.clergy_id', v_clergy::text, true);
  perform set_config('verif.ministry_id', v_ministry::text, true);

  raise notice 'Admin %, editor %, igreja vinculada %, não vinculada %',
    v_admin, v_editor, v_linked, v_unlinked;
end $$;

-- ============================================
-- Editor
-- ============================================
select set_config(
  'request.jwt.claims',
  json_build_object('sub', current_setting('verif.editor_id'), 'role', 'authenticated')::text,
  true
);
set local role authenticated;

-- 1. Editor altera contato, foto e link do Maps da igreja vinculada.
do $$
declare
  v_church uuid := current_setting('verif.linked_church')::uuid;
  v_rows integer;
begin
  update churches set
    phone = '(82) 0000-0014',
    whatsapp = '5582000000014',
    email = 'verificacao-014@example.com',
    instagram = 'verificacao014',
    facebook = 'verificacao014',
    website = 'https://example.com/014',
    image_url = '/images/verificacao-014.jpg',
    google_maps_url = 'https://maps.google.com/?q=verificacao-014'
  where id = v_church;
  get diagnostics v_rows = row_count;

  if v_rows <> 1 then
    raise exception 'FALHOU 1: editor não conseguiu alterar contato, foto e Maps da igreja vinculada (% linhas)', v_rows;
  end if;
  raise notice 'OK 1: editor altera contato, foto e Maps da igreja vinculada';
end $$;

-- 2. Editor não altera nome, slug, endereço, bairro, tipo nem colunas fora da lista.
do $$
declare
  v_church uuid := current_setting('verif.linked_church')::uuid;
  v_column text;
  v_blocked boolean;
begin
  foreach v_column in array array['name', 'slug', 'address', 'district', 'type', 'created_at'] loop
    v_blocked := false;
    begin
      execute case v_column
        when 'type' then
          'update churches set type = case when type = ''chapel'' then ''parish'' else ''chapel'' end where id = $1'
        when 'created_at' then
          'update churches set created_at = created_at - interval ''1 day'' where id = $1'
        else
          format('update churches set %I = %I || '' (verificação 014)'' where id = $1', v_column, v_column)
      end
      using v_church;
    exception when insufficient_privilege then
      v_blocked := true;
    end;

    if not v_blocked then
      raise exception 'FALHOU 2: editor alterou a coluna % da igreja vinculada', v_column;
    end if;
  end loop;
  raise notice 'OK 2: editor não altera nome, slug, endereço, bairro, tipo nem created_at';
end $$;

-- 3. Editor não mexe em church_clergy (inserir, alterar, remover).
do $$
declare
  v_church uuid := current_setting('verif.linked_church')::uuid;
  v_clergy uuid := current_setting('verif.clergy_id')::uuid;
  v_blocked boolean := false;
  v_rows integer;
begin
  begin
    insert into church_clergy (church_id, clergy_id, start_date)
    values (v_church, v_clergy, '1901');
  exception when insufficient_privilege then
    v_blocked := true;
  end;
  if not v_blocked then
    raise exception 'FALHOU 3: editor inseriu vínculo em church_clergy';
  end if;

  update church_clergy set end_date = '1902'
  where church_id = v_church and start_date = '1900';
  get diagnostics v_rows = row_count;
  if v_rows <> 0 then
    raise exception 'FALHOU 3: editor alterou vínculo em church_clergy';
  end if;

  delete from church_clergy
  where church_id = v_church and start_date = '1900';
  get diagnostics v_rows = row_count;
  if v_rows <> 0 then
    raise exception 'FALHOU 3: editor removeu vínculo em church_clergy';
  end if;

  update clergy set bio = 'verificação 014' where id = v_clergy;
  get diagnostics v_rows = row_count;
  if v_rows <> 0 then
    raise exception 'FALHOU 3: editor alterou o cadastro do clérigo';
  end if;

  raise notice 'OK 3: editor não mexe em church_clergy nem em clergy';
end $$;

-- 4. Editor não altera igreja não vinculada (nem o contato).
do $$
declare
  v_church uuid := current_setting('verif.unlinked_church')::uuid;
  v_rows integer;
begin
  update churches set phone = '(82) 0000-0014' where id = v_church;
  get diagnostics v_rows = row_count;
  if v_rows <> 0 then
    raise exception 'FALHOU 4: editor alterou igreja não vinculada';
  end if;
  raise notice 'OK 4: editor não altera igreja não vinculada';
end $$;

-- 4b. Editor não cria nem apaga igreja, não mexe no catálogo ministries e não
--     move horário ou ministério para igreja não vinculada.
do $$
declare
  v_church uuid := current_setting('verif.linked_church')::uuid;
  v_other uuid := current_setting('verif.unlinked_church')::uuid;
  v_ministry uuid := current_setting('verif.ministry_id')::uuid;
  v_event uuid;
  v_rows integer;
  v_blocked boolean;
begin
  v_blocked := false;
  begin
    insert into churches (name, slug, address, district)
    values ('Igreja de verificação 014', 'igreja-verificacao-014', 'Rua 014', 'Centro');
  exception when insufficient_privilege then
    v_blocked := true;
  end;
  if not v_blocked then
    raise exception 'FALHOU 4b: editor criou igreja';
  end if;

  delete from churches where id = v_church;
  get diagnostics v_rows = row_count;
  if v_rows <> 0 then
    raise exception 'FALHOU 4b: editor apagou igreja';
  end if;

  v_blocked := false;
  begin
    insert into ministries (label, category) values ('Ministério de verificação 014 (editor)', 'group');
  exception when insufficient_privilege then
    v_blocked := true;
  end;
  if not v_blocked then
    raise exception 'FALHOU 4b: editor criou item no catálogo ministries';
  end if;

  update ministries set label = label || ' (verificação 014)' where id = v_ministry;
  get diagnostics v_rows = row_count;
  if v_rows <> 0 then
    raise exception 'FALHOU 4b: editor alterou item do catálogo ministries';
  end if;

  delete from ministries where id = v_ministry;
  get diagnostics v_rows = row_count;
  if v_rows <> 0 then
    raise exception 'FALHOU 4b: editor apagou item do catálogo ministries';
  end if;

  -- Formulário que reenvia a linha inteira: identidade igual + contato novo passa.
  update churches set
    name = name,
    slug = slug,
    address = address,
    district = district,
    type = type,
    phone = '(82) 0000-1014'
  where id = v_church;
  get diagnostics v_rows = row_count;
  if v_rows <> 1 then
    raise exception 'FALHOU 4b: editor não alterou contato reenviando a identidade sem mudança';
  end if;

  v_blocked := false;
  begin
    insert into schedule_events (church_id, category, day_of_week, time)
    values (v_other, 'mass', 0, '07:00');
  exception when insufficient_privilege then
    v_blocked := true;
  end;
  if not v_blocked then
    raise exception 'FALHOU 4b: editor criou horário em igreja não vinculada';
  end if;

  insert into schedule_events (church_id, category, day_of_week, time)
  values (v_church, 'mass', 0, '07:00')
  returning id into v_event;
  v_blocked := false;
  begin
    update schedule_events set church_id = v_other where id = v_event;
  exception when insufficient_privilege then
    v_blocked := true;
  end;
  if not v_blocked then
    raise exception 'FALHOU 4b: editor moveu horário para igreja não vinculada';
  end if;

  insert into church_ministries (church_id, ministry_id) values (v_church, v_ministry);
  v_blocked := false;
  begin
    update church_ministries set church_id = v_other
    where church_id = v_church and ministry_id = v_ministry;
  exception when insufficient_privilege then
    v_blocked := true;
  end;
  if not v_blocked then
    raise exception 'FALHOU 4b: editor moveu ministério para igreja não vinculada';
  end if;

  -- Limpa o que foi criado, para o bloco 5 partir do mesmo estado.
  delete from schedule_events where id = v_event;
  delete from church_ministries where church_id = v_church and ministry_id = v_ministry;

  raise notice 'OK 4b: editor não cria/apaga igreja, não mexe no catálogo e não move dados para outra igreja';
end $$;

-- 5. Regressão: o que a D3 dá ao editor continua liberado.
do $$
declare
  v_church uuid := current_setting('verif.linked_church')::uuid;
  v_ministry uuid := current_setting('verif.ministry_id')::uuid;
  v_event uuid;
  v_activity uuid;
  v_rows integer;
begin
  insert into schedule_events (church_id, category, day_of_week, time)
  values (v_church, 'mass', 0, '07:00')
  returning id into v_event;
  update schedule_events set time = '08:00' where id = v_event;
  delete from schedule_events where id = v_event;
  get diagnostics v_rows = row_count;
  if v_rows <> 1 then
    raise exception 'FALHOU 5: editor não gerenciou schedule_events';
  end if;

  insert into activities (church_id, name) values (v_church, 'Atividade de verificação 014')
  returning id into v_activity;
  insert into activity_schedules (activity_id, day_of_week, time) values (v_activity, 1, '19:00');
  delete from activities where id = v_activity;
  get diagnostics v_rows = row_count;
  if v_rows <> 1 then
    raise exception 'FALHOU 5: editor não gerenciou activities';
  end if;

  insert into church_ministries (church_id, ministry_id) values (v_church, v_ministry);
  delete from church_ministries where church_id = v_church and ministry_id = v_ministry;
  get diagnostics v_rows = row_count;
  if v_rows <> 1 then
    raise exception 'FALHOU 5: editor não gerenciou church_ministries';
  end if;

  raise notice 'OK 5: editor gerencia horários, atividades e grupos/movimentos/pastorais';
end $$;

-- ============================================
-- Admin
-- ============================================
reset role;
select set_config(
  'request.jwt.claims',
  json_build_object('sub', current_setting('verif.admin_id'), 'role', 'authenticated')::text,
  true
);
set local role authenticated;

-- 6. Admin altera tudo, em igreja vinculada ou não ao editor.
do $$
declare
  v_church uuid;
  v_rows integer;
begin
  foreach v_church in array array[
    current_setting('verif.linked_church')::uuid,
    current_setting('verif.unlinked_church')::uuid
  ] loop
    update churches set
      name = name || ' (verificação 014)',
      slug = slug || '-verificacao-014',
      address = address || ' (verificação 014)',
      district = district || ' (verificação 014)',
      type = case when type = 'chapel' then 'parish' else 'chapel' end,
      phone = '(82) 0000-0014',
      image_url = '/images/verificacao-014.jpg',
      google_maps_url = 'https://maps.google.com/?q=verificacao-014'
    where id = v_church;
    get diagnostics v_rows = row_count;
    if v_rows <> 1 then
      raise exception 'FALHOU 6: admin não alterou a igreja % (% linhas)', v_church, v_rows;
    end if;
  end loop;
  raise notice 'OK 6: admin altera identidade, contato, foto e Maps';
end $$;

-- 7. Admin gerencia church_clergy.
do $$
declare
  v_church uuid := current_setting('verif.linked_church')::uuid;
  v_clergy uuid := current_setting('verif.clergy_id')::uuid;
  v_rows integer;
begin
  insert into church_clergy (church_id, clergy_id, start_date, is_active)
  values (v_church, v_clergy, '1901', false);

  update church_clergy set end_date = '1902'
  where church_id = v_church and clergy_id = v_clergy and start_date = '1900';
  get diagnostics v_rows = row_count;
  if v_rows <> 1 then
    raise exception 'FALHOU 7: admin não alterou vínculo em church_clergy';
  end if;

  delete from church_clergy
  where church_id = v_church and clergy_id = v_clergy and start_date in ('1900', '1901');
  get diagnostics v_rows = row_count;
  if v_rows <> 2 then
    raise exception 'FALHOU 7: admin não removeu vínculos em church_clergy (% linhas)', v_rows;
  end if;

  raise notice 'OK 7: admin gerencia church_clergy';
end $$;

reset role;

rollback;
