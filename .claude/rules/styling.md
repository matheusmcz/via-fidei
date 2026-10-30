---
paths:
  - "**/*.tsx"
  - "app/globals.css"
  - "tailwind.config.ts"
  - "components/ui/**"
---

# Estilização

## Tailwind CSS

- Apenas utility classes do Tailwind — sem CSS inline, CSS Modules ou styled-components.
- **Mobile-first**: estilos base para mobile, breakpoints (`sm:`, `md:`, `lg:`) para telas maiores.
- `cn()` de `@/lib/utils` para classes condicionais.
- Evitar valores arbitrários quando existir token equivalente.

## Tema

- Cores como CSS custom properties em `app/globals.css` (HSL), expostas no `tailwind.config.ts`.
- Dark mode por classe (`dark`), alternado pelo `ThemeProvider` (`features/theme`) e salvo em `localStorage` (`via-fidei-theme`).
- Sempre verificar componentes nos dois temas.

## shadcn/ui

- Estilo `new-york`, cor base `neutral`. Instalar com `npx shadcn@latest add <componente>`.
- Componentes ficam em `components/ui/`; evitar modificá-los diretamente — customizar via `className` com `cn()`.
- Guia: [`.claude/docs/SHADCN.md`](../docs/SHADCN.md).

## Padrões visuais

- Imagens de igreja em proporção 16:9.
- Manter consistência com os componentes existentes (cards, espaçamentos `p-6 sm:p-8`, `container mx-auto px-4 sm:px-6 lg:px-8`).
