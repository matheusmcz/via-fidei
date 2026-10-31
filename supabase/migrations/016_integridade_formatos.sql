-- VF-088: integridade no banco antes dos formulários de edição (VF-021).
--
-- 1. Formato de horário (HH:MM) em schedule_events e activity_schedules.
-- 2. Formato de data (YYYY ou YYYY-MM-DD) no clero e nos vínculos.
-- 3. Vínculo clérigo-igreja sem duplicata quando start_date é nulo.
--
-- As colunas continuam text de propósito, para aceitar só o ano (VF-038).
--
-- Antes de aplicar: rode supabase/tests/016_integridade_formatos_pre_verificacao.sql.
-- Depois de aplicar: rode supabase/tests/016_integridade_formatos_verificacao.sql.
--
-- Idempotente: pode rodar de novo (create or replace, drop … if exists,
-- create … if not exists).
--
-- Por que "not valid" seguido de "validate constraint" (seção 4):
--   - Com a pré-verificação vazia (caso esperado), rode o arquivo inteiro: as
--     constraints entram e já são validadas contra as linhas existentes.
--   - Se a pré-verificação listar horários ou datas que não dá para corrigir
--     agora, rode só as seções 0 a 3: as constraints passam a barrar toda
--     gravação nova (insert e update), sem exigir que o legado esteja limpo.
--     Corrija as linhas e rode a seção 4 depois. Uma constraint "not valid"
--     continua valendo para gravações novas; só não garante as linhas antigas.
--   - Vínculo duplicado não tem esse atalho: índice único não aceita "not
--     valid", então a seção 3 falha enquanto houver duplicata. Resolva antes.
--   - Se a seção 4 falhar, a mensagem cita a constraint, e a linha inválida
--     aparece na pré-verificação. O "validate" não troca nem remove nada.
--   - Com tabelas deste tamanho, o lock não pesa; o ganho é poder separar a
--     proteção das gravações novas da limpeza do legado.
--
-- Correspondência com o TypeScript (mesma regra, mesmos casos de borda testados):
--   public.is_valid_schedule_time(text) ↔ isValidTime()       (lib/utils/schedule.ts)
--   public.is_valid_clergy_date(text)   ↔ isValidClergyDate() (lib/utils/clergy.ts)
-- A pré-verificação repete o corpo das funções (elas ainda não existem quando
-- ela roda): mudou a regra aqui, mude lá também.
--
-- Não revogar EXECUTE dessas funções de anon/authenticated: os CHECKs as
-- executam com o papel de quem grava, e o insert/update do editor passaria a
-- falhar com "permission denied for function". São puras e não leem tabelas,
-- então expô-las como RPC no PostgREST é inofensivo.

-- ============================================
-- 0. Requisito: Postgres 15+ (unique … nulls not distinct)
-- ============================================
do $$
begin
  if current_setting('server_version_num')::int < 150000 then
    raise exception 'A 016 precisa de Postgres 15 ou superior (versão atual: %)',
      current_setting('server_version');
  end if;
end $$;

-- ============================================
-- 1. Funções de formato (puras, imutáveis)
-- ============================================

-- HH:MM com dois dígitos, 00:00 a 23:59. Só dígitos ASCII ([0-9], não \d,
-- que no Postgres pode aceitar dígitos de outros alfabetos). Sem espaços.
-- Nulo devolve false; a nulidade de end_time é tratada na constraint.
create or replace function public.is_valid_schedule_time(value text)
returns boolean
language sql
immutable
parallel safe
set search_path = ''
as $$
  select value is not null
    and value ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$';
$$;

comment on function public.is_valid_schedule_time(text) is
  'Horário HH:MM (00:00–23:59, hora com dois dígitos). Mesma regra de isValidTime() em lib/utils/schedule.ts (VF-088).';

-- Só o ano (YYYY, 0001–9999) ou data completa e real (YYYY-MM-DD), com ano
-- bissexto do calendário gregoriano. Sem YYYY-MM e sem espaços.
-- Não usa cast para date: o cast lança erro em data inexistente (2024-02-30)
-- em vez de devolver false, e depende de DateStyle.
create or replace function public.is_valid_clergy_date(value text)
returns boolean
language sql
immutable
parallel safe
set search_path = ''
as $$
  select case
    when value is null then false
    when value ~ '^[0-9]{4}$' then value <> '0000'
    when value ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then
      substr(value, 1, 4)::int >= 1
      and substr(value, 6, 2)::int between 1 and 12
      and substr(value, 9, 2)::int between 1 and (
        case
          when substr(value, 6, 2)::int = 2 then
            case
              when (substr(value, 1, 4)::int % 4 = 0 and substr(value, 1, 4)::int % 100 <> 0)
                or substr(value, 1, 4)::int % 400 = 0
              then 29
              else 28
            end
          when substr(value, 6, 2)::int in (4, 6, 9, 11) then 30
          else 31
        end
      )
    else false
  end;
$$;

comment on function public.is_valid_clergy_date(text) is
  'Data do clero: YYYY (0001–9999) ou YYYY-MM-DD real. Mesma regra de isValidClergyDate() em lib/utils/clergy.ts (VF-088).';

-- ============================================
-- 2. CHECK de formato (not valid: valem já para gravações novas)
-- ============================================

-- Horários das igrejas
alter table schedule_events drop constraint if exists schedule_events_time_format_check;
alter table schedule_events
  add constraint schedule_events_time_format_check
  check (public.is_valid_schedule_time(time)) not valid;

alter table schedule_events drop constraint if exists schedule_events_end_time_format_check;
alter table schedule_events
  add constraint schedule_events_end_time_format_check
  check (end_time is null or public.is_valid_schedule_time(end_time)) not valid;

-- Horários das atividades
alter table activity_schedules drop constraint if exists activity_schedules_time_format_check;
alter table activity_schedules
  add constraint activity_schedules_time_format_check
  check (public.is_valid_schedule_time(time)) not valid;

alter table activity_schedules drop constraint if exists activity_schedules_end_time_format_check;
alter table activity_schedules
  add constraint activity_schedules_end_time_format_check
  check (end_time is null or public.is_valid_schedule_time(end_time)) not valid;

-- Nascimento e falecimento do clérigo
alter table clergy drop constraint if exists clergy_birth_date_format_check;
alter table clergy
  add constraint clergy_birth_date_format_check
  check (birth_date is null or public.is_valid_clergy_date(birth_date)) not valid;

alter table clergy drop constraint if exists clergy_death_date_format_check;
alter table clergy
  add constraint clergy_death_date_format_check
  check (death_date is null or public.is_valid_clergy_date(death_date)) not valid;

-- Início e fim do vínculo clérigo-igreja
alter table church_clergy drop constraint if exists church_clergy_start_date_format_check;
alter table church_clergy
  add constraint church_clergy_start_date_format_check
  check (start_date is null or public.is_valid_clergy_date(start_date)) not valid;

alter table church_clergy drop constraint if exists church_clergy_end_date_format_check;
alter table church_clergy
  add constraint church_clergy_end_date_format_check
  check (end_date is null or public.is_valid_clergy_date(end_date)) not valid;

-- ============================================
-- 3. Vínculo único também com start_date nulo
-- ============================================
-- O unique (church_id, clergy_id, start_date) da 005 trata nulos como
-- distintos, então o mesmo clérigo podia ser vinculado duas vezes à mesma
-- igreja sem data de início. O índice novo usa "nulls not distinct" e serve de
-- árbitro para o upsert do seed (onConflict: "church_id,clergy_id,start_date").
-- Ele é criado antes de remover a constraint antiga, para nunca ficar sem
-- unicidade. Falha se já houver duplicata (a pré-verificação lista).
--
-- Relação com a D1 (no máximo um vínculo ativo por clérigo): essa regra é
-- outra e fica para o VF-025, que muda o modelo do cargo por período. Esta
-- migration não cria o índice parcial (clergy_id) where is_active.
create unique index if not exists church_clergy_church_clergy_start_key
  on church_clergy (church_id, clergy_id, start_date) nulls not distinct;

alter table church_clergy
  drop constraint if exists church_clergy_church_id_clergy_id_start_date_key;

-- ============================================
-- 4. Validação das linhas existentes
-- ============================================
alter table schedule_events validate constraint schedule_events_time_format_check;
alter table schedule_events validate constraint schedule_events_end_time_format_check;
alter table activity_schedules validate constraint activity_schedules_time_format_check;
alter table activity_schedules validate constraint activity_schedules_end_time_format_check;
alter table clergy validate constraint clergy_birth_date_format_check;
alter table clergy validate constraint clergy_death_date_format_check;
alter table church_clergy validate constraint church_clergy_start_date_format_check;
alter table church_clergy validate constraint church_clergy_end_date_format_check;
