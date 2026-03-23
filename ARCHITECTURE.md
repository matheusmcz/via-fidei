# Estrutura do Projeto

## Stack e dados (Supabase)

Resumo do que está em produção hoje:

| Camada | Descrição |
|--------|-----------|
| **Banco** | PostgreSQL no Supabase; schema versionado em [`supabase/migrations/`](supabase/migrations/) (`001`–`008`). Aplicar em ordem no **SQL Editor** do projeto (ou `supabase db push` com CLI linkado). |
| **Chaves** | Padrão atual do dashboard: [`NEXT_PUBLIC_SUPABASE_URL`](https://supabase.com/docs/guides/getting-started/quickstarts/nextjs), `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (cliente); `SUPABASE_SERVICE_ROLE_KEY` só no servidor / seed. [Documentação de API keys](https://supabase.com/docs/guides/api/api-keys). Durante a transição, a anon JWT legada ainda pode ser usada como fallback (`NEXT_PUBLIC_SUPABASE_ANON_KEY`). |
| **Auth** | Supabase Auth + cookies (`@supabase/ssr`); [`middleware.ts`](middleware.ts) na raiz renova a sessão; [`features/auth/`](features/auth/) expõe `AuthProvider` e `useAuth`. |
| **Leitura pública** | [`lib/supabase/public.ts`](lib/supabase/public.ts) — cliente só com publishable key, **sem** `cookies()`. Usado em `lib/supabase/queries/` para listagens e detalhes (compatível com `generateStaticParams` e RLS `anon`). |
| **Sessão no servidor** | [`lib/supabase/server.ts`](lib/supabase/server.ts) — `createServerClient` com cookies (login, `/admin`, ações que precisam do JWT do usuário). |
| **Cliente browser** | [`lib/supabase/client.ts`](lib/supabase/client.ts) — `createBrowserClient`. |
| **Seed** | [`scripts/seed.ts`](scripts/seed.ts) + [`scripts/load-env.ts`](scripts/load-env.ts) — `npm run seed` popula o banco a partir de `data/*.ts` (requer `SUPABASE_SERVICE_ROLE_KEY`). |
| **Dados em TS** | Arquivos em [`data/`](data/) não são mais importados pelas páginas; servem de fonte para o seed e documentação histórica. |

ISR: `export const revalidate = 60` nas páginas que consomem Supabase.

---

## Organização por Feature

O projeto segue uma arquitetura organizada por **features/domínios**, não por tipo de arquivo.

### Raiz do repositório

- [`middleware.ts`](middleware.ts) — integração `@supabase/ssr` para refresh de sessão (matcher exclui assets estáticos)

### `/app` - App Router (Next.js)

Contém rotas, layouts e páginas da aplicação.

- `layout.tsx` - Layout raiz com metadados, fontes e AuthProvider
- `page.tsx` - Página inicial (listagem de igrejas com busca e filtro)
- `globals.css` - Estilos globais e variáveis CSS do Tailwind
- `igreja/[slug]/page.tsx` - Página de detalhes da igreja (SSR com `generateStaticParams`)
- `igreja/[slug]/not-found.tsx` - Página 404 customizada
- `clero/page.tsx` - Listagem geral de clérigos com filtro alfabético
- `login/page.tsx` - Página de login (rota escondida, sem link na UI)
- `admin/layout.tsx` - Layout admin com verificação de papel
- `admin/page.tsx` - Dashboard admin com estatísticas
- `admin/usuarios/` - CRUD de editores e vínculos com igrejas

### `/features` - Features do domínio

Cada feature agrupa componentes, hooks e lógica relacionados.

**`/features/churches`** - Feature de igrejas

- `church-card.tsx` - Card de igreja para listagem
- `church-list.tsx` - Lista de igrejas com busca e filtros (Client Component)
- `use-church-filters.ts` - Hook de busca, filtro por bairro e paginação
- `page-header.tsx` - Header da página inicial
- `pagination.tsx` - Componente de paginação
- `pagination-controls.tsx` - Controles de paginação
- `per-page-filter.tsx` - Filtro de itens por página

**`/features/churches/schedule`** - Horários das igrejas

- `schedule-tabs.tsx` - Componente de abas (Client Component)
- `schedule-day-list.tsx` - Lista de horários por dia em accordion (shadcn/ui Accordion). Cada dia é um item colapsável com contagem de horários; o primeiro dia vem expandido por padrão. **Layout anterior**: lista vertical simples com todos os dias empilhados (`space-y-4`) e badges de horário em `flex-wrap` -- sem colapsável, todo conteúdo visível de uma vez.
- `schedule-empty.tsx` - Estado vazio
- `activity-list.tsx` - Lista de atividades

**`/features/churches/clergy`** - Clero das igrejas

- `clergy-card.tsx` - Card básico de clérigo
- `clergy-card-with-modal.tsx` - Card com modal de detalhes
- `clergy-detail-modal.tsx` - Modal com informações detalhadas do clérigo
- `clergy-list.tsx` - Lista de clérigos ativos da paróquia
- `clergy-history.tsx` - Histórico de clérigos anteriores

**`/features/churches/contact`** - Contato das igrejas

- `church-contact-section.tsx` - Seção de contato (telefone, WhatsApp, redes sociais)

**`/features/churches/ministries`** - Grupos, movimentos e pastorais

- `ministries-section.tsx` - Seção principal com subdivisões por categoria (Grupos, Movimentos, Pastorais)
- `ministry-list.tsx` - Lista de ministérios renderizados como tags/badges

**`/features/clergy`** - Feature de listagem de clérigos (página `/clero`)

- `clergy-page-list.tsx` - Lista com busca e filtro alfabético (Client Component)
- `clergy-list-card.tsx` - Card compacto de clérigo
- `clergy-page-modal.tsx` - Modal com detalhes e link para paróquia
- `use-clergy-filters.ts` - Hook de busca e filtro por letra inicial

**`/features/churches/editor`** - Experiência de edição na página de igreja

- `editable-section.tsx` - Wrapper que exibe empty state + botão "Adicionar" para editores vinculados
- `edit-indicator.tsx` - Ícone de lápis exibido condicionalmente para quem pode editar
- `admin-church-link.tsx` - Link para gerenciar editores (visível apenas para admin)

**`/features/auth`** - Autenticação e controle de acesso

- `auth-provider.tsx` - Provider com estado do usuário, papel e igrejas vinculadas
- `use-auth.ts` - Hook para acessar contexto de autenticação
- `actions.ts` - Server Actions de login/logout
- `admin-actions.ts` - Server Actions para gestão de editores (admin)
- `types.ts` - Tipos (UserRole, UserProfile, AuthContextValue)

**`/features/theme`** - Tema da aplicação

- `theme-provider.tsx` - Provider de tema claro/escuro
- `theme-toggle.tsx` - Botão de alternância de tema

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
  - `getDayName()` / `getDayNameShort()` - Nome do dia em português
  - `groupByDay()` - Agrupa eventos por dia da semana
  - `getOrderedDays()` - Dias ordenados (domingo primeiro)
  - `canGroupWeekdays()` - Verifica se pode agrupar dias úteis
  - `formatRecurrence()` - Label de recorrência ("1ª Sexta-feira do mês")
  - `isValidTime()` - Valida formato HH:MM
  - `getEventKey()` - Gera chave única para React
- `clergy.ts` - Utilitários de clero:
  - `getRoleLabel()` - Traduz role para português ("Pároco", "Vigário")
  - `getClergyTitle()` - Retorna prefixo ("Pe.", "Mons.", "Fr.", "Dom")
  - `formatClergyName()` - Nome completo formatado ("Pe. José da Silva, OFM")
  - `sortClergyByRole()` - Ordena por hierarquia canônica
  - `isActiveClergyMember()` / `getActiveClergyMembers()` - Filtra clérigos ativos
  - `getPastClergyMembers()` - Filtra clérigos anteriores
  - `formatClergyTenure()` - Período de atuação ("2021 - Atual")
  - `sortClergyByStartDate()` - Ordena por data de início
  - `getClergyForChurch()` - Filtra clérigos de uma igreja específica por churchId
  - `getAllClergyWithChurch()` - Enriquece clérigos com dados da igreja (join por churchId)
  - `sortClergyByName()` - Ordena alfabeticamente por nome
  - `getClergyInitials()` - Letras iniciais únicas dos nomes
  - `filterClergyByInitial()` - Filtra por letra inicial (ignora acentos)
- `contact.ts` - Utilitários de contato:
  - `formatPhoneForDisplay()` - Formata telefone ("(82) 99999-9999")
  - `formatPhoneForHref()` - Telefone para href (apenas dígitos)
  - `formatInstagramHandle()` / `getInstagramUrl()` - Instagram
  - `formatFacebookName()` / `getFacebookUrl()` - Facebook
  - `getWebsiteUrl()` / `formatWebsiteForDisplay()` - Website

### `/types` - Definições de tipos TypeScript

Tipos e interfaces compartilhados.

- `church.ts` - Tipos principais:
  - `Church` - Interface da igreja
  - `ChurchType` - Tipo de entidade ("parish", "rectory", "cathedral", "chapel", "sanctuary")
  - `ChurchContact` - Informações de contato
  - `ScheduleEvent` - Evento de horário (missa, adoração, confissão)
  - `Activity` - Atividade com horários
  - `DayOfWeek` - Tipo literal (0-6)
  - `RecurrenceType` - Tipos de recorrência
  - `Clergy` - Interface do clérigo
  - `ClergyWithChurch` - Clérigo enriquecido com dados da igreja (para listagens)
  - `ClergyRole` - Cargo ("parish-priest", "vicar", "deacon", "administrator", "rector")
  - `ClergyTitle` - Título ("padre", "monsenhor", "frei", "dom")
  - `ReligiousOrderSuffix` - Ordem religiosa ("OFM", "SJ", "OP", "OSB", etc.)
  - `ChurchMinistry` - Grupo, movimento ou pastoral (`{ id, label, acronym? }`)
  - `ChurchMinistries` - Ministérios por categoria (`{ groups?, movements?, pastorals? }`)
- `index.ts` - Re-exporta todos os tipos

### `/data` - Dados estáticos (legado)

Arquivos TS mantidos como referência e para o script de seed (`scripts/seed.ts`). **Não são mais importados** pelas páginas da aplicação — os dados vêm do Supabase.

- `churches.ts` - 55 igrejas reais de Maceió/AL (fonte: [Hora da Missa](https://www.horadamissa.com))
- `clergy.ts` - Clérigos como entidades independentes
- `ministries.ts` - Grupos, movimentos e pastorais por categoria

### `/public` - Assets estáticos

Arquivos públicos servidos diretamente.

**`/public/images`** - Imagens (estrutura flat)

- `via-fidei-logo.png` - Logo e imagem padrão (placeholder)
- Imagens de igrejas e clérigos por slug (ex: `sao-paulo-apostolo.jpg`, `pe-manoel-jose-dos-santos.jpg`)

### `/lib/supabase` - Integração com Supabase

- `env.ts` - Variáveis conforme [quickstart Next.js + Supabase](https://supabase.com/docs/guides/getting-started/quickstarts/nextjs): `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (fallback opcional: anon JWT legada); `SUPABASE_SERVICE_ROLE_KEY` para scripts privilegiados
- `public.ts` - Client só com publishable key, sem cookies (queries públicas, `generateStaticParams`)
- `client.ts` - Client para Client Components (`createBrowserClient`)
- `server.ts` - Client para Server Components/Actions (`createServerClient` com cookies — Auth e rotas que precisam da sessão)
- `middleware.ts` (em `lib/supabase/`) - Helper usado pelo [`middleware.ts`](middleware.ts) na raiz do projeto
- `queries/churches.ts` - Queries de igrejas (`getChurches`, `getChurchBySlug`, `getChurchSlugs`)
- `queries/clergy.ts` - Queries de clérigos (`getAllClergyWithChurch`)
- `queries/index.ts` - Barrel exports

**Variáveis (`.env.local`):** ver [`.env.example`](.env.example) — no mínimo `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`; para `npm run seed`, também `SUPABASE_SERVICE_ROLE_KEY`. Detalhes: [API keys](https://supabase.com/docs/guides/api/api-keys).

### `/supabase` - Migrations SQL

Arquivos de migration para criar o schema do banco, ordenados numericamente:

- `001_profiles.sql` - Tabela de perfis (vinculada ao auth.users) + triggers
- `002_churches.sql` - Tabela de igrejas
- `003_schedule_events.sql` - Horários (missas, adorações, confissões)
- `004_activities.sql` - Atividades + horários de atividades
- `005_clergy.sql` - Clérigos + vínculo clérigo-igreja
- `006_ministries.sql` - Ministérios + vínculo ministério-igreja
- `007_editor_churches.sql` - Vínculo editor-igreja
- `008_rls_policies.sql` - Todas as políticas de Row Level Security

### `/scripts`

- `seed.ts` - Migra dados de `data/*.ts` para o Supabase (usa `SUPABASE_SERVICE_ROLE_KEY`)
- `load-env.ts` - Carrega `.env.local` antes do seed (via `dotenv`)

## Fluxo de dados

1. Dados no **Supabase** (PostgreSQL); acesso controlado por **RLS** (políticas em `008_rls_policies.sql`).
2. **Leituras públicas** (home, detalhe da igreja, clero): `lib/supabase/public.ts` + `queries/*` — sem `cookies()`, role `anon` nas políticas.
3. **Sessão autenticada**: `lib/supabase/server.ts` (cookies) — login, `/admin`, Server Actions que precisam do usuário.
4. **ISR** com `revalidate = 60` nas páginas que consomem Supabase.
5. **Cliente**: `features/churches` com busca/filtro/paginação em `useState` após hidratação.

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

### Dados e entidades

#### Cadastro e manutenção de dados

Os dados de produção vivem no **Supabase**. Para enriquecer igrejas e clérigos: **Table Editor**, SQL ou fluxos futuros de edição (admin/editor). O seed inicial partiu de `data/*.ts`; alterações pontuais podem continuar atualizando os TS e rodando `npm run seed` em ambiente de desenvolvimento (ou editar direto no banco).

#### Histórico do clero nas igrejas

Novo campo `clergyHistory?: Clergy[]` na interface `Church` (separado de `clergy[]`) para armazenar clérigos que já passaram pela paróquia. `clergyHistory[]` **substitui** a lógica atual de filtrar por `endDate` em `clergy[]`. No banco, alinhar com `church_clergy` (datas) ou coluna dedicada. O componente `ClergyHistory` passaria a consumir esse campo em vez de filtrar `church.clergy`. Sessão dedicada na página de detalhes da igreja.

### Contribuição do usuário

#### Sugestão de correção/contribuição

Botão discreto na página de detalhes da igreja e no modal de detalhes do clérigo com texto semelhante a "Algum dado errado ou deseja contribuir com outras informações? Clique aqui". Modal com formulário contendo: referência da igreja/clérigo (preenchida automaticamente), assunto, descrição e email de contato. Inicialmente sem backend: `console.log` dos dados + toast de confirmação para verificação.

#### Sugestão de cadastro

Botão abaixo do filtro na listagem de igrejas ("Não encontrou a igreja que queria?") e na listagem de clérigos ("Não encontrou o padre que queria?"). Modal com formulário contendo campos da entidade correspondente (com tipos corretos). Campos mínimos obrigatórios para submissão (ex: nome e bairro para igreja, nome e função para clérigo). Inicialmente sem backend: `console.log` dos dados + toast de confirmação para verificação.

### Área administrativa e controle de acesso

#### Modelo de papéis

Três papéis no sistema:

| Papel | Acesso | Capacidades |
|-------|--------|-------------|
| **Admin** | Rota `/admin` + todas as igrejas | Criar/gerenciar editores, vincular a igrejas, editar dados de qualquer igreja, cadastrar entidades |
| **Editor de Igreja** | Login + igrejas vinculadas | Navegar normalmente; editar/adicionar dados apenas nas igrejas vinculadas à sua conta |
| **Visitante** | Público (anônimo) | Navegar, consultar dados, sugerir correções (futuro) |

Um editor pode ser vinculado a **múltiplas igrejas**. Admin tem acesso de edição em todas.

#### Autenticação (implementado)

- **Login:** `/login` (rota sem link na UI). Email/senha via Supabase Auth (`signInWithPassword`); redirecionamento: admin → `/admin`, editor → `/`.
- **Sessão:** cookies + `@supabase/ssr`; `middleware.ts` na raiz renova tokens; `AuthProvider` + `useAuth` no cliente para papel e igrejas vinculadas.
- **Perfis:** tabela `profiles` (roles `admin` | `editor`), trigger ao criar usuário em `auth.users`.

#### Gestão de editores (admin) — implementado

- Dashboard `/admin`, lista `/admin/usuarios`, detalhe `/admin/usuarios/[id]`, novo `/admin/usuarios/novo`.
- Vincular/desvincular igrejas, ativar/desativar editor. Atalho **Gerenciar editores** na página da igreja para admin (`AdminChurchLink`).

#### Experiência do editor na página de igreja — UI preparada

- Componentes `EditableSection`, `EditIndicator`, `admin-church-link` condicionam empty state + lápis ao papel e vínculos.
- **Pendente:** formulários e Server Actions que persistem alterações no Supabase (botões de adicionar/editar ainda sem fluxo completo).

#### Comportamento por papel na página de detalhes (alvo de UX)

| Seção | Visitante | Editor (vinculado) | Admin |
|-------|-----------|-------------------|-------|
| Dados preenchidos | Visualiza | Visualiza + lápis para editar | Visualiza + lápis para editar |
| Seção vazia | Oculta | Empty state + botão "Adicionar" | Empty state + botão "Adicionar" |
| Igreja não vinculada | — | Visualiza (somente leitura) | — |

#### Cadastros administrativos — pendências

- **Igrejas / clérigos / ministérios em massa:** telas com formulário ou JSON validado contra os tipos — **não implementadas**; dados entram hoje via seed, SQL ou Table Editor.
- **Editores:** fluxo de criação via `admin-actions` (requer cliente com permissões Admin API — validar em produção). Listagem e vínculos de igrejas implementados na UI.

### Infraestrutura

#### Migração de imagens para cloud (V2)

Atualmente as imagens ficam em `/public/images/`. Em V2, considerar migração para storage em nuvem (Vercel Blob, Supabase Storage, Cloudinary).
