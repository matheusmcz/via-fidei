-- VF-093: auditoria das alterações nas tabelas editáveis, antes do VF-021.
--
-- Uma tabela de log (audit_log), preenchida por um trigger genérico AFTER
-- INSERT/UPDATE/DELETE em cada tabela editável. Cada registro guarda quem fez,
-- em qual tabela e linha, a operação, o antes e o depois (jsonb) e o momento.
--
-- Por que tabela de log e não colunas updated_by/updated_at:
--   - updated_by só guarda a última alteração e perde o histórico;
--   - não registra o DELETE (a linha some);
--   - exigiria uma coluna e um trigger por tabela, e o cliente poderia enviar
--     um updated_by falso se a coluna não fosse protegida.
--
-- Depois de aplicar: rode supabase/tests/017_auditoria_alteracoes_verificacao.sql.
--
-- Idempotente: pode rodar de novo no SQL Editor (create … if not exists,
-- create or replace, drop … if exists). Não altera nem apaga dados.
--
-- Sem tela nesta entrega: a leitura é só do admin (RLS), pela API ou pelo SQL
-- Editor. Retenção e limpeza do log ainda não estão definidas.

-- ============================================
-- 1. Tabela de log
-- ============================================
create table if not exists public.audit_log (
  id bigint generated always as identity primary key,
  -- Momento da transação (now()): todas as linhas de uma mesma operação
  -- (ex.: apagar uma igreja e os horários em cascata) têm o mesmo valor. A
  -- ordem dentro da transação é a do id.
  occurred_at timestamptz not null default now(),
  transaction_id bigint not null default txid_current(),
  -- auth.uid() de quem gravou pela API. Nulo para service role (seed,
  -- scripts, Auth Admin API), SQL Editor e o GoTrue (cadastro).
  actor_id uuid,
  -- Role do Postgres na gravação: authenticated, service_role, ou a do
  -- SQL Editor (postgres) e do GoTrue (supabase_auth_admin).
  actor_db_role text not null,
  -- Papel em profiles no momento da gravação (admin, editor), porque ele
  -- pode mudar depois. Nulo quando não há perfil.
  actor_app_role text,
  table_name text not null,
  operation text not null check (operation in ('INSERT', 'UPDATE', 'DELETE')),
  -- Chave primária da linha, ex.: {"id": "…"} ou, em editor_churches,
  -- {"editor_id": "…", "church_id": "…"}.
  record_pk jsonb not null,
  -- Igreja a que a linha pertence, para consultar o histórico de uma igreja.
  -- Nulo em clergy, ministries e profiles. Em activity_schedules apagada em
  -- cascata (a atividade já foi apagada), também fica nulo; o registro da
  -- atividade, com o mesmo transaction_id, tem a igreja.
  church_id uuid,
  -- INSERT: old_data nulo e new_data com a linha inteira.
  -- UPDATE: só as colunas que mudaram, com o valor antigo e o novo.
  -- DELETE: old_data com a linha inteira e new_data nulo.
  old_data jsonb,
  new_data jsonb
);

-- Sem foreign key em actor_id e church_id de propósito: o registro precisa
-- sobreviver ao usuário e à igreja apagados.

comment on table public.audit_log is
  'Auditoria das alterações nas tabelas editáveis (VF-093). Só inserção, pelo trigger audit_log_changes; leitura só do admin.';

create index if not exists audit_log_table_record_idx
  on public.audit_log (table_name, record_pk, occurred_at desc);
create index if not exists audit_log_actor_idx
  on public.audit_log (actor_id, occurred_at desc);
create index if not exists audit_log_church_idx
  on public.audit_log (church_id, occurred_at desc);
create index if not exists audit_log_occurred_at_idx
  on public.audit_log (occurred_at desc);

-- ============================================
-- 2. Permissões: só o admin lê; ninguém grava pela API
-- ============================================
-- O Supabase concede ALL nas tabelas novas de public a anon, authenticated e
-- service_role. O log é só de inserção, e a inserção é feita pelo trigger
-- (security definer, dono da tabela). Até o service role fica só com leitura:
-- uma chave vazada não apaga o rastro.
alter table public.audit_log enable row level security;

revoke all on table public.audit_log from public, anon, authenticated, service_role;
grant select on table public.audit_log to authenticated, service_role;

do $$
declare
  v_sequence text := pg_get_serial_sequence('public.audit_log', 'id');
begin
  execute format('revoke all on sequence %s from public, anon, authenticated, service_role', v_sequence);
end $$;

drop policy if exists "audit_log_select_admin" on public.audit_log;
create policy "audit_log_select_admin"
  on public.audit_log for select
  to authenticated
  using (public.is_admin());

-- Sem políticas de INSERT, UPDATE e DELETE: com RLS ativo, elas negariam
-- tudo de qualquer forma, mas os privilégios já barram antes.

-- ============================================
-- 3. Função do trigger
-- ============================================
-- SECURITY DEFINER é necessário: quem grava pela API não tem INSERT em
-- audit_log, e a função insere como dono da tabela (fora do RLS).
--
-- Por que aqui pode ser SECURITY DEFINER e na 010/014 não:
--   - Na 010 e na 014, o trigger decide permissão com current_user, que numa
--     função SECURITY DEFINER vira o dono da função. Aqui a função não decide
--     nada: é AFTER, só roda depois que o RLS e os triggers BEFORE aceitaram
--     a gravação, e não muda a linha nem bloqueia a operação.
--   - O autor vem de auth.uid() (claims do JWT em request.jwt.claims), que
--     não depende do usuário da função.
--   - A role vem de current_setting('role'), que é a role definida pelo SET
--     ROLE do PostgREST e não muda dentro de SECURITY DEFINER. Fora da API
--     (SQL Editor, GoTrue) o valor é 'none', e então vale session_user.
--   - Não é chamável como RPC: função que devolve trigger só roda como
--     trigger. O EXECUTE é revogado mesmo assim.
--
-- Argumentos do trigger: as colunas da chave primária (padrão: id).
--
-- No UPDATE, updated_at não conta como mudança: é preenchida pelo trigger
-- update_updated_at, e o momento já está em occurred_at. UPDATE sem mudança
-- real (ex.: upsert do seed com os mesmos valores) não gera registro.
--
-- Dados sensíveis: nenhuma tabela auditada tem segredo. A senha fica em
-- auth.users, fora daqui; profiles tem nome, e-mail, papel e status, que o
-- admin já lê. Ao auditar uma tabela com dado sensível, tire a coluna do
-- registro antes de gravar.
create or replace function public.audit_log_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ignored_on_update constant text[] := array['updated_at'];
  v_pk_columns text[] := case when tg_nargs > 0 then tg_argv else array['id'] end;
  v_old jsonb := case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end;
  v_new jsonb := case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end;
  v_row jsonb := coalesce(v_new, v_old);
  v_old_data jsonb := v_old;
  v_new_data jsonb := v_new;
  v_actor uuid := auth.uid();
  v_actor_app_role text;
  v_church uuid;
begin
  if tg_op = 'UPDATE' then
    select
      jsonb_object_agg(n.key, v_old -> n.key),
      jsonb_object_agg(n.key, n.value)
    into v_old_data, v_new_data
    from jsonb_each(v_new) as n
    where n.key <> all (v_ignored_on_update)
      and n.value is distinct from v_old -> n.key;

    if v_new_data is null then
      return null;
    end if;
  end if;

  v_church := case
    when tg_table_name = 'churches' then (v_row ->> 'id')::uuid
    when v_row ? 'church_id' then (v_row ->> 'church_id')::uuid
    when tg_table_name = 'activity_schedules' then (
      select a.church_id from public.activities a
      where a.id = (v_row ->> 'activity_id')::uuid
    )
  end;

  -- O trigger é AFTER: em profiles, a linha do próprio autor já tem o papel
  -- novo. Vale o papel de antes da gravação (ex.: admin que se rebaixa).
  if tg_table_name = 'profiles' and v_old is not null and (v_old ->> 'id')::uuid = v_actor then
    v_actor_app_role := v_old ->> 'role';
  else
    select p.role into v_actor_app_role from public.profiles p where p.id = v_actor;
  end if;

  insert into public.audit_log (
    actor_id,
    actor_db_role,
    actor_app_role,
    table_name,
    operation,
    record_pk,
    church_id,
    old_data,
    new_data
  )
  values (
    v_actor,
    coalesce(nullif(current_setting('role', true), 'none'), session_user::text),
    v_actor_app_role,
    tg_table_name,
    tg_op,
    (select jsonb_object_agg(c, v_row -> c) from unnest(v_pk_columns) as c),
    v_church,
    v_old_data,
    v_new_data
  );

  return null;
end;
$$;

comment on function public.audit_log_changes() is
  'Trigger AFTER de auditoria (VF-093): grava em audit_log quem alterou, o quê e quando. Argumentos: colunas da chave primária (padrão id).';

revoke all on function public.audit_log_changes() from public, anon, authenticated, service_role;

-- ============================================
-- 4. Triggers nas tabelas editáveis
-- ============================================
-- AFTER … FOR EACH ROW. Os triggers BEFORE (ex.: 010, 014) rodam antes; se um deles recusar a gravação, este não roda. Se um
-- deles alterar NEW, o log registra a linha final.
--
-- TRUNCATE não dispara trigger FOR EACH ROW e fica fora do log. O PostgREST
-- não expõe TRUNCATE; pelo SQL Editor, prefira DELETE para manter o rastro.
drop trigger if exists audit_log_changes on public.churches;
create trigger audit_log_changes
  after insert or update or delete on public.churches
  for each row execute function public.audit_log_changes('id');

drop trigger if exists audit_log_changes on public.schedule_events;
create trigger audit_log_changes
  after insert or update or delete on public.schedule_events
  for each row execute function public.audit_log_changes('id');

drop trigger if exists audit_log_changes on public.activities;
create trigger audit_log_changes
  after insert or update or delete on public.activities
  for each row execute function public.audit_log_changes('id');

drop trigger if exists audit_log_changes on public.activity_schedules;
create trigger audit_log_changes
  after insert or update or delete on public.activity_schedules
  for each row execute function public.audit_log_changes('id');

drop trigger if exists audit_log_changes on public.ministries;
create trigger audit_log_changes
  after insert or update or delete on public.ministries
  for each row execute function public.audit_log_changes('id');

drop trigger if exists audit_log_changes on public.church_ministries;
create trigger audit_log_changes
  after insert or update or delete on public.church_ministries
  for each row execute function public.audit_log_changes('id');

drop trigger if exists audit_log_changes on public.clergy;
create trigger audit_log_changes
  after insert or update or delete on public.clergy
  for each row execute function public.audit_log_changes('id');

drop trigger if exists audit_log_changes on public.church_clergy;
create trigger audit_log_changes
  after insert or update or delete on public.church_clergy
  for each row execute function public.audit_log_changes('id');

drop trigger if exists audit_log_changes on public.profiles;
create trigger audit_log_changes
  after insert or update or delete on public.profiles
  for each row execute function public.audit_log_changes('id');

drop trigger if exists audit_log_changes on public.editor_churches;
create trigger audit_log_changes
  after insert or update or delete on public.editor_churches
  for each row execute function public.audit_log_changes('editor_id', 'church_id');
