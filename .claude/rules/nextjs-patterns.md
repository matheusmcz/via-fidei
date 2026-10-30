---
paths:
  - "app/**"
  - "middleware.ts"
  - "next.config.ts"
---

# Padrões Next.js (App Router)

## Server Components por padrão

- Componentes em `app/` são Server Components por padrão.
- `"use client"` apenas quando há interatividade (state, effects, event handlers, `useAuth`).
- Preferir props + composição a Context API.

## Rotas

- Rotas dinâmicas usam `generateStaticParams` (ex.: `app/igreja/[slug]/`) com `createPublicClient()`.
- `not-found.tsx` para 404 customizado.
- Rotas internas (`/login`, `/admin`) têm `robots: { index: false, follow: false }` e não têm link na UI pública.
- `/admin/*` é protegido no `app/admin/layout.tsx` (sem sessão → `/login`; não admin ativo → `/`).

## SEO e metadata

- `generateMetadata` para metadados dinâmicos por página.
- Incluir Open Graph e Twitter Cards.
- O template de título é `%s | Via Fidei` (definido em `app/layout.tsx`).

## Navegação, imagens e links

- `next/link` para navegação interna; `next/image` para imagens.
- Links externos com `target="_blank"` e `rel="noopener noreferrer"`.

## Dados

- Consumir dados via `@/lib/supabase/queries` (`getChurches()`, `getChurchBySlug(slug)`, `getAllClergyWithChurch()`…).
- `export const revalidate = 60` nas páginas com dados do Supabase.
- Mutations via Server Actions (`"use server"`) dentro da feature, com `revalidatePath` das rotas afetadas.
