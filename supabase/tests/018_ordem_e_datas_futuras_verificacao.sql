-- Roteiro de verificação da migration 018 (VF-105: ordem das datas e dos
-- horários, datas do clero não futuras).
--
-- Como usar:
--   1. Rode a pré-verificação (018_ordem_e_datas_futuras_pre_verificacao.sql).
--   2. Aplique a 018 no SQL Editor do Supabase.
--   3. Cole este arquivo inteiro no SQL Editor e execute.
--   4. Sem erro: todas as verificações passaram. Com erro: a mensagem começa
--      com "FALHOU" e diz qual verificação não bateu.
--
-- Nada é gravado: tudo roda dentro de begin … rollback. Se uma verificação
-- falhar, a transação é abortada e também não grava nada.
--
-- Roda com o papel do SQL Editor (dono das tabelas, sem RLS): o que se testa
-- aqui são as constraints e os triggers, que valem para qualquer papel. A
-- seção 6 desliga o trigger por um instante, dentro da transação, para criar
-- uma linha antiga com data futura; o rollback desfaz isso também.
--
-- Os casos de borda são os mesmos dos testes unitários de
-- isClergyDateOrderValid(), isClergyDateNotFuture() (lib/utils/clergy-dates.test.ts)
-- e isScheduleTimeOrderValid() (lib/utils/schedule.test.ts).

begin;

-- ============================================
-- 1. Funções: mesmos casos de borda do TypeScript
-- ============================================
do $$
declare
  v_case record;
  v_result boolean;
begin
  -- Ordem das datas: menor precisão comum, igualdade aceita.
  for v_case in
    select * from (values
      ('2020', '2020-05-01', true), ('2020-05-01', '2020', true),
      ('2020', '2020', true), ('2020-05-01', '2020-05-01', true),
      ('2020-05-01', '2020-05-02', true), ('2011', '2026', true),
      ('1970-05-20', '2026', true), ('2000-02-29', '2000-03-01', true),
      ('2021', '2020-12-31', false), ('2021-01-01', '2020', false),
      ('2021', '2020', false), ('2020-05-02', '2020-05-01', false),
      ('2020-01-01', '2019-12-31', false),
      -- Nulo ou formato inválido: não opina.
      (null, '2020', true), ('2020', null, true), (null, null, true),
      ('2021', '2020-02-30', true), ('', '2020', true), ('2021 ', '2020', true)
    ) as t(anterior, posterior, esperado)
  loop
    v_result := public.is_clergy_date_order_valid(v_case.anterior, v_case.posterior);
    if v_result is distinct from v_case.esperado then
      raise exception 'FALHOU 1: is_clergy_date_order_valid(%, %) devolveu %, esperado %',
        quote_nullable(v_case.anterior), quote_nullable(v_case.posterior), v_result, v_case.esperado;
    end if;
  end loop;

  -- Não futura, com hoje = 2026-10-31.
  for v_case in
    select * from (values
      ('2026-10-31', '2026-10-31', true), ('2026-10-30', '2026-10-31', true),
      ('2026', '2026-10-31', true), ('2025-12-31', '2026-10-31', true),
      ('1970', '2026-10-31', true), ('0001-01-01', '2026-10-31', true),
      ('2026-11-01', '2026-10-31', false), ('2027', '2026-10-31', false),
      ('2027-01-01', '2026-10-31', false), ('9999', '2026-10-31', false),
      ('2026', '2026-01-01', true), ('2027', '2026-12-31', false),
      (null, '2026-10-31', true), ('2099-02-30', '2026-10-31', true)
    ) as t(valor, hoje, esperado)
  loop
    v_result := public.is_clergy_date_not_future(v_case.valor, v_case.hoje);
    if v_result is distinct from v_case.esperado then
      raise exception 'FALHOU 1: is_clergy_date_not_future(%, %) devolveu %, esperado %',
        quote_nullable(v_case.valor), quote_literal(v_case.hoje), v_result, v_case.esperado;
    end if;
  end loop;

  -- Ordem dos horários: estrita, sem atravessar a meia-noite.
  for v_case in
    select * from (values
      ('07:00', '07:01', true), ('06:30', '17:30', true), ('00:00', '23:59', true),
      ('09:59', '10:00', true), ('19:00', '20:30', true),
      ('07:00', '07:00', false), ('18:00', '17:59', false), ('23:59', '00:00', false),
      ('22:00', '01:00', false), ('10:00', '09:59', false),
      ('07:00', null, true), (null, '07:00', true),
      ('7:30', '07:00', true), ('18:00', '24:00', true), ('18:00', '', true)
    ) as t(inicio, termino, esperado)
  loop
    v_result := public.is_schedule_time_order_valid(v_case.inicio, v_case.termino);
    if v_result is distinct from v_case.esperado then
      raise exception 'FALHOU 1: is_schedule_time_order_valid(%, %) devolveu %, esperado %',
        quote_nullable(v_case.inicio), quote_nullable(v_case.termino), v_result, v_case.esperado;
    end if;
  end loop;

  if public.clergy_today_in_maceio()
    is distinct from to_char(now() at time zone 'America/Maceio', 'YYYY-MM-DD')
  then
    raise exception 'FALHOU 1: clergy_today_in_maceio() devolveu %', public.clergy_today_in_maceio();
  end if;

  raise notice 'OK 1: funções de ordem e de data futura batem com os casos de borda do TypeScript';
end $$;

-- ============================================
-- 2. Estrutura: constraints validadas, triggers BEFORE, search_path fixo
-- ============================================
do $$
declare
  v_name text;
  v_validated boolean;
begin
  foreach v_name in array array[
    'church_clergy_dates_order_check',
    'clergy_vital_dates_order_check',
    'schedule_events_time_order_check',
    'activity_schedules_time_order_check'
  ] loop
    select convalidated into v_validated
    from pg_constraint
    where conname = v_name and connamespace = 'public'::regnamespace;

    if v_validated is null then
      raise exception 'FALHOU 2: constraint % não existe', v_name;
    end if;
    if not v_validated then
      raise exception 'FALHOU 2: constraint % ainda está "not valid" (rode a seção 4 da 018)', v_name;
    end if;
  end loop;

  -- tgtype (máscara de bits), valores: 2 = BEFORE, 4 = INSERT, 16 = UPDATE.
  if (
    select count(*)
    from pg_trigger
    where not tgisinternal
      and tgenabled = 'O'
      and tgtype & 2 = 2 and tgtype & 4 = 4 and tgtype & 16 = 16
      and tgfoid = 'public.enforce_clergy_dates_not_future()'::regprocedure
      and (
        (tgname = 'clergy_dates_not_future' and tgrelid = 'public.clergy'::regclass)
        or (tgname = 'church_clergy_dates_not_future' and tgrelid = 'public.church_clergy'::regclass)
      )
  ) <> 2 then
    raise exception 'FALHOU 2: triggers BEFORE INSERT OR UPDATE clergy_dates_not_future e church_clergy_dates_not_future não estão ativos';
  end if;

  if exists (
    select 1
    from pg_proc
    where pronamespace = 'public'::regnamespace
      and proname in (
        'is_clergy_date_order_valid', 'is_clergy_date_not_future',
        'clergy_today_in_maceio', 'is_schedule_time_order_valid',
        'enforce_clergy_dates_not_future'
      )
      and not coalesce('search_path=""' = any(proconfig), false)
  ) or (
    select count(*) from pg_proc
    where pronamespace = 'public'::regnamespace
      and proname in (
        'is_clergy_date_order_valid', 'is_clergy_date_not_future',
        'clergy_today_in_maceio', 'is_schedule_time_order_valid',
        'enforce_clergy_dates_not_future'
      )
  ) <> 5 then
    raise exception 'FALHOU 2: as 5 funções da 018 precisam existir com search_path vazio';
  end if;

  raise notice 'OK 2: 4 constraints validadas, 2 triggers BEFORE ativos, 5 funções com search_path fixo';
end $$;

-- ============================================
-- Preparação: igreja, atividade e clérigo de teste (somem no rollback)
-- ============================================
do $$
declare
  v_church uuid;
  v_activity uuid;
  v_clergy uuid;
  v_today date := (now() at time zone 'America/Maceio')::date;
begin
  insert into churches (name, slug, address, district)
  values ('Igreja de verificação 018', 'igreja-verificacao-018', 'Rua 018', 'Centro')
  returning id into v_church;

  insert into activities (church_id, name)
  values (v_church, 'Atividade de verificação 018')
  returning id into v_activity;

  insert into clergy (name, role)
  values ('Clérigo de verificação 018', 'vicar')
  returning id into v_clergy;

  perform set_config('verif.church_id', v_church::text, true);
  perform set_config('verif.activity_id', v_activity::text, true);
  perform set_config('verif.clergy_id', v_clergy::text, true);
  perform set_config('verif.today', to_char(v_today, 'YYYY-MM-DD'), true);
  perform set_config('verif.tomorrow', to_char(v_today + 1, 'YYYY-MM-DD'), true);
  perform set_config('verif.this_year', to_char(v_today, 'YYYY'), true);
  perform set_config('verif.next_year', to_char(v_today + interval '1 year', 'YYYY'), true);
end $$;

-- ============================================
-- 3. Horários: término igual ou antes do início é recusado
-- ============================================
do $$
declare
  v_church uuid := current_setting('verif.church_id')::uuid;
  v_activity uuid := current_setting('verif.activity_id')::uuid;
  v_pair text[];
  v_blocked boolean;
  v_event uuid;
  v_schedule uuid;
begin
  -- Válidos (término nulo também passa).
  insert into schedule_events (church_id, category, day_of_week, time, end_time)
  values (v_church, 'adoration', 4, '06:30', '17:30')
  returning id into v_event;
  insert into schedule_events (church_id, category, day_of_week, time, end_time)
  values (v_church, 'mass', 0, '07:00', '07:01');
  insert into schedule_events (church_id, category, day_of_week, time)
  values (v_church, 'mass', 0, '19:00');
  insert into activity_schedules (activity_id, day_of_week, time, end_time)
  values (v_activity, 1, '19:00', '20:30')
  returning id into v_schedule;
  insert into activity_schedules (activity_id, day_of_week, time)
  values (v_activity, 1, '06:05');

  foreach v_pair slice 1 in array array[
    array['07:00', '07:00'], array['18:00', '17:59'],
    array['23:59', '00:00'], array['22:00', '01:00']
  ] loop
    v_blocked := false;
    begin
      insert into schedule_events (church_id, category, time, end_time)
      values (v_church, 'mass', v_pair[1], v_pair[2]);
    exception when check_violation then v_blocked := true;
    end;
    if not v_blocked then
      raise exception 'FALHOU 3: schedule_events aceitou % às %', v_pair[1], v_pair[2];
    end if;

    v_blocked := false;
    begin
      update schedule_events set time = v_pair[1], end_time = v_pair[2] where id = v_event;
    exception when check_violation then v_blocked := true;
    end;
    if not v_blocked then
      raise exception 'FALHOU 3: update em schedule_events aceitou % às %', v_pair[1], v_pair[2];
    end if;

    v_blocked := false;
    begin
      insert into activity_schedules (activity_id, time, end_time)
      values (v_activity, v_pair[1], v_pair[2]);
    exception when check_violation then v_blocked := true;
    end;
    if not v_blocked then
      raise exception 'FALHOU 3: activity_schedules aceitou % às %', v_pair[1], v_pair[2];
    end if;

    v_blocked := false;
    begin
      update activity_schedules set time = v_pair[1], end_time = v_pair[2] where id = v_schedule;
    exception when check_violation then v_blocked := true;
    end;
    if not v_blocked then
      raise exception 'FALHOU 3: update em activity_schedules aceitou % às %', v_pair[1], v_pair[2];
    end if;
  end loop;

  -- Mudar só o início para depois do término também é recusado.
  v_blocked := false;
  begin
    update schedule_events set time = '18:00' where id = v_event;
  exception when check_violation then v_blocked := true;
  end;
  if not v_blocked then
    raise exception 'FALHOU 3: update só do início deixou o término antes do início';
  end if;

  raise notice 'OK 3: término igual ou antes do início recusado (inclui 22:00 às 01:00); válidos e término nulo aceitos';
end $$;

-- ============================================
-- 4. Ordem das datas: fim antes do início e falecimento antes do nascimento
-- ============================================
do $$
declare
  v_church uuid := current_setting('verif.church_id')::uuid;
  v_clergy uuid := current_setting('verif.clergy_id')::uuid;
  v_pair text[];
  v_blocked boolean;
  v_link uuid;
begin
  -- Válidos: precisões diferentes com o mesmo ano, igualdade, período aberto.
  update clergy set birth_date = '1970-05-20', death_date = '2020' where id = v_clergy;
  update clergy set birth_date = '2020', death_date = '2020-05-01' where id = v_clergy;
  update clergy set birth_date = '2020-05-01', death_date = '2020-05-01' where id = v_clergy;
  update clergy set birth_date = '1952', death_date = null where id = v_clergy;

  insert into church_clergy (church_id, clergy_id, start_date, end_date, is_active)
  values (v_church, v_clergy, '2020', '2020-05-01', false)
  returning id into v_link;
  insert into church_clergy (church_id, clergy_id, start_date, end_date, is_active)
  values (v_church, v_clergy, '2020-05-01', '2020', false);
  insert into church_clergy (church_id, clergy_id, start_date, end_date, is_active)
  values (v_church, v_clergy, '2021-01-15', null, true);

  foreach v_pair slice 1 in array array[
    array['2021', '2020-12-31'], array['2021-01-01', '2020'],
    array['2021', '2020'], array['2020-05-02', '2020-05-01']
  ] loop
    v_blocked := false;
    begin
      update clergy set birth_date = v_pair[1], death_date = v_pair[2] where id = v_clergy;
    exception when check_violation then v_blocked := true;
    end;
    if not v_blocked then
      raise exception 'FALHOU 4: clergy aceitou nascimento % e falecimento %', v_pair[1], v_pair[2];
    end if;

    v_blocked := false;
    begin
      update church_clergy set start_date = v_pair[1], end_date = v_pair[2] where id = v_link;
    exception when check_violation then v_blocked := true;
    end;
    if not v_blocked then
      raise exception 'FALHOU 4: church_clergy aceitou início % e fim %', v_pair[1], v_pair[2];
    end if;

    v_blocked := false;
    begin
      insert into clergy (name, role, birth_date, death_date)
      values ('Clérigo de verificação 018 (inválido)', 'vicar', v_pair[1], v_pair[2]);
    exception when check_violation then v_blocked := true;
    end;
    if not v_blocked then
      raise exception 'FALHOU 4: insert em clergy aceitou nascimento % e falecimento %', v_pair[1], v_pair[2];
    end if;
  end loop;

  raise notice 'OK 4: fim antes do início e falecimento antes do nascimento recusados; mesmo ano e igualdade aceitos';
end $$;

-- ============================================
-- 5. Datas futuras: recusadas em insert e update, nas quatro colunas
-- ============================================
do $$
declare
  v_church uuid := current_setting('verif.church_id')::uuid;
  v_clergy uuid := current_setting('verif.clergy_id')::uuid;
  v_future text;
  v_column text;
  v_blocked boolean;
  v_constraint text;
  v_detail text;
  v_link uuid;
begin
  -- Hoje e o ano atual passam.
  update clergy set birth_date = null, death_date = current_setting('verif.today') where id = v_clergy;
  update clergy set death_date = current_setting('verif.this_year') where id = v_clergy;

  insert into church_clergy (church_id, clergy_id, start_date, end_date, is_active)
  values (v_church, v_clergy, current_setting('verif.this_year'), current_setting('verif.today'), false)
  returning id into v_link;

  foreach v_future in array array[
    current_setting('verif.tomorrow'), current_setting('verif.next_year'), '9999'
  ] loop
    foreach v_column in array array['birth_date', 'death_date'] loop
      update clergy set birth_date = null, death_date = null where id = v_clergy;
      v_blocked := false;
      v_constraint := null;
      v_detail := null;
      begin
        execute format('update clergy set %I = $1 where id = $2', v_column)
        using v_future, v_clergy;
      exception when check_violation then
        v_blocked := true;
        get stacked diagnostics v_constraint = constraint_name, v_detail = pg_exception_detail;
      end;
      if not v_blocked then
        raise exception 'FALHOU 5: clergy aceitou % = % (futura)', v_column, v_future;
      end if;
      if v_constraint is distinct from format('clergy_%s_not_future', v_column) then
        raise exception 'FALHOU 5: clergy.% futura recusada pela constraint %, esperado clergy_%_not_future',
          v_column, v_constraint, v_column;
      end if;
      -- O PostgREST não repassa constraint_name; o app lê o nome em error.details.
      if v_detail is distinct from v_constraint then
        raise exception 'FALHOU 5: clergy.% futura sem o nome da regra no DETAIL (veio %)', v_column, v_detail;
      end if;

      v_blocked := false;
      begin
        execute format('insert into clergy (name, role, %I) values ($1, $2, $3)', v_column)
        using 'Clérigo de verificação 018 (futuro)', 'vicar', v_future;
      exception when check_violation then v_blocked := true;
      end;
      if not v_blocked then
        raise exception 'FALHOU 5: insert em clergy aceitou % = % (futura)', v_column, v_future;
      end if;
    end loop;

    foreach v_column in array array['start_date', 'end_date'] loop
      update church_clergy set start_date = null, end_date = null where id = v_link;
      v_blocked := false;
      v_constraint := null;
      v_detail := null;
      begin
        execute format('update church_clergy set %I = $1 where id = $2', v_column)
        using v_future, v_link;
      exception when check_violation then
        v_blocked := true;
        get stacked diagnostics v_constraint = constraint_name, v_detail = pg_exception_detail;
      end;
      if not v_blocked then
        raise exception 'FALHOU 5: church_clergy aceitou % = % (futura)', v_column, v_future;
      end if;
      if v_constraint is distinct from format('church_clergy_%s_not_future', v_column) then
        raise exception 'FALHOU 5: church_clergy.% futura recusada pela constraint %', v_column, v_constraint;
      end if;
      if v_detail is distinct from v_constraint then
        raise exception 'FALHOU 5: church_clergy.% futura sem o nome da regra no DETAIL (veio %)', v_column, v_detail;
      end if;

      v_blocked := false;
      begin
        execute format('insert into church_clergy (church_id, clergy_id, %I, is_active) values ($1, $2, $3, false)', v_column)
        using v_church, v_clergy, v_future;
      exception when check_violation then v_blocked := true;
      end;
      if not v_blocked then
        raise exception 'FALHOU 5: insert em church_clergy aceitou % = % (futura)', v_column, v_future;
      end if;
    end loop;
  end loop;

  raise notice 'OK 5: datas futuras recusadas (amanhã, ano que vem), com o nome da regra no DETAIL; hoje e o ano atual aceitos';
end $$;

-- ============================================
-- 6. Linha antiga com data futura: editar outra coluna continua possível
-- ============================================
do $$
declare
  v_church uuid := current_setting('verif.church_id')::uuid;
  v_clergy uuid;
  v_link uuid;
  v_blocked boolean;
begin
  -- Simula legado anterior à 018 (o rollback religa o trigger).
  alter table clergy disable trigger clergy_dates_not_future;
  alter table church_clergy disable trigger church_clergy_dates_not_future;

  insert into clergy (name, role, birth_date)
  values ('Clérigo legado 018', 'vicar', current_setting('verif.next_year'))
  returning id into v_clergy;
  insert into church_clergy (church_id, clergy_id, start_date, is_active)
  values (v_church, v_clergy, current_setting('verif.tomorrow'), true)
  returning id into v_link;

  alter table clergy enable trigger clergy_dates_not_future;
  alter table church_clergy enable trigger church_clergy_dates_not_future;

  -- Outra coluna, a mesma data repetida no SET e a outra data do par: passam.
  update clergy set bio = 'Bio editada na verificação 018' where id = v_clergy;
  update clergy set birth_date = birth_date, name = 'Clérigo legado 018 (editado)' where id = v_clergy;
  update church_clergy set is_active = false where id = v_link;
  update church_clergy set start_date = start_date where id = v_link;

  -- Trocar a data futura por outra futura: recusado.
  v_blocked := false;
  begin
    update clergy set birth_date = '9999' where id = v_clergy;
  exception when check_violation then v_blocked := true;
  end;
  if not v_blocked then
    raise exception 'FALHOU 6: clergy aceitou trocar a data futura por outra futura';
  end if;

  -- Corrigir para uma data passada: passa.
  update clergy set birth_date = '1970' where id = v_clergy;
  update church_clergy set start_date = '2020' where id = v_link;

  raise notice 'OK 6: linha antiga com data futura editável em outras colunas; nova data futura recusada';
end $$;

rollback;
