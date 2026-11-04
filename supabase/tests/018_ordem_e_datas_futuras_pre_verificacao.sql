-- Pré-verificação da migration 018 (VF-105: ordem das datas e dos horários,
-- datas do clero não futuras).
--
-- Como usar:
--   1. ANTES de aplicar a 018, cole este arquivo inteiro no SQL Editor do
--      Supabase e execute. Ele só lê (um único select), não grava nada.
--   2. Resultado vazio: pode aplicar a 018 inteira.
--   3. Linhas com bloqueia_018 = true: a 018 inteira falha no "validate" (ou
--      na seção 0, se a 016 não estiver aplicada). Corrija as linhas antes, ou
--      aplique só as seções 0 a 3 e rode a seção 4 depois de corrigir (ver o
--      cabeçalho da migration).
--   4. Linhas com bloqueia_018 = false são avisos: não impedem a 018. Data
--      futura não bloqueia porque o trigger não revalida linhas antigas, mas
--      ela fere a D17 e deve ser corrigida; enquanto isso, qualquer gravação
--      que mude essa coluna para outro valor futuro será recusada.
--
-- As regras abaixo repetem as funções que a 018 cria, porque elas ainda não
-- existem no banco:
--   ordem das datas   → public.is_clergy_date_order_valid()   ↔ isClergyDateOrderValid()
--   não futura        → public.is_clergy_date_not_future()    ↔ isClergyDateNotFuture()
--   hoje em Maceió    → public.clergy_today_in_maceio()       ↔ getTodayInMaceio()
--   ordem dos horários → public.is_schedule_time_order_valid() ↔ isScheduleTimeOrderValid()
-- Mudou a regra nas funções da 018: mude esta cópia junto.
--
-- Só compara valores no formato da 016 (que já está validada em produção):
-- valor fora do formato aparece na pré-verificação da 016, não aqui.

with
hoje as (
  select to_char(now() at time zone 'America/Maceio', 'YYYY-MM-DD') as dia
),
pares_de_datas as (
  select 'church_clergy' as tabela, id::text as id,
    'start_date, end_date' as colunas, start_date as anterior, end_date as posterior
  from church_clergy
  where start_date is not null and end_date is not null
  union all
  select 'clergy', id::text, 'birth_date, death_date', birth_date, death_date
  from clergy
  where birth_date is not null and death_date is not null
),
pares_no_formato as (
  select * from pares_de_datas
  where anterior ~ '^[0-9]{4}(-[0-9]{2}-[0-9]{2})?$'
    and posterior ~ '^[0-9]{4}(-[0-9]{2}-[0-9]{2})?$'
),
pares_de_horarios as (
  select 'schedule_events' as tabela, id::text as id, time as inicio, end_time as termino
  from schedule_events
  where end_time is not null
  union all
  select 'activity_schedules', id::text, time, end_time
  from activity_schedules
  where end_time is not null
),
datas as (
  select 'clergy' as tabela, id::text as id, 'birth_date' as coluna, birth_date as valor
  from clergy where birth_date is not null
  union all
  select 'clergy', id::text, 'death_date', death_date
  from clergy where death_date is not null
  union all
  select 'church_clergy', id::text, 'start_date', start_date
  from church_clergy where start_date is not null
  union all
  select 'church_clergy', id::text, 'end_date', end_date
  from church_clergy where end_date is not null
)

-- 1. Data posterior antes da anterior (menor precisão comum: com só o ano em
--    um dos lados, compara só o ano). Impede o validate da 018.
select
  true as bloqueia_018,
  case tabela
    when 'church_clergy' then 'fim do vínculo antes do início'
    else 'falecimento antes do nascimento'
  end as problema,
  tabela,
  id,
  colunas as coluna,
  format('%s → %s', anterior, posterior) as valor
from pares_no_formato
where case
  when length(anterior) = 4 or length(posterior) = 4 then
    substr(posterior, 1, 4) collate "C" < substr(anterior, 1, 4) collate "C"
  else posterior collate "C" < anterior collate "C"
end

union all

-- 2. Término igual ou antes do início (end_time > time, estrito). Impede o
--    validate da 018.
select
  true,
  'término igual ou antes do início',
  tabela,
  id,
  'time, end_time',
  format('%s → %s', inicio, termino)
from pares_de_horarios
where inicio ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
  and termino ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
  and termino collate "C" <= inicio collate "C"

union all

-- 3. A 016 não foi aplicada: a seção 0 da 018 falha.
select true, 'a 016 não foi aplicada', 'pg_proc', null, null,
  'is_valid_clergy_date / is_valid_schedule_time'
where to_regprocedure('public.is_valid_clergy_date(text)') is null
   or to_regprocedure('public.is_valid_schedule_time(text)') is null

union all

-- 4. Aviso (D17): data futura no fuso de Maceió. Um ano sozinho vale até o
--    fim do ano atual. Não impede a 018 (o trigger não revalida linhas
--    antigas), mas deve ser corrigida.
select
  false,
  format('aviso D17: data futura (hoje em Maceió: %s)', hoje.dia),
  tabela,
  id,
  coluna,
  valor
from datas, hoje
where valor ~ '^[0-9]{4}(-[0-9]{2}-[0-9]{2})?$'
  and case
    when length(valor) = 4 then valor collate "C" > substr(hoje.dia, 1, 4) collate "C"
    else valor collate "C" > hoje.dia collate "C"
  end

order by bloqueia_018 desc, problema, tabela, coluna, id;
