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

**`/features/churches/schedule`** - Horários das igrejas

- `schedule-tabs.tsx` - Componente de abas (Client Component)
- `schedule-day-list.tsx` - Lista de horários por dia
- `schedule-empty.tsx` - Estado vazio
- `activity-list.tsx` - Lista de atividades

### `/components` - Componentes compartilhados

Componentes reutilizáveis em todo o projeto.

**`/components/ui`** - Componentes do shadcn/ui

- Instalados via `npx shadcn@latest add [component]`
- Customizáveis e prontos para uso

### `/lib` - Bibliotecas e utilitários

Código auxiliar reutilizável.

**`/lib/utils`** - Funções utilitárias

- `cn.ts` - Função para merge de classes Tailwind
- `slugify.ts` - Geração de slugs a partir de nomes
- `schedule.ts` - Utilitários de horários:
  - `formatTime()` - Formata hora ("18:00" → "18h")
  - `formatTimeRange()` - Formata intervalo ("06:30" - "17:30")
  - `getDayName()` - Nome do dia em português
  - `groupByDay()` - Agrupa eventos por dia da semana
  - `formatRecurrence()` - Label de recorrência ("1ª Sexta-feira do mês")
  - `isValidTime()` - Valida formato HH:MM
  - `getEventKey()` - Gera chave única para React
- Outras helpers conforme necessário

### `/types` - Definições de tipos TypeScript

Tipos e interfaces compartilhados.

- `church.ts` - Tipos principais:
  - `Church` - Interface da igreja
  - `ScheduleEvent` - Evento de horário (missa, adoração, confissão)
  - `Activity` - Atividade com horários
  - `DayOfWeek` - Tipo literal (0-6)
  - `RecurrenceType` - Tipos de recorrência
- `index.ts` - Re-exporta todos os tipos

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
- Chaves React estáveis (não usar índice de array)
- Validação de dados de entrada (ex: formato de hora)

## Próximos Passos

### Feature de Clero

Implementação planejada:

1. **Tipos** (`types/church.ts`):
   - `Clergy` - Interface do clérigo
   - `ClergyRole` - "parish-priest" | "vicar" | "deacon" | "administrator"
   - `ClergyTitle` - "padre" | "monsenhor" | "frei" | "dom"
   - `ReligiousOrderSuffix` - "OFM" | "SJ" | "OP" | "OSB" | etc.

2. **Utilitários** (`lib/utils/clergy.ts`):
   - `getRoleLabel()` - Traduz role para português
   - `getClergyTitle()` - Retorna prefixo ("Pe.", "Mons.")
   - `formatClergyName()` - "Pe. José da Silva, OFM"
   - `sortClergyByRole()` - Ordena por hierarquia canônica

3. **Componentes** (`features/churches/clergy/`):
   - `ClergyCard` - Card com foto, nome, cargo
   - `ClergyList` - Lista de clérigos da paróquia

4. **Integração**:
   - Nova seção na página de detalhes (`app/igreja/[slug]/page.tsx`)
