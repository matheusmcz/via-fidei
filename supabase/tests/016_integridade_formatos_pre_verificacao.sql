-- Pré-verificação da migration 016 (VF-088: formatos de horário e de data,
-- vínculo clérigo-igreja sem duplicata com start_date nulo).
--
-- Como usar:
--   1. ANTES de aplicar a 016, cole este arquivo inteiro no SQL Editor do
--      Supabase e execute. Ele só lê (um único select), não grava nada.
--   2. Resultado vazio: pode aplicar a 016 inteira.
--   3. Linhas com bloqueia_016 = true: corrija essas linhas antes de aplicar a
--      016 inteira. Para horário ou data, dá para aplicar só as seções 0 a 3 e
--      rodar a seção 4 depois de corrigir; vínculo duplicado precisa ser
--      resolvido antes (ver o cabeçalho da migration).
--   4. Linhas com bloqueia_016 = false são avisos: não impedem a 016.
--
-- As regras abaixo repetem as funções que a 016 cria, porque elas ainda não
-- existem no banco:
--   horário → public.is_valid_schedule_time() ↔ isValidTime()
--   data    → public.is_valid_clergy_date()   ↔ isValidClergyDate()
-- Mudou a regra nas funções da 016: mude esta cópia junto.

with
horarios as (
  select 'schedule_events' as tabela, id::text as id, 'time' as coluna, time as valor
  from schedule_events
  union all
  select 'schedule_events', id::text, 'end_time', end_time
  from schedule_events where end_time is not null
  union all
  select 'activity_schedules', id::text, 'time', time
  from activity_schedules
  union all
  select 'activity_schedules', id::text, 'end_time', end_time
  from activity_schedules where end_time is not null
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
),
datas_validadas as (
  select
    d.*,
    case
      when d.valor ~ '^[0-9]{4}$' then d.valor <> '0000'
      when d.valor ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then
        substr(d.valor, 1, 4)::int >= 1
        and substr(d.valor, 6, 2)::int between 1 and 12
        and substr(d.valor, 9, 2)::int between 1 and (
          case
            when substr(d.valor, 6, 2)::int = 2 then
              case
                when (substr(d.valor, 1, 4)::int % 4 = 0 and substr(d.valor, 1, 4)::int % 100 <> 0)
                  or substr(d.valor, 1, 4)::int % 400 = 0
                then 29
                else 28
              end
            when substr(d.valor, 6, 2)::int in (4, 6, 9, 11) then 30
            else 31
          end
        )
      else false
    end as valida
  from datas d
)

-- 1. Horário fora de HH:MM (00:00–23:59, hora com dois dígitos).
select
  true as bloqueia_016,
  'horário fora de HH:MM' as problema,
  tabela,
  id,
  coluna,
  valor
from horarios
where valor is null or valor !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'

union all

-- 2. Data fora de YYYY ou YYYY-MM-DD real.
select true, 'data fora de YYYY ou YYYY-MM-DD real', tabela, id, coluna, valor
from datas_validadas
where not valida

union all

-- 3. Vínculo duplicado (mesma igreja, clérigo e start_date, contando nulos
--    como iguais). Impede o índice único da 016.
select
  true,
  format('vínculo duplicado (%s linhas)', count(*)),
  'church_clergy',
  string_agg(id::text, ', ' order by created_at),
  'church_id, clergy_id, start_date',
  format('%s, %s, %s', church_id, clergy_id, coalesce(start_date, 'NULL'))
from church_clergy
group by church_id, clergy_id, start_date
having count(*) > 1

union all

-- 4. Postgres anterior ao 15 (sem "nulls not distinct").
select true, 'Postgres anterior ao 15', 'server_version', null, null, current_setting('server_version')
where current_setting('server_version_num')::int < 150000

union all

-- 5. Aviso: a constraint antiga não tem o nome esperado, então a 016 não a
--    remove. Não quebra nada (fica redundante); remova à mão pelo nome listado.
select
  false,
  'aviso: unique antigo de church_clergy com outro nome (a 016 não o remove)',
  'church_clergy',
  null,
  'constraint',
  coalesce(
    (
      select string_agg(conname, ', ')
      from pg_constraint
      where conrelid = 'public.church_clergy'::regclass and contype = 'u'
    ),
    'nenhum unique encontrado'
  )
where not exists (
  select 1 from pg_constraint
  where conrelid = 'public.church_clergy'::regclass
    and conname = 'church_clergy_church_id_clergy_id_start_date_key'
)
and not exists (
  select 1 from pg_class where relname = 'church_clergy_church_clergy_start_key'
)

union all

-- 6. Aviso (D1, VF-025): clérigo com mais de um vínculo ativo. Não impede a
--    016; o índice dessa regra fica para o VF-025.
select
  false,
  format('aviso VF-025: clérigo com %s vínculos ativos', count(*)),
  'church_clergy',
  string_agg(id::text, ', ' order by created_at),
  'clergy_id',
  clergy_id::text
from church_clergy
where is_active
group by clergy_id
having count(*) > 1

order by bloqueia_016 desc, problema, tabela, coluna;
