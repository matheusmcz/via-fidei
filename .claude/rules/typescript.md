---
paths:
  - "**/*.ts"
  - "**/*.tsx"
---

# Convenções TypeScript

## Tipagem

- `strict` ligado; nunca usar `any`.
- `interface` para objetos e shapes; `type` para unions, intersections e aliases.
- Tipar explicitamente o retorno de funções utilitárias e de queries.
- Unions "abertas" com autocomplete usam `| (string & {})` (ex.: `RecurrenceType`, `ReligiousOrderSuffix`).

## Nomenclatura

- Tipos e interfaces: PascalCase (`Church`, `ClergyRole`).
- Funções e variáveis: camelCase (`formatClergyName`).
- Constantes de mapeamento: UPPER_SNAKE_CASE (`ROLE_LABELS`, `DAY_NAMES`).
- Valores de enum de domínio em inglês kebab-case (`parish-priest`, `vicar-general`); rótulos em português ficam em `lib/utils`.

## Organização

- Tipos compartilhados em `types/`, re-exportados por `types/index.ts`; não duplicar — importar de `@/types`.
- Imports absolutos com `@/` para módulos fora da feature; relativos aceitáveis dentro da mesma feature.

## Comentários

- JSDoc curto em tipos e utilitários de domínio (padrão atual do código); comentários de código em português ou inglês, explicando o porquê.
