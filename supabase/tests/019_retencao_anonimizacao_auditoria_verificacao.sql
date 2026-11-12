-- Roteiro de verificação da migration 019 (VF-108: retenção e anonimização do
-- audit_log).
--
-- Como usar:
--   1. Aplique a 019 no SQL Editor do Supabase.
--   2. Cole este arquivo inteiro no SQL Editor e execute.
--   3. Sem erro: todas as verificações passaram. Com erro: a mensagem começa
--      com "FALHOU" (a regra não bateu) ou "PREPARAÇÃO" (o cenário não pôde
--      ser montado) e diz qual verificação parou.
--
-- Nada é gravado: tudo roda dentro de begin … rollback, inclusive o usuário
-- descartável, os registros de auditoria gerados pelo roteiro e a limpeza da
-- seção 5. Se uma verificação falhar, a transação é abortada e também não
-- grava nada.
--
-- O roteiro cria o próprio usuário de teste em auth.users (e-mail em
-- @viafidei.invalid) em vez de mexer em um editor de verdade: a anonimização
-- não tem volta, e aqui ela é exercida de propósito.
--
-- Toda verificação de "sumiu" ou "foi anonimizado" confere ANTES que o dado
-- estava lá: sem isso, um cenário que nunca gravou nada passaria calado.

begin;

-- ============================================
-- 0. Estrutura: funções, trigger, ordem dos triggers e privilégios
-- ============================================
do $$
declare
  v_role text;
  v_privilege text;
  v_nome_audit text;
  v_nome_anon text;
  v_funcao text;
begin
  if to_regclass('public.audit_log') is null then
    raise exception 'FALHOU 0: a tabela public.audit_log não existe (a 017 foi aplicada?)';
  end if;

  -- Funções criadas pela 019.
  foreach v_funcao in array array[
    'public.audit_log_pii_mask()',
    'public.audit_log_mask_pii(jsonb)',
    'public.audit_log_retention()',
    'public.purge_audit_log()',
    'public.anonymize_profile_in_audit_log()'
  ] loop
    if to_regprocedure(v_funcao) is null then
      raise exception 'FALHOU 0: a função % não existe (a 019 foi aplicada?)', v_funcao;
    end if;
  end loop;

  -- As duas que escrevem no log precisam do privilégio do dono, com
  -- search_path fixo (regra de .claude/rules/data-management.md).
  foreach v_funcao in array array[
    'public.purge_audit_log()',
    'public.anonymize_profile_in_audit_log()'
  ] loop
    if not exists (
      select 1 from pg_proc
      where oid = to_regprocedure(v_funcao)
        and prosecdef
        and proconfig @> array['search_path=public']
    ) then
      raise exception 'FALHOU 0: % precisa ser security definer com search_path = public', v_funcao;
    end if;
  end loop;

  -- As de regra pura precisam ser imutáveis, para servirem em where/check.
  foreach v_funcao in array array[
    'public.audit_log_pii_mask()',
    'public.audit_log_mask_pii(jsonb)',
    'public.audit_log_retention()'
  ] loop
    if not exists (
      select 1 from pg_proc where oid = to_regprocedure(v_funcao) and provolatile = 'i'
    ) then
      raise exception 'FALHOU 0: % precisa ser immutable', v_funcao;
    end if;
  end loop;

  -- Trigger de anonimização: AFTER (bit 2 desligado), FOR EACH ROW (bit 1),
  -- só DELETE (bit 8 ligado, INSERT 4 e UPDATE 16 desligados).
  if not exists (
    select 1 from pg_trigger t
    where t.tgrelid = 'public.profiles'::regclass
      and t.tgfoid = 'public.anonymize_profile_in_audit_log()'::regprocedure
      and not t.tgisinternal
      and t.tgenabled <> 'D'
      and (t.tgtype & 2) = 0
      and (t.tgtype & 1) = 1
      and (t.tgtype & 8) = 8
      and (t.tgtype & 4) = 0
      and (t.tgtype & 16) = 0
  ) then
    raise exception 'FALHOU 0: falta em profiles o trigger AFTER DELETE FOR EACH ROW de anonimização';
  end if;

  -- ORDEM: triggers AFTER … FOR EACH ROW da mesma tabela disparam em ordem
  -- alfabética do nome. O de auditoria tem de vir ANTES do de anonimização,
  -- senão o registro do próprio DELETE é gravado depois e fica com nome e
  -- e-mail à vista. Compara os nomes reais, pelas funções, para pegar também
  -- uma renomeação.
  select t.tgname into v_nome_audit from pg_trigger t
  where t.tgrelid = 'public.profiles'::regclass
    and t.tgfoid = 'public.audit_log_changes()'::regprocedure
    and not t.tgisinternal;

  select t.tgname into v_nome_anon from pg_trigger t
  where t.tgrelid = 'public.profiles'::regclass
    and t.tgfoid = 'public.anonymize_profile_in_audit_log()'::regprocedure
    and not t.tgisinternal;

  if v_nome_audit is null then
    raise exception 'FALHOU 0: falta em profiles o trigger de auditoria da 017';
  end if;

  if v_nome_anon <= v_nome_audit then
    raise exception
      'FALHOU 0: o trigger de anonimização (%) dispara antes do de auditoria (%); o registro do DELETE ficaria com nome e e-mail',
      v_nome_anon, v_nome_audit;
  end if;

  -- Privilégios: a tabela continua fechada para escrita pela API…
  foreach v_role in array array['anon', 'authenticated', 'service_role'] loop
    if not exists (select 1 from pg_roles where rolname = v_role) then
      continue;
    end if;

    foreach v_privilege in array array['INSERT', 'UPDATE', 'DELETE', 'TRUNCATE'] loop
      if has_table_privilege(v_role, 'public.audit_log', v_privilege) then
        raise exception 'FALHOU 0: % tem % em audit_log', v_role, v_privilege;
      end if;
    end loop;

    -- …e as funções internas da 019 não são chamáveis por RPC.
    foreach v_funcao in array array[
      'public.audit_log_pii_mask()',
      'public.audit_log_mask_pii(jsonb)',
      'public.audit_log_retention()',
      'public.anonymize_profile_in_audit_log()'
    ] loop
      if has_function_privilege(v_role, v_funcao, 'EXECUTE') then
        raise exception 'FALHOU 0: % tem EXECUTE em %', v_role, v_funcao;
      end if;
    end loop;
  end loop;

  -- purge_audit_log(): só o service role executa (opção B do agendamento).
  foreach v_role in array array['anon', 'authenticated'] loop
    if not exists (select 1 from pg_roles where rolname = v_role) then
      continue;
    end if;
    if has_function_privilege(v_role, 'public.purge_audit_log()', 'EXECUTE') then
      raise exception 'FALHOU 0: % tem EXECUTE em purge_audit_log()', v_role;
    end if;
  end loop;

  if exists (select 1 from pg_roles where rolname = 'service_role')
     and not has_function_privilege('service_role', 'public.purge_audit_log()', 'EXECUTE') then
    raise exception 'FALHOU 0: service_role precisa de EXECUTE em purge_audit_log() (job externo de limpeza)';
  end if;

  raise notice 'OK 0: funções, trigger AFTER DELETE depois da auditoria e privilégios';
end $$;

-- ============================================
-- 1. As regras: prazo de 2 anos e marcador
-- ============================================
do $$
declare
  v_mask text := public.audit_log_pii_mask();
begin
  if public.audit_log_retention() <> interval '2 years' then
    raise exception 'FALHOU 1: a retenção é % e a D22 pede 2 anos', public.audit_log_retention();
  end if;

  if v_mask is null or length(btrim(v_mask)) = 0 then
    raise exception 'FALHOU 1: o marcador de anonimização está vazio';
  end if;

  if v_mask like '%@%' then
    raise exception 'FALHOU 1: o marcador % parece um e-mail', v_mask;
  end if;

  raise notice 'OK 1: retenção de 2 anos, marcador "%"', v_mask;
end $$;

-- ============================================
-- 2. audit_log_mask_pii(): o que troca e o que não troca
-- ============================================
do $$
declare
  v_mask constant text := public.audit_log_pii_mask();
  v_completo constant jsonb := jsonb_build_object(
    'id', '11111111-1111-4111-8111-111111111111',
    'name', 'Fulano de Tal',
    'email', 'fulano@exemplo.test',
    'role', 'editor',
    'is_active', true
  );
  v_resultado jsonb;
begin
  if public.audit_log_mask_pii(null) is not null then
    raise exception 'FALHOU 2: null deveria continuar null';
  end if;

  if public.audit_log_mask_pii('{}'::jsonb) <> '{}'::jsonb then
    raise exception 'FALHOU 2: objeto vazio deveria continuar vazio';
  end if;

  v_resultado := public.audit_log_mask_pii(v_completo);

  if v_resultado ->> 'name' <> v_mask or v_resultado ->> 'email' <> v_mask then
    raise exception 'FALHOU 2: nome e e-mail não foram anonimizados: %', v_resultado;
  end if;

  if v_resultado ->> 'role' <> 'editor'
     or v_resultado ->> 'id' <> (v_completo ->> 'id')
     or (v_resultado -> 'is_active') <> 'true'::jsonb then
    raise exception 'FALHOU 2: colunas sem dado pessoal foram alteradas: %', v_resultado;
  end if;

  -- Idempotente: anonimizar de novo não muda nada (o backfill da 019 e o
  -- trigger podem passar pelo mesmo registro mais de uma vez).
  if public.audit_log_mask_pii(v_resultado) <> v_resultado then
    raise exception 'FALHOU 2: a anonimização não é idempotente';
  end if;

  -- Chave ausente continua ausente: no UPDATE, old_data/new_data só trazem as
  -- colunas que mudaram, e inventar "name" ali seria mentir sobre o que mudou.
  v_resultado := public.audit_log_mask_pii('{"role": "admin"}'::jsonb);
  if v_resultado ? 'name' or v_resultado ? 'email' then
    raise exception 'FALHOU 2: a anonimização criou chave que não existia: %', v_resultado;
  end if;
  if v_resultado is distinct from '{"role": "admin"}'::jsonb then
    raise exception 'FALHOU 2: registro sem dado pessoal deveria sair idêntico: %', v_resultado;
  end if;

  -- json null fica como está: não havia dado, não há o que anonimizar.
  if public.audit_log_mask_pii('{"name": null}'::jsonb) <> '{"name": null}'::jsonb then
    raise exception 'FALHOU 2: json null não deveria virar marcador';
  end if;

  raise notice 'OK 2: anonimiza nome e e-mail, preserva o resto, idempotente';
end $$;

-- ============================================
-- Preparação: um perfil descartável com histórico no log
-- ============================================
do $$
declare
  v_user uuid := gen_random_uuid();
  v_email constant text := 'verificacao-019@viafidei.invalid';
  v_nome constant text := 'Perfil da Verificação 019';
  v_com_pii int;
  v_outros_com_pii int;
begin
  begin
    insert into auth.users (id, email, raw_user_meta_data)
    values (v_user, v_email, jsonb_build_object('name', v_nome));
  exception when others then
    raise exception 'PREPARAÇÃO: não foi possível criar o usuário de teste em auth.users: %', sqlerrm;
  end;

  if not exists (select 1 from public.profiles where id = v_user) then
    raise exception 'PREPARAÇÃO: o trigger handle_new_user() não criou o perfil do usuário de teste';
  end if;

  -- Histórico: um INSERT (do trigger de perfil), um UPDATE de nome e um de
  -- e-mail. Os três guardam dado pessoal no log.
  update public.profiles set name = v_nome || ' (renomeado)' where id = v_user;
  update public.profiles set email = 'verificacao-019-novo@viafidei.invalid' where id = v_user;

  -- VERIFICAÇÃO POSITIVA: o dado está mesmo no log antes da exclusão. Sem
  -- isto, a seção 3 passaria num cenário que nunca gravou nada.
  select count(*) into v_com_pii
  from public.audit_log a
  where a.table_name = 'profiles'
    and a.record_pk ->> 'id' = v_user::text
    and (
      public.audit_log_mask_pii(a.old_data) is distinct from a.old_data
      or public.audit_log_mask_pii(a.new_data) is distinct from a.new_data
    );

  if v_com_pii < 3 then
    raise exception
      'PREPARAÇÃO: esperava ao menos 3 registros com nome/e-mail no log (INSERT + 2 UPDATE), encontrei %. A auditoria da 017 está ativa em profiles?',
      v_com_pii;
  end if;

  -- Controle: registros de OUTROS perfis, que não podem ser tocados.
  select count(*) into v_outros_com_pii
  from public.audit_log a
  where a.table_name = 'profiles'
    and a.record_pk ->> 'id' is distinct from v_user::text
    and (
      public.audit_log_mask_pii(a.old_data) is distinct from a.old_data
      or public.audit_log_mask_pii(a.new_data) is distinct from a.new_data
    );

  perform set_config('verif019.user_id', v_user::text, true);
  perform set_config('verif019.com_pii', v_com_pii::text, true);
  perform set_config('verif019.outros_com_pii', v_outros_com_pii::text, true);
  perform set_config(
    'verif019.total_do_perfil',
    (
      select count(*) from public.audit_log
      where table_name = 'profiles' and record_pk ->> 'id' = v_user::text
    )::text,
    true
  );

  raise notice 'Preparação: perfil % com % registro(s) de dado pessoal no log', v_user, v_com_pii;
end $$;

-- ============================================
-- 3. Excluir o perfil anonimiza nome e e-mail em todo o log
-- ============================================
do $$
declare
  v_user constant uuid := current_setting('verif019.user_id')::uuid;
  v_mask constant text := public.audit_log_pii_mask();
  v_antes constant int := current_setting('verif019.total_do_perfil')::int;
  v_outros_antes constant int := current_setting('verif019.outros_com_pii')::int;
  v_restante int;
  v_depois int;
  v_outros_depois int;
  v_delete jsonb;
begin
  -- A exclusão real vem do painel do Supabase, que apaga o auth.users; o
  -- perfil sai em cascata. É esse caminho que o roteiro percorre.
  delete from auth.users where id = v_user;

  if exists (select 1 from public.profiles where id = v_user) then
    raise exception 'FALHOU 3: o perfil não saiu em cascata com o auth.users';
  end if;

  -- 3a. Nenhum registro do perfil guarda mais nome ou e-mail.
  select count(*) into v_restante
  from public.audit_log a
  where a.table_name = 'profiles'
    and a.record_pk ->> 'id' = v_user::text
    and (
      public.audit_log_mask_pii(a.old_data) is distinct from a.old_data
      or public.audit_log_mask_pii(a.new_data) is distinct from a.new_data
    );

  if v_restante > 0 then
    raise exception 'FALHOU 3a: % registro(s) do perfil excluído ainda guardam nome ou e-mail', v_restante;
  end if;

  -- 3b. O registro do próprio DELETE existe e está anonimizado — é o que o
  -- trigger de auditoria grava com a linha inteira em old_data.
  select a.old_data into v_delete
  from public.audit_log a
  where a.table_name = 'profiles'
    and a.operation = 'DELETE'
    and a.record_pk ->> 'id' = v_user::text
  order by a.id desc
  limit 1;

  if v_delete is null then
    raise exception 'FALHOU 3b: não há registro de DELETE do perfil no log (a ordem dos triggers mudou?)';
  end if;

  if v_delete ->> 'name' <> v_mask or v_delete ->> 'email' <> v_mask then
    raise exception 'FALHOU 3b: o registro do DELETE ainda tem nome ou e-mail: %', v_delete;
  end if;

  -- 3c. O resto do registro continua: a anonimização alcança só nome e
  -- e-mail (decisão do usuário, 07/11/2026).
  if v_delete ->> 'role' is null or v_delete ->> 'is_active' is null then
    raise exception 'FALHOU 3c: o registro do DELETE perdeu papel ou status: %', v_delete;
  end if;

  if v_delete ->> 'id' <> v_user::text then
    raise exception 'FALHOU 3c: o id do perfil deveria continuar no registro: %', v_delete;
  end if;

  -- 3d. Nada foi apagado: a anonimização reescreve, não remove. O +1 é o
  -- registro do DELETE, que não existia na preparação.
  select count(*) into v_depois
  from public.audit_log
  where table_name = 'profiles' and record_pk ->> 'id' = v_user::text;

  if v_depois <> v_antes + 1 then
    raise exception 'FALHOU 3d: o perfil tinha % registro(s) e ficou com % (esperado %)',
      v_antes, v_depois, v_antes + 1;
  end if;

  if not exists (
    select 1 from public.audit_log
    where table_name = 'profiles' and record_pk ->> 'id' = v_user::text
      and operation = 'INSERT'
  ) then
    raise exception 'FALHOU 3d: o registro de criação do perfil sumiu do log';
  end if;

  -- 3e. Registros de outros perfis continuam intactos.
  select count(*) into v_outros_depois
  from public.audit_log a
  where a.table_name = 'profiles'
    and a.record_pk ->> 'id' is distinct from v_user::text
    and (
      public.audit_log_mask_pii(a.old_data) is distinct from a.old_data
      or public.audit_log_mask_pii(a.new_data) is distinct from a.new_data
    );

  if v_outros_depois <> v_outros_antes then
    raise exception 'FALHOU 3e: registros de outros perfis foram anonimizados (% antes, % depois)',
      v_outros_antes, v_outros_depois;
  end if;

  raise notice 'OK 3: % registro(s) do perfil anonimizados, inclusive o do DELETE; % de outros perfis intactos',
    v_depois, v_outros_depois;
end $$;

-- ============================================
-- 4. Limpeza: só sai o que passou dos 2 anos
-- ============================================
do $$
declare
  v_id_antigo bigint;
  v_id_limite bigint;
  v_id_recente bigint;
  v_apagados bigint;
begin
  -- Três marcos em volta do prazo. Inserção direta na tabela, pela role do
  -- SQL Editor (dona): nenhuma role da API consegue fazer isto.
  insert into public.audit_log (occurred_at, actor_db_role, table_name, operation, record_pk)
  values (now() - interval '3 years', 'postgres', 'churches', 'UPDATE', '{"id": "verif019-antigo"}'::jsonb)
  returning id into v_id_antigo;

  insert into public.audit_log (occurred_at, actor_db_role, table_name, operation, record_pk)
  values (now() - interval '2 years' + interval '1 day', 'postgres', 'churches', 'UPDATE', '{"id": "verif019-limite"}'::jsonb)
  returning id into v_id_limite;

  insert into public.audit_log (occurred_at, actor_db_role, table_name, operation, record_pk)
  values (now(), 'postgres', 'churches', 'UPDATE', '{"id": "verif019-recente"}'::jsonb)
  returning id into v_id_recente;

  -- VERIFICAÇÃO POSITIVA: os três estão lá antes da limpeza.
  if (select count(*) from public.audit_log where id in (v_id_antigo, v_id_limite, v_id_recente)) <> 3 then
    raise exception 'PREPARAÇÃO: os três registros de teste da limpeza não foram gravados';
  end if;

  v_apagados := public.purge_audit_log();

  if exists (select 1 from public.audit_log where id = v_id_antigo) then
    raise exception 'FALHOU 4: o registro de 3 anos atrás continua no log';
  end if;

  if not exists (select 1 from public.audit_log where id = v_id_limite) then
    raise exception 'FALHOU 4: o registro de 1 dia dentro do prazo foi apagado';
  end if;

  if not exists (select 1 from public.audit_log where id = v_id_recente) then
    raise exception 'FALHOU 4: o registro de hoje foi apagado';
  end if;

  if v_apagados < 1 then
    raise exception 'FALHOU 4: purge_audit_log() devolveu %, e ao menos 1 registro foi apagado', v_apagados;
  end if;

  -- Segunda passada não apaga mais nada: a limpeza agendada roda todo dia.
  if public.purge_audit_log() <> 0 then
    raise exception 'FALHOU 4: a segunda limpeza seguida deveria apagar 0 registros';
  end if;

  raise notice 'OK 4: limpeza apagou % registro(s) fora do prazo e manteve os de dentro', v_apagados;
end $$;

-- ============================================
-- 5. A limpeza roda com a chave de service role (opção B do agendamento)
-- ============================================
do $$
declare
  v_apagados bigint;
begin
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    raise notice 'OK 5: pulado (role service_role não existe neste banco)';
    return;
  end if;

  set local role service_role;
  v_apagados := public.purge_audit_log();
  reset role;

  if v_apagados is null then
    raise exception 'FALHOU 5: purge_audit_log() não devolveu número chamada pelo service_role';
  end if;

  raise notice 'OK 5: service_role executou a limpeza (% registro(s))', v_apagados;
end $$;

rollback;
