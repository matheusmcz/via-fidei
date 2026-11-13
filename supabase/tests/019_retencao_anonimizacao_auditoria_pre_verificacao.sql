-- Pré-verificação da migration 019 (VF-108: retenção e anonimização do
-- audit_log).
--
-- Como usar:
--   1. ANTES de aplicar a 019, cole este arquivo inteiro no SQL Editor do
--      Supabase e execute. Ele só lê (um único select), não grava nada.
--   2. Leia as linhas do resultado. Nenhuma delas bloqueia a 019: a migration
--      não falha por causa de dados existentes. O que elas respondem é
--      *quanto* a 019 vai mexer:
--        - "a anonimizar agora (backfill)" é quantos registros do log perdem
--          nome e e-mail assim que a 019 rodar, por serem de perfis que já não
--          existem. Se vier alto e você quiser conferir antes, exporte esses
--          registros primeiro: **a anonimização não tem volta**.
--        - "fora da retenção de 2 anos" é quantos registros a PRIMEIRA
--          execução de purge_audit_log() apaga. A 019 **não** chama a limpeza
--          nem a agenda: isso é passo separado (seção 5 da migration). Em um
--          banco cuja auditoria começou na 017 (nov/2026) esse número deve ser
--          zero por bastante tempo; qualquer coisa diferente de zero merece um
--          olhar antes de agendar.
--   3. Depois de aplicar a 019, rode
--      019_retencao_anonimizacao_auditoria_verificacao.sql.
--
-- Precisa da 017 aplicada (a tabela public.audit_log). As regras abaixo
-- repetem o que a 019 vai criar, porque as funções ainda não existem:
--   colunas com dado pessoal → array['name','email']  ↔ public.audit_log_mask_pii()
--   marcador                 → '[anonimizado]'        ↔ public.audit_log_pii_mask()
--   prazo                    → interval '2 years'     ↔ public.audit_log_retention()
-- Mudou a regra na 019: mude esta cópia junto.

with
registros_de_perfil as (
  select
    a.id,
    a.occurred_at,
    a.record_pk ->> 'id' as perfil_id,
    a.old_data,
    a.new_data
  from public.audit_log a
  where a.table_name = 'profiles'
),
com_dado_pessoal as (
  select
    r.*,
    exists (
      select 1
      from jsonb_each(coalesce(r.old_data, '{}'::jsonb)) as e
      where e.key in ('name', 'email')
        and jsonb_typeof(e.value) <> 'null'
        and e.value <> to_jsonb('[anonimizado]'::text)
      union all
      select 1
      from jsonb_each(coalesce(r.new_data, '{}'::jsonb)) as e
      where e.key in ('name', 'email')
        and jsonb_typeof(e.value) <> 'null'
        and e.value <> to_jsonb('[anonimizado]'::text)
    ) as tem_dado_pessoal
  from registros_de_perfil r
),
orfaos as (
  select c.*
  from com_dado_pessoal c
  where c.tem_dado_pessoal
    and not exists (
      select 1 from public.profiles p where p.id::text = c.perfil_id
    )
),
fora_da_retencao as (
  select a.id, a.occurred_at
  from public.audit_log a
  where a.occurred_at < now() - interval '2 years'
)
select
  '1. registros no audit_log (total)' as verificacao,
  (select count(*) from public.audit_log) as quantidade,
  coalesce(
    (select to_char(min(occurred_at), 'YYYY-MM-DD') from public.audit_log),
    'tabela vazia'
  ) as detalhe
union all
select
  '2. registros de profiles com nome ou e-mail à vista',
  (select count(*) from com_dado_pessoal where tem_dado_pessoal),
  'de ' || (select count(distinct perfil_id) from com_dado_pessoal where tem_dado_pessoal)::text || ' perfil(is)'
union all
select
  '3. a anonimizar agora (backfill da 019: perfis já excluídos)',
  (select count(*) from orfaos),
  case
    when (select count(*) from orfaos) = 0 then 'nada a fazer'
    else 'de ' || (select count(distinct perfil_id) from orfaos)::text
         || ' perfil(is) já excluído(s) — sem volta depois da 019'
  end
union all
select
  '4. fora da retenção de 2 anos (a 1a purge_audit_log() apaga)',
  (select count(*) from fora_da_retencao),
  case
    when (select count(*) from fora_da_retencao) = 0 then 'nada a apagar'
    else 'mais antigo em '
         || (select to_char(min(occurred_at), 'YYYY-MM-DD') from fora_da_retencao)
  end
order by verificacao;
