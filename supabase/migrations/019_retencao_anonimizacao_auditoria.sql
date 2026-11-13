-- VF-108 (D22): retenção e anonimização do audit_log.
--
-- Três coisas, nesta ordem:
--   1. Anonimizar nome e e-mail nos registros de um editor excluído (LGPD).
--      O DELETE de um perfil guarda a linha inteira em old_data, e o INSERT e
--      o UPDATE guardam nome e e-mail em new_data/old_data. Nenhuma role da
--      API apaga ou altera audit_log, então quem anonimiza é o banco.
--   2. Anonimizar o que já está gravado de perfis que **não existem mais**
--      (backfill), porque até aqui a exclusão não limpava nada.
--   3. Guardar o log por 2 anos: a função purge_audit_log() apaga o que passou
--      do prazo. O **agendamento** fica fora desta migration de propósito
--      (ver a seção 5).
--
-- O que NÃO é anonimizado (decisão do usuário, 07/11/2026): actor_id e
-- record_pk continuam no log. Sem actor_id o log perde a atribuição e sem
-- record_pk perde o índice principal; depois que o perfil sai, o UUID não
-- resolve para pessoa nenhuma.
--
-- Antes de aplicar:
--   supabase/tests/019_retencao_anonimizacao_auditoria_pre_verificacao.sql
--   (só lê; mostra quantos registros o backfill anonimiza e quantos a primeira
--   limpeza apaga).
-- Depois de aplicar:
--   supabase/tests/019_retencao_anonimizacao_auditoria_verificacao.sql
--
-- A anonimização mora em uma função só, public.anonymize_profiles_in_audit_log():
-- com o id de um perfil ela serve ao trigger; sem argumento, ao backfill. Assim
-- a regra de "o que anonimizar" não existe em duas cópias que podem divergir.
--
-- Idempotente: pode rodar de novo no SQL Editor (create or replace,
-- drop … if exists). O backfill da seção 3 só reescreve o que ainda não está
-- anonimizado. Depende da 017.

-- ============================================
-- 0. Pré-requisito
-- ============================================
do $$
begin
  if to_regclass('public.audit_log') is null then
    raise exception 'A 019 depende da 017: a tabela public.audit_log não existe';
  end if;
end $$;

-- ============================================
-- 1. Máscara de anonimização
-- ============================================
-- O marcador substitui o valor em vez de apagar a chave: assim o registro
-- continua dizendo que ali havia um nome ou um e-mail, e um UPDATE antigo
-- continua mostrando que a coluna mudou — só não mostra mais o conteúdo.
create or replace function public.audit_log_pii_mask()
returns text
language sql
immutable
set search_path = public
as $$ select '[anonimizado]'::text $$;

comment on function public.audit_log_pii_mask() is
  'VF-108: marcador que substitui nome e e-mail no audit_log de um perfil excluído.';

-- Troca, em um old_data/new_data, o valor das chaves com dado pessoal pelo
-- marcador. A lista de colunas mora só aqui: em profiles, o que identifica uma
-- pessoa é name e email (role, is_active, created_at e updated_at não).
--
-- Chave ausente continua ausente (importante no UPDATE, onde old_data e
-- new_data só trazem as colunas que mudaram) e valor json null fica como está,
-- para não inventar um dado onde não havia. Devolve o próprio valor quando não
-- há o que anonimizar, o que faz de `audit_log_mask_pii(x) is distinct from x`
-- o teste de "ainda falta anonimizar" usado nas seções 2 e 3.
create or replace function public.audit_log_mask_pii(p_data jsonb)
returns jsonb
language sql
immutable
set search_path = public
as $$
  select case
    when p_data is null then null
    else coalesce(
      (
        select jsonb_object_agg(
          entry.key,
          case
            when entry.key = any (array['name', 'email'])
                 and jsonb_typeof(entry.value) <> 'null'
              then to_jsonb(public.audit_log_pii_mask())
            else entry.value
          end
        )
        from jsonb_each(p_data) as entry
      ),
      '{}'::jsonb
    )
  end
$$;

comment on function public.audit_log_mask_pii(jsonb) is
  'VF-108: troca nome e e-mail de um old_data/new_data do audit_log pelo marcador de audit_log_pii_mask(). Chave ausente ou json null fica como está.';

revoke all on function public.audit_log_pii_mask() from public, anon, authenticated, service_role;
revoke all on function public.audit_log_mask_pii(jsonb) from public, anon, authenticated, service_role;

-- ============================================
-- 2. Anonimização ao excluir um editor
-- ============================================
-- Por que no banco e não na aplicação: não existe tela de exclusão de editor.
-- As chamadas a auth.admin.deleteUser em features/auth/admin-actions.ts só
-- desfazem a criação; a exclusão real vem do painel do Supabase, que apaga o
-- auth.users e leva o profiles em cascata. Um trigger alcança qualquer
-- DELETE: painel, SQL Editor, API e cascata.
--
-- O que escapa: TRUNCATE public.profiles (não dispara trigger FOR EACH ROW, e
-- a 017 já o deixa fora do log) e o trigger desabilitado à mão. Nos dois casos
-- o remédio é rodar o backfill, que acha qualquer perfil que não existe mais:
--   select public.anonymize_profiles_in_audit_log();
-- Reaplicar esta migration inteira faz o mesmo (a seção 3 chama o backfill).
--
-- SECURITY DEFINER é necessário: nenhuma role da API tem UPDATE em audit_log,
-- e a função grava como dona da tabela (fora do RLS). Igual ao
-- audit_log_changes() da 017, ela é AFTER e não decide permissão nenhuma com
-- current_user, então não cabe aqui a ressalva da 010/014.
--
-- Uma função só serve ao trigger e ao backfill da seção 3, para que a regra de
-- "o que anonimizar" não exista em duas cópias que podem divergir:
--   - com p_profile_id: os registros daquele perfil (o trigger, na exclusão);
--   - sem argumento: os registros de todo perfil que não existe mais (o
--     backfill, e o conserto de um DELETE que escapou — ver a nota do trigger).
-- Devolve quantos registros anonimizou.
create or replace function public.anonymize_profiles_in_audit_log(
  p_profile_id uuid default null
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_anonimizados bigint;
begin
  update public.audit_log a
  set
    old_data = public.audit_log_mask_pii(a.old_data),
    new_data = public.audit_log_mask_pii(a.new_data)
  where a.table_name = 'profiles'
    and case
      when p_profile_id is null then not exists (
        select 1 from public.profiles p where p.id::text = a.record_pk ->> 'id'
      )
      else a.record_pk ->> 'id' = p_profile_id::text
    end
    and (
      public.audit_log_mask_pii(a.old_data) is distinct from a.old_data
      or public.audit_log_mask_pii(a.new_data) is distinct from a.new_data
    );

  get diagnostics v_anonimizados = row_count;
  return v_anonimizados;
end;
$$;

comment on function public.anonymize_profiles_in_audit_log(uuid) is
  'VF-108 (D22): anonimiza nome e e-mail no audit_log. Com o id, os registros daquele perfil (usada pelo trigger); sem argumento, os de todo perfil que não existe mais (backfill). Devolve quantos anonimizou.';

create or replace function public.anonymize_profile_in_audit_log()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.anonymize_profiles_in_audit_log(old.id);
  return null;
end;
$$;

comment on function public.anonymize_profile_in_audit_log() is
  'Trigger AFTER DELETE em profiles (VF-108, D22): anonimiza nome e e-mail do perfil excluído em todo o audit_log, inclusive no registro do próprio DELETE. actor_id e record_pk continuam.';

revoke all on function public.anonymize_profiles_in_audit_log(uuid) from public, anon, authenticated, service_role;
revoke all on function public.anonymize_profile_in_audit_log() from public, anon, authenticated, service_role;

-- NOME DO TRIGGER: triggers AFTER … FOR EACH ROW da mesma tabela disparam em
-- ordem alfabética do nome. "profiles_anonymize_audit_log" vem depois de
-- "audit_log_changes", então quando este roda o registro do DELETE já está
-- gravado e entra na anonimização. Renomear para algo anterior a
-- "audit_log_changes" deixaria justamente o registro do DELETE com nome e
-- e-mail — a seção 0 do roteiro de verificação confere essa ordem.
drop trigger if exists profiles_anonymize_audit_log on public.profiles;
create trigger profiles_anonymize_audit_log
  after delete on public.profiles
  for each row execute function public.anonymize_profile_in_audit_log();

-- ============================================
-- 3. Backfill: perfis já excluídos antes desta migration
-- ============================================
-- Sem argumento: todo perfil que não existe mais. Comparar id::text com
-- record_pk ->> 'id', em vez de converter o jsonb para uuid, é o que impede um
-- record_pk fora do formato esperado de derrubar a migration inteira.
do $$
declare
  v_anonimizados bigint := public.anonymize_profiles_in_audit_log();
begin
  raise notice '019: % registro(s) de perfis já excluídos anonimizados no backfill', v_anonimizados;
end $$;

-- ============================================
-- 4. Retenção de 2 anos
-- ============================================
create or replace function public.audit_log_retention()
returns interval
language sql
immutable
set search_path = public
as $$ select interval '2 years' $$;

comment on function public.audit_log_retention() is
  'VF-108 (D22): prazo de retenção do audit_log. Mudar o prazo é mudar esta função.';

-- Sem parâmetro de propósito: o prazo é o da D22 e não pode ser encurtado por
-- quem chama. É o que permite dar EXECUTE ao service_role (ver abaixo) sem
-- abrir caminho para uma chave vazada apagar o rastro recente — ela só
-- conseguiria apagar o que a limpeza agendada já apagaria.
--
-- Devolve quantos registros apagou, para o agendamento registrar o resultado.
create or replace function public.purge_audit_log()
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deleted bigint;
begin
  delete from public.audit_log
  where occurred_at < now() - public.audit_log_retention();

  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

comment on function public.purge_audit_log() is
  'VF-108 (D22): apaga os registros do audit_log mais antigos que audit_log_retention() e devolve quantos apagou. Agendamento fora da migration (pg_cron ou job externo).';

revoke all on function public.audit_log_retention() from public, anon, authenticated, service_role;
revoke all on function public.purge_audit_log() from public, anon, authenticated, service_role;

-- Só o service role executa a limpeza, e é o que viabiliza a opção B da seção
-- 5 (job externo chamando rpc('purge_audit_log')). anon e authenticated —
-- inclusive o admin logado — continuam sem executar: o admin lê o log, não o
-- apaga.
grant execute on function public.purge_audit_log() to service_role;

-- A tabela continua sem INSERT, UPDATE, DELETE e TRUNCATE para qualquer role
-- da API: as duas escritas novas (anonimização e limpeza) passam por funções
-- SECURITY DEFINER, não por privilégio de tabela.
comment on table public.audit_log is
  'Auditoria das alterações nas tabelas editáveis (VF-093). Gravação só pelo trigger audit_log_changes; leitura só do admin. Nenhuma role da API grava, altera ou apaga a tabela. Retenção de 2 anos por purge_audit_log() e anonimização de nome e e-mail do editor excluído pelo trigger profiles_anonymize_audit_log (VF-108, D22).';

-- ============================================
-- 5. Agendamento da limpeza — escolher uma das duas opções
-- ============================================
-- Fica fora da migration porque depende de algo que o SQL do repositório não
-- tem como conferir: se o projeto tem pg_cron disponível.
--
-- OPÇÃO A — pg_cron (dentro do próprio banco). Confira antes se a extensão
-- está disponível:
--
--   select * from pg_available_extensions where name = 'pg_cron';
--
-- Havendo, ligue pg_cron pelo Dashboard (Database → Extensions) — o schema em
-- que a extensão é instalada é escolha do Supabase, e o que importa é o
-- agendador responder pelo schema cron. Então rode uma vez no SQL Editor
-- (todo dia às 03:00 UTC = 00:00 em Maceió):
--
--   select cron.schedule(
--     'purgar-audit-log',
--     '0 3 * * *',
--     $cron$ select public.purge_audit_log(); $cron$
--   );
--
-- Conferir: select * from cron.job where jobname = 'purgar-audit-log';
--           select * from cron.job_run_details order by start_time desc limit 10;
-- Desfazer: select cron.unschedule('purgar-audit-log');
--
-- OPÇÃO B — job externo (GitHub Actions, Vercel Cron ou qualquer agendador),
-- chamando a RPC com a chave de service role, uma vez por dia:
--
--   curl -X POST "$SUPABASE_URL/rest/v1/rpc/purge_audit_log" \
--     -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
--     -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
--     -H "Content-Type: application/json" -d '{}'
--
-- A resposta é o número de registros apagados. A chave de service role fica no
-- servidor do job e nunca vai para o cliente.
--
-- Enquanto nenhuma das duas estiver no ar, a limpeza é manual, no SQL Editor:
--   select public.purge_audit_log();
