---
paths:
  - "data/**"
  - "lib/supabase/**"
  - "supabase/**"
  - "scripts/**"
  - "types/**"
---

# Dados, Supabase e migrations

## Fonte de dados

- Produção: **Supabase** (PostgreSQL + Auth + RLS). Queries em `lib/supabase/queries/`, consumidas por Server Components.
- `data/*.ts` é legado: serve ao `npm run seed` e como referência. **Não** importar nas páginas.
- Fonte original: [Hora da Missa](https://www.horadamissa.com).

## Queries

- As funções de query convertem linhas do banco (snake_case) para os tipos de domínio de `@/types` (camelCase). Campos nulos viram propriedades ausentes.
- Não há tipos gerados do banco: as interfaces `Db*` em cada arquivo de query descrevem as linhas. Ao adicionar coluna, atualizar a interface `Db*`, o mapeamento e o tipo de domínio.
- Páginas com dados do Supabase usam `export const revalidate = 60` (ISR).

## Migrations

- Arquivos em `supabase/migrations/` com prefixo numérico sequencial de 3 dígitos: `NNN_descricao_em_snake_case.sql`.
- Escrever migrations **idempotentes** (`if not exists`, `drop ... if exists`, `where not exists`): as migrations são aplicadas manualmente pelo **SQL Editor** do Supabase, e o histórico remoto (`supabase migration list`) não reflete o que foi aplicado.
- Toda tabela nova: `enable row level security` e políticas explícitas em leitura e escrita, usando `is_admin()` e `is_editor_of(church_id)`.
- Funções `security definer` devem ter `set search_path = public`.
- Função que decide com `current_user` é `security invoker` (`010`, `014`), porque dentro de `security definer` `current_user` vira o dono da função. `security definer` serve para quem precisa do privilégio do dono e identifica o usuário por `auth.uid()`, como `is_admin()` (`008`) e o trigger de auditoria (`017`).
- Tabela editável nova: criar nela o trigger `audit_log_changes` da `017` (argumentos: colunas da chave primária) e incluí-la no roteiro de verificação da auditoria. **Nenhuma role da API** recebe `INSERT`, `UPDATE`, `DELETE` ou `TRUNCATE` em `audit_log`: além do trigger que insere, só as funções `security definer` da `019` escrevem — `anonymize_profiles_in_audit_log(uuid)` (anonimiza nome e e-mail, chamada pelo trigger `profiles_anonymize_audit_log` na exclusão do perfil e, sem argumento, pelo backfill) e `purge_audit_log()` (retenção de 2 anos, `EXECUTE` só para `service_role`).
- Tabela auditada nova com **dado pessoal**: tirar a coluna do registro antes de gravar (`017`) ou incluí-la em `audit_log_mask_pii()` (`019`) e disparar a anonimização quando a pessoa for excluída. Trigger de anonimização precisa de nome **posterior** a `audit_log_changes`, senão o registro do próprio `DELETE` escapa. Ampliando a máscara, revisar também o filtro de tabela de `anonymize_profiles_in_audit_log()`: `churches.name` e `clergy.name` são dado público e não podem ser mascarados.
- Server Actions gravam dados com o cliente da sessão (`lib/supabase/server.ts`). Gravando com o service role, a auditoria perde o autor (`actor_id` nulo). Service role só para a Auth Admin API e scripts.
- Nunca aplicar migration em produção sem o usuário pedir.

## Validações

- IDs são UUIDs gerados pelo Supabase.
- Slugs via `slugify()` de `@/lib/utils`.
- Horários no formato `HH:MM` com dois dígitos, 00:00–23:59 (validar com `isValidTime()`; o banco aplica a mesma regra por CHECK desde a `016`).
- Dias da semana como `DayOfWeek` (0 = domingo, 6 = sábado).
- Datas do clero (`birth_date`, `death_date`, `start_date`, `end_date`) são texto: ano (`YYYY`) ou data completa e real (`YYYY-MM-DD`). Validar com `isValidClergyDate()`; o banco aplica a mesma regra por CHECK desde a `016`.
- Ordem (D16, CHECK desde a `018`): término depois do início nos horários (`end_time > time`, estrito; `isScheduleTimeOrderValid()`); fim do vínculo ≥ início e falecimento ≥ nascimento (`isClergyDateOrderValid()`). Datas de precisões diferentes comparam na menor precisão comum: com só o ano em um dos lados, compara-se só o ano.
- Datas do clero não podem ser futuras (D17): data completa ≤ hoje e ano sozinho ≤ ano atual, com hoje em `America/Maceio` (`isClergyDateNotFuture()` + `getTodayInMaceio()`). No banco é trigger `BEFORE` (`018`), não CHECK, porque depende de `now()`; ele só avalia as colunas que mudaram.
- Formulários validam com `validateScheduleTimes()`, `validateClergyVitalDates()` e `validateClergyTenureDates()`, com as mensagens de `SCHEDULE_TIME_MESSAGES` e `CLERGY_DATE_MESSAGES`, e gravam campo vazio como `null`.
- Regra nova ou alterada: função pura em `lib/utils` + a mesma regra no banco (CHECK com função `immutable`; trigger `BEFORE` quando depender de `now()`), com `set search_path` explícito e os mesmos casos de borda no teste unitário e no roteiro de verificação. Roteiro de verificação que grava data deve usar data passada.

## Regras de domínio do clero

- Um clérigo está vinculado a **no máximo uma igreja por vez**; o cargo pode mudar ao longo do tempo (ex.: vigário → pároco) e cada troca abre um novo período.
- Por ora não se guarda o histórico de igrejas anteriores do clérigo: o foco é o estado atual.
- Um clérigo pode ter cargo sem paróquia (ex.: reitor do Seminário Maior). A modelagem disso ainda está em aberto (`docs/board.md`, VF-003/VF-025).
- `bio` descreve a pessoa (formação, ministério, cargos como Vigário Geral). **Não** citar paróquia na bio: vínculos ficam em `church_clergy` (`start_date`, `end_date`, `is_active`).
- Clérigos falecidos e sem igreja ativa continuam aparecendo na listagem e na busca.

## Segredos

- `SUPABASE_SERVICE_ROLE_KEY` só no servidor e em scripts; nunca com prefixo `NEXT_PUBLIC_`.
- Nunca ler, imprimir ou commitar o conteúdo de `.env.local`.
