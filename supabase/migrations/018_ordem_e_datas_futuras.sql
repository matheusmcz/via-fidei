-- VF-105: ordem das datas e dos horários (D16) e datas do clero não futuras (D17).
--
-- 1. Ordem por CHECK (função imutável de comparação):
--    - church_clergy: end_date ≥ start_date;
--    - clergy: death_date ≥ birth_date;
--    - schedule_events e activity_schedules: end_time > time (estrito).
-- 2. "Não futura" por trigger BEFORE INSERT OR UPDATE em clergy (birth_date,
--    death_date) e church_clergy (start_date, end_date).
--
-- Depende da 016 (is_valid_schedule_time, is_valid_clergy_date).
--
-- Antes de aplicar: rode supabase/tests/018_ordem_e_datas_futuras_pre_verificacao.sql.
-- Depois de aplicar: rode supabase/tests/018_ordem_e_datas_futuras_verificacao.sql.
--
-- Idempotente: pode rodar de novo (create or replace, drop … if exists).
--
-- Comparação de datas com precisões diferentes (YYYY × YYYY-MM-DD): vale a
-- menor precisão comum. Se um dos lados tem só o ano, compara-se só o ano:
--   início 2020 e fim 2020-05-01 → válido (mesmo ano);
--   início 2021 e fim 2020-12-31 → inválido;
--   mesmo ano dos dois lados     → válido, qualquer que seja a precisão.
-- A ordem das datas aceita igualdade; a dos horários, não (07:00 às 07:00 é
-- recusado). Horário que atravessa a meia-noite (22:00 às 01:00) também é
-- recusado (D21): vigília que vira o dia fica só com o horário de início.
--
-- Por que "não futura" não é CHECK: depende de now(). Um CHECK precisa dar o
-- mesmo resultado sempre (o Postgres reavalia em validate, restauração e
-- pg_upgrade); com now() ele mudaria de resposta com o tempo. O trigger só
-- avalia as colunas que mudaram (insert, ou update com valor diferente do
-- antigo): linha antiga com data futura não trava a edição de outra coluna.
-- "Hoje" é o dia em America/Maceio (UTC-3, sem horário de verão), e um ano
-- sozinho vale até o fim do ano atual.
--
-- Por que "not valid" seguido de "validate constraint" (seção 4), como na 016:
--   - Pré-verificação sem bloqueios (caso esperado): rode o arquivo inteiro.
--   - Com linhas fora de ordem que não dá para corrigir agora: rode só as
--     seções 0 a 3. Os CHECKs passam a barrar toda gravação nova, sem exigir
--     que o legado esteja limpo; corrija as linhas e rode a seção 4 depois.
--   - Se a seção 4 falhar, a mensagem cita a constraint, e a linha aparece na
--     pré-verificação. O "validate" não troca nem remove nada.
--
-- Triggers da 017 (auditoria, AFTER): não há interferência. Os triggers daqui
-- são BEFORE, não alteram NEW e só levantam erro; quando recusam, a gravação
-- não acontece e o AFTER não roda. Em clergy, o BEFORE UPDATE
-- clergy_updated_at (005) mexe só em updated_at.
--
-- Correspondência com o TypeScript (mesma regra, mesmos casos de borda testados):
--   public.is_clergy_date_order_valid(text, text)   ↔ isClergyDateOrderValid()   (lib/utils/clergy-dates.ts)
--   public.is_clergy_date_not_future(text, text)    ↔ isClergyDateNotFuture()    (lib/utils/clergy-dates.ts)
--   public.clergy_today_in_maceio()                 ↔ getTodayInMaceio()         (lib/utils/clergy-dates.ts)
--   public.is_schedule_time_order_valid(text, text) ↔ isScheduleTimeOrderValid() (lib/utils/schedule.ts)
-- A pré-verificação repete o corpo das funções (elas ainda não existem quando
-- ela roda): mudou a regra aqui, mude lá também.
--
-- Não revogar EXECUTE dessas funções de anon/authenticated: os CHECKs e o
-- trigger as executam com o papel de quem grava. São puras (ou só leem o
-- relógio) e não leem tabelas; expô-las como RPC no PostgREST é inofensivo.

-- ============================================
-- 0. Requisito: 016 aplicada
-- ============================================
do $$
begin
  if to_regprocedure('public.is_valid_clergy_date(text)') is null
    or to_regprocedure('public.is_valid_schedule_time(text)') is null
  then
    raise exception 'A 018 precisa da 016 aplicada (funções is_valid_clergy_date e is_valid_schedule_time)';
  end if;
end $$;

-- ============================================
-- 1. Funções de comparação (puras, imutáveis)
-- ============================================

-- later ≥ earlier na menor precisão comum. Não opina (true) com nulo ou com
-- formato inválido: o formato é do CHECK da 016. Compara texto com
-- collate "C" (byte a byte), que não depende da collation do banco.
create or replace function public.is_clergy_date_order_valid(earlier text, later text)
returns boolean
language sql
immutable
parallel safe
set search_path = ''
as $$
  select case
    when earlier is null or later is null then true
    when not public.is_valid_clergy_date(earlier)
      or not public.is_valid_clergy_date(later) then true
    when length(earlier) = 4 or length(later) = 4 then
      substr(later, 1, 4) collate "C" >= substr(earlier, 1, 4) collate "C"
    else later collate "C" >= earlier collate "C"
  end;
$$;

comment on function public.is_clergy_date_order_valid(text, text) is
  'Data posterior ≥ anterior na menor precisão comum (YYYY × YYYY-MM-DD compara só o ano). Nulo ou formato inválido: true. Mesma regra de isClergyDateOrderValid() em lib/utils/clergy-dates.ts (VF-105).';

-- value ≤ today na menor precisão comum (um ano sozinho vale até o fim do ano
-- de today). today é YYYY-MM-DD; recebido por parâmetro para ser testável.
-- Não opina (true) com valor nulo ou fora do formato.
-- Diferença em relação ao TS: com today inválido, isClergyDateNotFuture()
-- lança erro e esta função, não (devolve true se today for nulo e compara só
-- o ano se today for YYYY). Uma função SQL imutável não levanta erro sem
-- plpgsql; o trigger sempre passa clergy_today_in_maceio(), que é YYYY-MM-DD.
create or replace function public.is_clergy_date_not_future(value text, today text)
returns boolean
language sql
immutable
parallel safe
set search_path = ''
as $$
  select public.is_clergy_date_order_valid(value, today);
$$;

comment on function public.is_clergy_date_not_future(text, text) is
  'Data do clero ≤ today (YYYY-MM-DD); um ano sozinho vale até o fim do ano atual. Nulo ou formato inválido: true. Mesma regra de isClergyDateNotFuture() em lib/utils/clergy-dates.ts (VF-105), exceto com today inválido: o TS lança erro e esta função não valida today.';

-- Dia de hoje em Maceió, YYYY-MM-DD. stable: muda com o relógio, então não
-- pode ser usada em CHECK (só no trigger).
create or replace function public.clergy_today_in_maceio()
returns text
language sql
stable
parallel safe
set search_path = ''
as $$
  select to_char(pg_catalog.now() at time zone 'America/Maceio', 'YYYY-MM-DD');
$$;

comment on function public.clergy_today_in_maceio() is
  'Dia de hoje em America/Maceio (YYYY-MM-DD). Mesma regra de getTodayInMaceio() em lib/utils/clergy-dates.ts (VF-105).';

-- end_time > start_time, estrito. HH:MM com dois dígitos: a ordem do texto é
-- a do horário. Não opina (true) com nulo ou com formato inválido.
create or replace function public.is_schedule_time_order_valid(start_time text, end_time text)
returns boolean
language sql
immutable
parallel safe
set search_path = ''
as $$
  select case
    when start_time is null or end_time is null then true
    when not public.is_valid_schedule_time(start_time)
      or not public.is_valid_schedule_time(end_time) then true
    else end_time collate "C" > start_time collate "C"
  end;
$$;

comment on function public.is_schedule_time_order_valid(text, text) is
  'Término depois do início (end_time > time, estrito; não atravessa a meia-noite). Nulo ou formato inválido: true. Mesma regra de isScheduleTimeOrderValid() em lib/utils/schedule.ts (VF-105).';

-- ============================================
-- 2. CHECK de ordem (not valid: valem já para gravações novas)
-- ============================================

alter table church_clergy drop constraint if exists church_clergy_dates_order_check;
alter table church_clergy
  add constraint church_clergy_dates_order_check
  check (public.is_clergy_date_order_valid(start_date, end_date)) not valid;

alter table clergy drop constraint if exists clergy_vital_dates_order_check;
alter table clergy
  add constraint clergy_vital_dates_order_check
  check (public.is_clergy_date_order_valid(birth_date, death_date)) not valid;

alter table schedule_events drop constraint if exists schedule_events_time_order_check;
alter table schedule_events
  add constraint schedule_events_time_order_check
  check (public.is_schedule_time_order_valid(time, end_time)) not valid;

alter table activity_schedules drop constraint if exists activity_schedules_time_order_check;
alter table activity_schedules
  add constraint activity_schedules_time_order_check
  check (public.is_schedule_time_order_valid(time, end_time)) not valid;

-- ============================================
-- 3. Trigger: datas do clero não futuras
-- ============================================

-- Recebe os nomes das colunas de data em TG_ARGV. Avalia só as que mudaram:
-- no insert, todas; no update, as que têm valor diferente do antigo. O erro
-- usa o código check_violation (23514) e o nome <tabela>_<coluna>_not_future.
-- O nome vai também no DETAIL, porque o PostgREST repassa code, message,
-- details e hint, mas não o constraint_name: no supabase-js, o app o lê em
-- error.details (nos CHECKs, ele vem dentro de error.message).
create or replace function public.enforce_clergy_dates_not_future()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_today text := public.clergy_today_in_maceio();
  v_new jsonb := pg_catalog.to_jsonb(new);
  v_old jsonb := case when tg_op = 'UPDATE' then pg_catalog.to_jsonb(old) end;
  v_column text;
  v_value text;
begin
  foreach v_column in array tg_argv loop
    v_value := v_new ->> v_column;

    if tg_op = 'UPDATE' and v_value is not distinct from (v_old ->> v_column) then
      continue;
    end if;

    if not public.is_clergy_date_not_future(v_value, v_today) then
      raise exception using
        errcode = 'check_violation',
        message = pg_catalog.format(
          '%s.%s não pode ser futura: %s (hoje em America/Maceio: %s)',
          tg_table_name, v_column, v_value, v_today
        ),
        detail = pg_catalog.format('%s_%s_not_future', tg_table_name, v_column),
        table = tg_table_name,
        column = v_column,
        constraint = pg_catalog.format('%s_%s_not_future', tg_table_name, v_column);
    end if;
  end loop;

  return new;
end;
$$;

comment on function public.enforce_clergy_dates_not_future() is
  'Trigger BEFORE INSERT OR UPDATE: recusa data do clero futura (D17) nas colunas passadas como argumento, só quando a coluna muda (VF-105).';

drop trigger if exists clergy_dates_not_future on clergy;
create trigger clergy_dates_not_future
  before insert or update of birth_date, death_date on clergy
  for each row
  execute function public.enforce_clergy_dates_not_future('birth_date', 'death_date');

drop trigger if exists church_clergy_dates_not_future on church_clergy;
create trigger church_clergy_dates_not_future
  before insert or update of start_date, end_date on church_clergy
  for each row
  execute function public.enforce_clergy_dates_not_future('start_date', 'end_date');

-- ============================================
-- 4. Validação das linhas existentes
-- ============================================
alter table church_clergy validate constraint church_clergy_dates_order_check;
alter table clergy validate constraint clergy_vital_dates_order_check;
alter table schedule_events validate constraint schedule_events_time_order_check;
alter table activity_schedules validate constraint activity_schedules_time_order_check;
