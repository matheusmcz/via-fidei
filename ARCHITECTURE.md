# Estrutura do Projeto

## Organização por Feature

O projeto segue uma arquitetura organizada por **features/domínios**, não por tipo de arquivo.

### `/app` - App Router (Next.js)

Contém rotas, layouts e páginas da aplicação.

- `layout.tsx` - Layout raiz com metadados e fontes
- `page.tsx` - Página inicial (listagem de igrejas com busca e filtro)
- `globals.css` - Estilos globais e variáveis CSS do Tailwind
- `igreja/[slug]/page.tsx` - Página de detalhes da igreja (SSR com `generateStaticParams`)
- `igreja/[slug]/not-found.tsx` - Página 404 customizada
- `clero/page.tsx` - Listagem geral de clérigos com filtro alfabético

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
- `schedule-day-list.tsx` - Lista de horários por dia
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

**`/features/clergy`** - Feature de listagem de clérigos (página `/clero`)

- `clergy-page-list.tsx` - Lista com busca e filtro alfabético (Client Component)
- `clergy-list-card.tsx` - Card compacto de clérigo
- `clergy-page-modal.tsx` - Modal com detalhes e link para paróquia
- `use-clergy-filters.ts` - Hook de busca e filtro por letra inicial

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
- `index.ts` - Re-exporta todos os tipos

### `/data` - Dados estáticos

Arquivos TS com dados versionados.

- `churches.ts` - 55 igrejas reais de Maceió/AL (fonte: [Hora da Missa](https://www.horadamissa.com)). Cada igreja pode ter `clergy[]` com dados completos inline.
- `clergy.ts` - Clérigos como entidades independentes, vinculados a igrejas por `churchId`. Usado pela página `/clero` para listagem e busca.
- **Modelo dual**: dados de clérigos existem nos dois arquivos. Ao cadastrar, adicionar em ambos.
- Sem CRUD, cadastro manual

### `/public` - Assets estáticos

Arquivos públicos servidos diretamente.

**`/public/images`** - Imagens (estrutura flat)

- `via-fidei-logo.png` - Logo e imagem padrão (placeholder)
- Imagens de igrejas e clérigos por slug (ex: `sao-paulo-apostolo.jpg`, `pe-manoel-jose-dos-santos.jpg`)

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

### Dados e entidades

#### Cadastro de clérigos

Alimentar os dados de clérigos em `data/clergy.ts` e no campo `clergy[]` das respectivas igrejas em `data/churches.ts`. A infraestrutura (tipos, componentes, páginas) já está implementada.

#### Histórico do clero nas igrejas

Novo campo `clergyHistory?: Clergy[]` na interface `Church` (separado de `clergy[]`) para armazenar clérigos que já passaram pela paróquia. `clergyHistory[]` **substitui** a lógica atual de filtrar por `endDate` em `clergy[]` -- clérigos ativos ficam em `clergy[]`, históricos ficam em `clergyHistory[]`. A função `getPastClergyMembers()` e a filtragem por `endDate` serão removidas. O componente `ClergyHistory` passará a consumir diretamente `church.clergyHistory` em vez de filtrar `church.clergy`. Modelo dual: dados também em `data/clergy.ts` (com `endDate` preenchido). Sessão dedicada na página de detalhes da igreja.

#### Grupos, Movimentos e Pastorais

Nova interface `ChurchMinistry` (`{ id: string; label: string; acronym?: string }`) e `ChurchMinistries` com três chaves: `groups?: ChurchMinistry[]`, `movements?: ChurchMinistry[]`, `pastorals?: ChurchMinistry[]`. Novo campo `ministries?: ChurchMinistries` na interface `Church`. Novo arquivo `data/ministries.ts` com lista independente de todos os grupos/movimentos/pastorais cadastrados (modelo dual, igual clérigos). Ministries se diferencia de `activities` (que são eventos/rituais religiosos com horário) -- ministries são grupos de pessoas que se unem para servir a um propósito pastoral/comunitário, sem horário vinculado. UI: nova sessão na página de detalhes com três subdivisões, cada uma exibindo tags. Exemplos: ECC, Segue-me, QGC, JM, IAM, Pastoral Familiar, Terço dos Homens, Legião de Maria, MESCes.

### Contribuição do usuário

#### Sugestão de correção/contribuição

Botão discreto na página de detalhes da igreja e no modal de detalhes do clérigo com texto semelhante a "Algum dado errado ou deseja contribuir com outras informações? Clique aqui". Modal com formulário contendo: referência da igreja/clérigo (preenchida automaticamente), assunto, descrição e email de contato. Inicialmente sem backend: `console.log` dos dados + toast de confirmação para verificação.

#### Sugestão de cadastro

Botão abaixo do filtro na listagem de igrejas ("Não encontrou a igreja que queria?") e na listagem de clérigos ("Não encontrou o padre que queria?"). Modal com formulário contendo campos da entidade correspondente (com tipos corretos). Campos mínimos obrigatórios para submissão (ex: nome e bairro para igreja, nome e função para clérigo). Inicialmente sem backend: `console.log` dos dados + toast de confirmação para verificação.

### Área administrativa

#### Rota /admin (autenticação mockada)

Rota escondida `/admin` (sem links na UI). Login com credenciais mockadas (hardcoded). Contexto de autenticação (React Context ou cookie) para persistir sessão. Ao estar logado como admin, campos de dados nas páginas de detalhes ganham botão de edição (ícone de lápis). Fluxo de edição inline: lápis -> input pré-preenchido -> check (salvar) / X (cancelar). Inicialmente altera apenas os arrays mockados em memória -- **alterações se perdem ao recarregar a página** (sem persistência até haver backend).

#### Cadastro de igrejas (admin)

Tela acessível apenas para admin. Dois métodos de cadastro: formulário com todos os campos da entidade `Church` (incluindo seleção de clérigos já cadastrados) com submissão apenas com mínimo obrigatório preenchido; ou campo de texto para colar JSON, com validação automática de formato e tipos contra a interface `Church`. Inicialmente adiciona ao array mockado.

#### Cadastro de clérigos (admin)

Tela acessível apenas para admin. Dois métodos de cadastro: formulário com todos os campos da entidade `Clergy` (incluindo seleção de paróquia) com submissão apenas com mínimo obrigatório preenchido; ou campo de texto para colar JSON, com validação automática. Inicialmente adiciona aos arrays mockados (tanto `clergy.ts` quanto `church.clergy[]`).

#### Cadastro de grupos, movimentos e pastorais (admin)

Tela acessível apenas para admin. Formulário simples: select para tipo (Grupo/Movimento/Pastoral), campo nome e campo sigla (ex: tipo: Movimento, nome: Encontro de Casais com Cristo, sigla: ECC). Inicialmente adiciona ao array mockado em `data/ministries.ts`.

### Infraestrutura

#### Migração de imagens para cloud (V2)

Atualmente as imagens ficam em `/public/images/`. Em V2, considerar migração para storage em nuvem (Vercel Blob, Supabase Storage, Cloudinary).
