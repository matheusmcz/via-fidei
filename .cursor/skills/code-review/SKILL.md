---
name: code-review
description: Revisa código para qualidade, segurança, acessibilidade e aderência aos padrões do projeto Via Fidei. Use ao revisar pull requests, mudanças de código, ou quando o usuário pedir um code review.
---

# Code Review — Via Fidei

## Workflow

1. Identificar os arquivos alterados (via `git diff` ou arquivos fornecidos)
2. Analisar cada arquivo contra o checklist abaixo
3. Apresentar o feedback organizado por severidade
4. Sugerir correções concretas com trechos de código

## Checklist de Revisão

### Arquitetura

- [ ] Componentes novos estão dentro de `features/` (não soltos na raiz)
- [ ] Barrel export atualizado no `index.ts` da feature
- [ ] Componentes shadcn/ui estão em `components/ui/` e não foram modificados sem necessidade
- [ ] Utilitários de domínio estão em `lib/utils/`
- [ ] Tipos novos foram adicionados em `types/church.ts` e re-exportados via `types/index.ts`

### React / Next.js

- [ ] Server Components por padrão — `"use client"` apenas quando há interatividade
- [ ] Named exports (não default exports)
- [ ] Interface de props definida no topo do componente
- [ ] Chaves React estáveis (nunca índice de array como key)
- [ ] `next/image` para imagens, `next/link` para navegação interna
- [ ] Links externos com `target="_blank"` e `rel="noopener noreferrer"`
- [ ] Metadata/SEO com `generateMetadata` quando aplicável

### TypeScript

- [ ] Sem uso de `any` — tipagem forte obrigatória
- [ ] Interfaces para objetos, types para unions
- [ ] Imports com path alias `@/` para módulos fora da feature atual
- [ ] Tipos de domínio importados de `@/types` (não redefinidos)

### Estilização

- [ ] Apenas Tailwind utility classes (sem CSS inline, Modules ou styled-components)
- [ ] Abordagem mobile-first (`sm:`, `md:`, `lg:` para telas maiores)
- [ ] `cn()` de `@/lib/utils` para classes condicionais
- [ ] Dark mode considerado (variantes `dark:`)

### Dados

- [ ] Dados tipados com interface `Church` de `@/types`
- [ ] IDs únicos para entidades novas
- [ ] Horários no formato `HH:MM`
- [ ] Slugs consistentes com `slugify()` de `@/lib/utils`

### Qualidade Geral

- [ ] Sem console.log ou debugger restante
- [ ] Tratamento adequado de estados vazios (empty states)
- [ ] Sem duplicação de lógica existente em `lib/utils/`
- [ ] Acessibilidade básica (alt em imagens, semântica HTML)

## Formato do Feedback

Organizar por severidade:

- **CRITICO**: Deve ser corrigido antes do merge (bugs, segurança, quebra de build)
- **SUGESTAO**: Melhoria recomendada (legibilidade, performance, padrões)
- **OPCIONAL**: Refinamento estético ou preferência

Para cada item, incluir:
1. Arquivo e linha
2. Problema encontrado
3. Código sugerido como correção

## Referências

- Arquitetura do projeto: @ARCHITECTURE.md
- Guia de QA: @docs/QA.md
- Regras do projeto: @.cursor/rules/
