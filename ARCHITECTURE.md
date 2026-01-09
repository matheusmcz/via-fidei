# Estrutura do Projeto

## Organização por Feature

O projeto segue uma arquitetura organizada por **features/domínios**, não por tipo de arquivo.

### `/app` - App Router (Next.js)

Contém rotas, layouts e páginas da aplicação.

- `layout.tsx` - Layout raiz com metadados e fontes
- `page.tsx` - Página inicial
- `globals.css` - Estilos globais e variáveis CSS do Tailwind

### `/features` - Features do domínio

Cada feature agrupa componentes, hooks e lógica relacionados.

**`/features/churches`** - Feature de igrejas

- Componentes específicos (cards, listas)
- Hooks de busca e filtros
- Utilitários do domínio

### `/components` - Componentes compartilhados

Componentes reutilizáveis em todo o projeto.

**`/components/ui`** - Componentes do shadcn/ui

- Instalados via `npx shadcn@latest add [component]`
- Customizáveis e prontos para uso

### `/lib` - Bibliotecas e utilitários

Código auxiliar reutilizável.

**`/lib/utils`** - Funções utilitárias

- `cn.ts` - Função para merge de classes Tailwind
- Outras helpers conforme necessário

### `/types` - Definições de tipos TypeScript

Tipos e interfaces compartilhados.

- `church.ts` - Interface `Church`
- Outros tipos conforme necessário

### `/data` - Dados estáticos

Arquivos JSON ou TS com dados versionados.

- Dados das igrejas (futuro)
- Sem CRUD, cadastro manual

### `/public` - Assets estáticos

Arquivos públicos servidos diretamente.

**`/public/images`** - Imagens

- `placeholder.svg` - Placeholder padrão
- `/churches` - Fotos das igrejas (futuro)

## Fluxo de dados (SSR)

1. Dados estáticos importados em Server Components
2. Renderização no servidor (SSR)
3. Hidratação no cliente para interatividade (busca, filtros)

## Convenções de código

- **Componentes**: PascalCase (`ChurchCard.tsx`)
- **Utilitários**: camelCase (`cn.ts`, `slugify.ts`)
- **Tipos**: PascalCase (`Church`, `ChurchFilters`)
- **Pastas**: kebab-case (`features/churches`)

## Boas práticas

- Preferir **Server Components** por padrão
- **Client Components** apenas quando necessário (interatividade)
- Props + composição ao invés de Context API
- Mobile-first (Tailwind)
- Tipagem forte desde o início
