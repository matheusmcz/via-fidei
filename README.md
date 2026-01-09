# Via Fidei

Aplicação web para listagem de igrejas católicas de Maceió/AL.

## Setup

```bash
npm install
npm run dev
```

Acesse http://localhost:3000

## Stack

- Next.js 15 (App Router)
- React 19
- TypeScript
- Tailwind CSS
- shadcn/ui

## Estrutura do Projeto

```
/app                  # App Router (rotas e layouts)
/components           # Componentes compartilhados
  /ui                 # Componentes shadcn/ui
/features             # Features organizadas por domínio
  /churches           # Feature de igrejas
/data                 # Dados estáticos
/lib                  # Utilitários e helpers
/types                # Definições de tipos TypeScript
/public               # Assets estáticos
```

## Scripts

- `npm run dev` - Servidor de desenvolvimento (com Turbopack)
- `npm run build` - Build de produção
- `npm run start` - Servidor de produção
- `npm run lint` - Linting
