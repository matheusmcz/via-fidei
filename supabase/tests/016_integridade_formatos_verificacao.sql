-- Roteiro de verificação da migration 016 (VF-088: formatos de horário e de
-- data, vínculo clérigo-igreja sem duplicata com start_date nulo).
--
-- Como usar:
--   1. Rode a pré-verificação (016_integridade_formatos_pre_verificacao.sql).
--   2. Aplique a 016 no SQL Editor do Supabase.
--   3. Cole este arquivo inteiro no SQL Editor e execute.
--   4. Sem erro: todas as verificações passaram. Com erro: a mensagem começa
--      com "FALHOU" e diz qual verificação não bateu.
--
-- Nada é gravado: tudo roda dentro de begin … rollback. Se uma verificação
-- falhar, a transação é abortada e também não grava nada.
--
-- Roda com o papel do SQL Editor (sem RLS): o que se testa aqui são as
-- constraints, que valem para qualquer papel. As permissões ficam na 014.
--
-- Os casos de borda são os mesmos dos testes unitários de isValidTime()
-- (lib/utils/schedule.test.ts) e isValidClergyDate() (lib/utils/clergy.test.ts).

begin;

-- ============================================
-- 1. Funções de formato: mesmos casos de borda do TypeScript
-- ============================================
do $$
declare
  v_case record;
  v_result boolean;
begin
  for v_case in
    select * from (values
      ('00:00', true), ('07:00', true), ('09:59', true), ('18:30', true),
      ('19:05', true), ('23:59', true),
      ('', false), (' ', false), ('24:00', false), ('23:60', false),
      ('12:60', false), ('7:30', false), ('7:00', false), ('07:0', false),
      ('7h', false), ('07h00', false), ('07.00', false), ('0700', false),
      ('07:00:00', false), (' 07:00', false), ('07:00 ', false),
      (E'07:00\n', false), ('ab:cd', false), ('٠٧:٠٠', false)
    ) as t(valor, esperado)
  loop
    v_result := public.is_valid_schedule_time(v_case.valor);
    if v_result is distinct from v_case.esperado then
      raise exception 'FALHOU 1: is_valid_schedule_time(%) devolveu %, esperado %',
        quote_literal(v_case.valor), v_result, v_case.esperado;
    end if;
  end loop;

  if public.is_valid_schedule_time(null) is distinct from false then
    raise exception 'FALHOU 1: is_valid_schedule_time(null) deveria ser false';
  end if;

  for v_case in
    select * from (values
      ('1970', true), ('2026', true), ('0001', true), ('9999', true),
      ('1970-05-20', true), ('2000-02-29', true), ('2024-02-29', true),
      ('2024-12-31', true), ('0001-01-01', true), ('0050-06-15', true),
      ('', false), (' ', false), ('0000', false), ('0000-01-01', false),
      ('197', false), ('19700', false), ('1970-05', false),
      ('1970-5-20', false), ('1970-05-2', false), ('2024-02-30', false),
      ('2023-02-29', false), ('1900-02-29', false), ('2024-04-31', false),
      ('2024-13-01', false), ('2024-00-10', false), ('2024-01-00', false),
      ('20/05/1970', false), ('1970/05/20', false), ('19700520', false),
      (' 1970', false), ('1970 ', false), (E'1970\n', false),
      ('1970-05-20T00:00', false), ('abcd', false), ('١٩٧٠', false)
    ) as t(valor, esperado)
  loop
    v_result := public.is_valid_clergy_date(v_case.valor);
    if v_result is distinct from v_case.esperado then
      raise exception 'FALHOU 1: is_valid_clergy_date(%) devolveu %, esperado %',
        quote_literal(v_case.valor), v_result, v_case.esperado;
    end if;
  end loop;

  if public.is_valid_clergy_date(null) is distinct from false then
    raise exception 'FALHOU 1: is_valid_clergy_date(null) deveria ser false';
  end if;

  raise notice 'OK 1: funções de formato batem com os casos de borda do TypeScript';
end $$;

-- ============================================
-- 2. Estrutura: constraints validadas, índice novo, unique antigo removido
-- ============================================
do $$
declare
  v_name text;
  v_validated boolean;
begin
  foreach v_name in array array[
    'schedule_events_time_format_check',
    'schedule_events_end_time_format_check',
    'activity_schedules_time_format_check',
    'activity_schedules_end_time_format_check',
    'clergy_birth_date_format_check',
    'clergy_death_date_format_check',
    'church_clergy_start_date_format_check',
    'church_clergy_end_date_format_check'
  ] loop
    select convalidated into v_validated
    from pg_constraint
    where conname = v_name and connamespace = 'public'::regnamespace;

    if v_validated is null then
      raise exception 'FALHOU 2: constraint % não existe', v_name;
    end if;
    if not v_validated then
      raise exception 'FALHOU 2: constraint % ainda está "not valid" (rode a seção 4 da 016)', v_name;
    end if;
  end loop;

  if not exists (
    select 1
    from pg_index i
    join pg_class c on c.oid = i.indexrelid
    where c.relname = 'church_clergy_church_clergy_start_key'
      and i.indrelid = 'public.church_clergy'::regclass
      and i.indisunique
      and i.indnullsnotdistinct
  ) then
    raise exception 'FALHOU 2: índice único church_clergy_church_clergy_start_key (nulls not distinct) não existe';
  end if;

  if exists (
    select 1 from pg_constraint
    where conrelid = 'public.church_clergy'::regclass
      and conname = 'church_clergy_church_id_clergy_id_start_date_key'
  ) then
    raise exception 'FALHOU 2: o unique antigo church_clergy_church_id_clergy_id_start_date_key continua no banco';
  end if;

  raise notice 'OK 2: 8 constraints validadas, índice nulls not distinct criado, unique antigo removido';
end $$;

-- ============================================
-- Preparação: igreja, atividade e clérigo de teste (somem no rollback)
-- ============================================
do $$
declare
  v_church uuid;
  v_activity uuid;
  v_clergy uuid;
begin
  insert into churches (name, slug, address, district)
  values ('Igreja de verificação 016', 'igreja-verificacao-016', 'Rua 016', 'Centro')
  returning id into v_church;

  insert into activities (church_id, name)
  values (v_church, 'Atividade de verificação 016')
  returning id into v_activity;

  insert into clergy (name, role)
  values ('Clérigo de verificação 016', 'vicar')
  returning id into v_clergy;

  perform set_config('verif.church_id', v_church::text, true);
  perform set_config('verif.activity_id', v_activity::text, true);
  perform set_config('verif.clergy_id', v_clergy::text, true);
end $$;

-- ============================================
-- 3. Horários: inválidos são recusados, válidos passam
-- ============================================
do $$
declare
  v_church uuid := current_setting('verif.church_id')::uuid;
  v_activity uuid := current_setting('verif.activity_id')::uuid;
  v_invalid text;
  v_blocked boolean;
  v_event uuid;
  v_schedule uuid;
begin
  -- Válidos (end_time nulo também passa).
  insert into schedule_events (church_id, category, day_of_week, time, end_time)
  values (v_church, 'mass', 0, '00:00', '23:59')
  returning id into v_event;
  insert into schedule_events (church_id, category, day_of_week, time)
  values (v_church, 'mass', 0, '07:30');
  insert into activity_schedules (activity_id, day_of_week, time, end_time)
  values (v_activity, 1, '19:00', '20:30')
  returning id into v_schedule;
  insert into activity_schedules (activity_id, day_of_week, time)
  values (v_activity, 1, '06:05');

  foreach v_invalid in array array['24:00', '7:30', '', ' ', ' 07:00', '07:00 ', '23:60', '7h', '07:00:00'] loop
    -- schedule_events.time
    v_blocked := false;
    begin
      insert into schedule_events (church_id, category, time) values (v_church, 'mass', v_invalid);
    exception when check_violation then v_blocked := true;
    end;
    if not v_blocked then
      raise exception 'FALHOU 3: schedule_events aceitou time = %', quote_literal(v_invalid);
    end if;

    -- schedule_events.end_time (update de linha válida)
    v_blocked := false;
    begin
      update schedule_events set end_time = v_invalid where id = v_event;
    exception when check_violation then v_blocked := true;
    end;
    if not v_blocked then
      raise exception 'FALHOU 3: schedule_events aceitou end_time = %', quote_literal(v_invalid);
    end if;

    -- activity_schedules.time
    v_blocked := false;
    begin
      insert into activity_schedules (activity_id, time) values (v_activity, v_invalid);
    exception when check_violation then v_blocked := true;
    end;
    if not v_blocked then
      raise exception 'FALHOU 3: activity_schedules aceitou time = %', quote_literal(v_invalid);
    end if;

    -- activity_schedules.end_time (update de linha válida)
    v_blocked := false;
    begin
      update activity_schedules set end_time = v_invalid where id = v_schedule;
    exception when check_violation then v_blocked := true;
    end;
    if not v_blocked then
      raise exception 'FALHOU 3: activity_schedules aceitou end_time = %', quote_literal(v_invalid);
    end if;
  end loop;

  raise notice 'OK 3: horários fora de HH:MM recusados; válidos e end_time nulo aceitos';
end $$;

-- ============================================
-- 4. Datas do clero e dos vínculos: inválidas são recusadas, válidas passam
-- ============================================
do $$
declare
  v_church uuid := current_setting('verif.church_id')::uuid;
  v_clergy uuid := current_setting('verif.clergy_id')::uuid;
  v_invalid text;
  v_column text;
  v_blocked boolean;
  v_link uuid;
begin
  -- Válidos: só o ano, data completa e bissexto; nulos também passam.
  update clergy set birth_date = '1970-05-20', death_date = '2026' where id = v_clergy;
  update clergy set birth_date = '1952', death_date = '2024-02-29' where id = v_clergy;
  update clergy set birth_date = null, death_date = null where id = v_clergy;

  insert into church_clergy (church_id, clergy_id, start_date, end_date, is_active)
  values (v_church, v_clergy, '2011', '2020-12-31', false)
  returning id into v_link;
  insert into church_clergy (church_id, clergy_id, start_date, end_date, is_active)
  values (v_church, v_clergy, '2021-01-15', null, true);

  foreach v_invalid in array array['2024-02-30', '0000', '', ' ', ' 1970', '1970 ', '1970-05', '2023-02-29', '20/05/1970'] loop
    foreach v_column in array array['birth_date', 'death_date'] loop
      v_blocked := false;
      begin
        execute format('update clergy set %I = $1 where id = $2', v_column)
        using v_invalid, v_clergy;
      exception when check_violation then v_blocked := true;
      end;
      if not v_blocked then
        raise exception 'FALHOU 4: clergy aceitou % = %', v_column, quote_literal(v_invalid);
      end if;
    end loop;

    foreach v_column in array array['start_date', 'end_date'] loop
      v_blocked := false;
      begin
        execute format('update church_clergy set %I = $1 where id = $2', v_column)
        using v_invalid, v_link;
      exception when check_violation then v_blocked := true;
      end;
      if not v_blocked then
        raise exception 'FALHOU 4: church_clergy aceitou % = %', v_column, quote_literal(v_invalid);
      end if;
    end loop;

    v_blocked := false;
    begin
      insert into clergy (name, role, birth_date)
      values ('Clérigo de verificação 016 (inválido)', 'vicar', v_invalid);
    exception when check_violation then v_blocked := true;
    end;
    if not v_blocked then
      raise exception 'FALHOU 4: insert em clergy aceitou birth_date = %', quote_literal(v_invalid);
    end if;
  end loop;

  raise notice 'OK 4: datas fora de YYYY ou YYYY-MM-DD real recusadas; válidas e nulas aceitas';
end $$;

-- ============================================
-- 5. Vínculo duplicado: com start_date nulo também é recusado
-- ============================================
do $$
declare
  v_church uuid := current_setting('verif.church_id')::uuid;
  v_clergy uuid := current_setting('verif.clergy_id')::uuid;
  v_blocked boolean;
  v_rows integer;
begin
  insert into church_clergy (church_id, clergy_id, start_date, is_active)
  values (v_church, v_clergy, null, false);

  v_blocked := false;
  begin
    insert into church_clergy (church_id, clergy_id, start_date, is_active)
    values (v_church, v_clergy, null, false);
  exception when unique_violation then v_blocked := true;
  end;
  if not v_blocked then
    raise exception 'FALHOU 5: aceitou dois vínculos iguais com start_date nulo';
  end if;

  v_blocked := false;
  begin
    insert into church_clergy (church_id, clergy_id, start_date, is_active)
    values (v_church, v_clergy, '2011', false);
  exception when unique_violation then v_blocked := true;
  end;
  if not v_blocked then
    raise exception 'FALHOU 5: aceitou dois vínculos iguais com o mesmo start_date';
  end if;

  -- Upsert do seed (onConflict: "church_id,clergy_id,start_date") com
  -- start_date nulo: atualiza a linha existente em vez de duplicar.
  insert into church_clergy (church_id, clergy_id, start_date, end_date, is_active)
  values (v_church, v_clergy, null, '2010', false)
  on conflict (church_id, clergy_id, start_date)
  do update set end_date = excluded.end_date;

  select count(*) into v_rows
  from church_clergy
  where church_id = v_church and clergy_id = v_clergy and start_date is null;
  if v_rows <> 1 then
    raise exception 'FALHOU 5: upsert com start_date nulo gerou % linhas', v_rows;
  end if;

  if not exists (
    select 1 from church_clergy
    where church_id = v_church and clergy_id = v_clergy
      and start_date is null and end_date = '2010'
  ) then
    raise exception 'FALHOU 5: upsert com start_date nulo não atualizou a linha existente';
  end if;

  -- Outro start_date na mesma igreja continua permitido (novo período).
  insert into church_clergy (church_id, clergy_id, start_date, is_active)
  values (v_church, v_clergy, '2030', false);

  raise notice 'OK 5: vínculo duplicado recusado também com start_date nulo; upsert do seed atualiza';
end $$;

rollback;
