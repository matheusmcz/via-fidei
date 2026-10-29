---
paths:
  - "**/*.tsx"
---

# Componentes React

## Estrutura do arquivo

1. Imports
2. Interface de props
3. Componente principal como **named export**
4. Subcomponentes e helpers locais (não exportados) abaixo

## Regras

- Apenas componentes funcionais.
- **Named exports**. Exceção: arquivos especiais do Next (`page.tsx`, `layout.tsx`, `not-found.tsx`…), que exigem `export default`.
- Nome do componente em PascalCase (`ChurchCard`); arquivo em **kebab-case** (`church-card.tsx`).
- Chaves React estáveis: nunca usar índice de array como `key`.
- Textos visíveis ao usuário em português brasileiro.

## Composição

- Preferir composição a props complexas.
- Lógica reutilizável em custom hooks (`use-*.ts`) dentro da pasta da feature (ex.: `features/churches/use-church-filters.ts`).
- Visibilidade por papel via `useAuth()` (`canEditChurch`, `isAdmin`) — sempre tratar `isLoading`.
- A UI condicionada a papel é só conveniência: a permissão real é do RLS e da checagem na Server Action.
