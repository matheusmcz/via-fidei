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
- Nunca aplicar migration em produção sem o usuário pedir.

## Validações

- IDs são UUIDs gerados pelo Supabase.
- Slugs via `slugify()` de `@/lib/utils`.
- Horários no formato `HH:MM` com dois dígitos, 00:00–23:59 (validar com `isValidTime()`; o banco aplica a mesma regra por CHECK desde a `016`).
- Dias da semana como `DayOfWeek` (0 = domingo, 6 = sábado).
- Datas do clero (`birth_date`, `death_date`, `start_date`, `end_date`) são texto: ano (`YYYY`) ou data completa e real (`YYYY-MM-DD`). Validar com `isValidClergyDate()`; o banco aplica a mesma regra por CHECK desde a `016`.
- Regra de formato nova ou alterada: função pura em `lib/utils` + CHECK com a mesma regra em migration, com os mesmos casos de borda no teste unitário e no roteiro de verificação.

## Regras de domínio do clero

- Um clérigo está vinculado a **no máximo uma igreja por vez**; o cargo pode mudar ao longo do tempo (ex.: vigário → pároco) e cada troca abre um novo período.
- Por ora não se guarda o histórico de igrejas anteriores do clérigo: o foco é o estado atual.
- Um clérigo pode ter cargo sem paróquia (ex.: reitor do Seminário Maior). A modelagem disso ainda está em aberto (`docs/board.md`, VF-003/VF-025).
- `bio` descreve a pessoa (formação, ministério, cargos como Vigário Geral). **Não** citar paróquia na bio: vínculos ficam em `church_clergy` (`start_date`, `end_date`, `is_active`).
- Clérigos falecidos e sem igreja ativa continuam aparecendo na listagem e na busca.

## Segredos

- `SUPABASE_SERVICE_ROLE_KEY` só no servidor e em scripts; nunca com prefixo `NEXT_PUBLIC_`.
- Nunca ler, imprimir ou commitar o conteúdo de `.env.local`.
