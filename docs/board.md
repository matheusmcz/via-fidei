# Board de demandas — Via Fidei

Controle das demandas do projeto: o que está em andamento, o que falta fazer, as decisões tomadas e o que já foi entregue.

**Atualizado em:** 12/11/2026 (Fase 2: leva 3, onda 1 concluída)

## Como usar

- Cada item tem um ID (`VF-NNN`) para ser citado em conversas, branches e PRs.
- **Origem** indica de onde o item veio:
  - `doc`: já estava listado na documentação (ARCHITECTURE, QA) até 23/10/2026.
  - `análise`: identificado na análise do código feita com o Claude em 29/10/2026.
  - `avaliação`: identificado na avaliação técnica de 30/10/2026 (segurança, performance, Supabase, arquitetura).
  - `decisão`: consequência de uma decisão registrada na seção **Decisões**.
  - `revisão`: achado médio ou baixo do agente `reviewer` adiado para depois. Leva o ID do achado e a demanda de origem, ex.: `revisão` (R2-3 em VF-021) · médio.
- Ao concluir um item, marcar `[x]`, mover para **Concluído** com a data e citar o PR.
- **Severidade** (mesma escala do agente `reviewer`): `crítico`, `alto`, `médio` ou `baixo`. A ordem dentro de cada seção não é prioridade: a prioridade sugerida está na **Triagem**.

---

## Em andamento

Trabalho em fases, com sessões paralelas coordenadas por uma sessão orquestradora (D12). Cada sessão trabalha em uma branch própria a partir de `develop` e abre um PR; o merge é do usuário.

A **leva 3 da Fase 2** está em andamento, com a **onda 1 concluída**: VF-107 (PR #38, 08/11) e o núcleo do VF-098 (PR #39, 09/11), as duas mergeadas na `develop`. _Nenhuma sessão rodando agora._

**Leva 3 — ondas restantes**

| Onda | Itens | Branch sugerida | Migration |
|------|-------|-----------------|-----------|
| 2 | VF-108 (retenção e anonimização, D22) · VF-085 + VF-104 (`auth-provider.tsx`) | `feat/retencao-auditoria` · `fix/auth-provider-e-permissao-ui` | `019` · nenhuma |
| 3 | VF-086 (middleware) · VF-091 (camadas do admin) | `fix/middleware-sessao` · `refactor/admin-camadas` | nenhuma |
| 4 | VF-035 (tipos gerados) | `refactor/tipos-gerados` | nenhuma |

No máximo **2 sessões por vez** (limite de uso), com merge do usuário ao fim de cada onda. O VF-035 vem depois do VF-091 porque os dois mexem em `lib/supabase/queries/`.

**Próximas fases (planejamento)**

| Fase | Itens | Observação |
|------|-------|------------|
| 2 · médios, leva 3 (restante) | VF-108 (retenção e anonimização da auditoria, D22) · VF-085 e VF-104 · VF-086 · VF-091 · VF-035 (tipos gerados) | Auth e admin em sequência (mesmos arquivos). Próxima migration: `019` |
| 2 · médios, vindos do fatiamento do VF-098 (D23) | VF-114 (job de CI com Docker), VF-115 (pgTAP), VF-116 (paridade SQL/TS), VF-117 (e2e logado e Server Actions) | Para a próxima leva da Fase 2. O VF-117 só vale no CI depois do VF-114 |
| 2 · com o usuário | VF-087 (histórico de migrations no projeto remoto), VF-089 (backup, tarefa assistida) | VF-010 e o Docker do VF-098 foram resolvidos em 07/11 |
| 3 · baixos | VF-012, VF-094, VF-096, VF-112 (banco); VF-031, VF-032, VF-095, VF-097, VF-037, VF-033, VF-034, VF-039, VF-110, VF-111; VF-113, VF-118, VF-119, VF-121, VF-122, VF-123, VF-124 (testes e ferramental) | |
| 4 · funcionalidades | VF-020, VF-022, VF-024 → VF-021, VF-027, VF-109 → VF-025, VF-026 | As dependências do VF-021 (VF-083, VF-088, VF-093 e VF-105) estão concluídas; VF-025/026 dependem do VF-003; as perguntas do VF-109 são respondidas na hora de implementar |

---

## A fazer

### Triagem — avaliação técnica de 30/10/2026

Prioridade sugerida, da mais urgente para a menos urgente. A decisão final é do usuário.

| Severidade | Itens |
|-----------|-------|
| **Crítico** | _Nenhum._ O VF-080 foi concluído em 30/10. |
| **Alto** | _Nenhum._ VF-011 e VF-030 concluídos em 31/10. |
| **Médio** | VF-085 (AuthProvider carrega em dobro) · VF-086 (middleware consulta o Auth a cada requisição) · VF-087 (histórico de migrations no remoto) · VF-089 (backup e pausa do plano gratuito) · VF-091 (admin acessa o banco direto) · VF-108 (retenção e anonimização da auditoria) · VF-035 (tipos gerados) · VF-114 · VF-115 · VF-116 · VF-117 (fatiamento do VF-098) |
| **Baixo** | VF-012 · VF-094 · VF-095 · VF-096 · VF-097 · VF-031 · VF-032 · VF-037 · VF-106 · VF-110 · VF-111 · VF-112 · VF-113 · VF-118 · VF-119 · VF-121 · VF-122 · VF-123 · VF-124 |

Pontos fortes confirmados na avaliação, a manter:
- RLS habilitado em todas as tabelas. Teste anônimo em produção em 30/10: `profiles` e `editor_churches` voltam vazias, as tabelas públicas são legíveis e as funções de checagem respondem `false`.
- `service-role` isolado com `server-only` e usado só na criação de usuário.
- O servidor valida a sessão com `getUser()`, e não com `getSession()`.
- `requireAdmin()` em todas as Server Actions de admin, e o trigger da `010` impede autopromoção.
- O cliente público sem cookies mantém as páginas estáticas com ISR.
- O React 19 bloqueia links `javascript:` vindos do banco.

### Perguntas em aberto (responder antes de implementar)

- [ ] **VF-003 · Detalhes da regra de cargo do clero** (bloqueia VF-025). Origem: `decisão` (D1).
  - Respondido em 29/10/2026 (ver D1):
    - Histórico de igrejas anteriores do clérigo: **não** será guardado por ora; foco no estado atual.
    - Troca de cargo: **abre um novo período**.
    - Cargo sem paróquia: **sim** (ex.: Pe. Marcio Manoel, reitor do Seminário Maior Nossa Senhora da Assunção).
  - Ainda em aberto:
    1. A seção de **clérigos anteriores** na página da igreja (hoje Pe. Manoel e Diác. Inácio em São Paulo Apóstolo) continua ou sai?
    2. Cargo fora de paróquia: o seminário (e similares) vira uma **entidade** no sistema ou o cargo fica só como texto no clérigo?
    3. "Reitor" do seminário e "reitor" de igreja (`rector`) são o mesmo cargo ou cargos diferentes?

- [ ] **VF-109 · Tela de auditoria no admin** (bloqueia a implementação). Origem: `revisão` (VF-093).
  - Em aberto, para responder **na hora de implementar** (Fase 4, decisão do usuário em 07/11/2026):
    1. Quais filtros a tela precisa ter (igreja, autor, tabela, período)?
    2. O editor vê o histórico das igrejas dele ou só o admin vê? Hoje só o admin lê o `audit_log` (RLS).

### Segurança

- [ ] **VF-012 · `search_path` e permissão de execução das funções `is_admin()` e `is_editor_of()`** · **baixo** — são `security definer` sem `set search_path` (o Supabase recomenda fixar) e ficam expostas para `anon` em `/rest/v1/rpc/*` (respondem `false`, conferido em 30/10). Fixar o `search_path` e revogar `execute` de `anon`. Origem: `análise` + `avaliação` · `008_rls_policies.sql`.

- [ ] **VF-094 · Usuário altera o próprio `email` e `name` em `profiles`** · **baixo** — a política `profiles_update_own` não restringe colunas. O email mostrado no painel admin pode divergir do email real do Auth. Bloquear `email` no trigger da `010` ou ler o email do Auth. Origem: `avaliação` · `008_rls_policies.sql`.

- [ ] **VF-108 · Retenção e anonimização do `audit_log`** (D22) · **médio** — guardar os registros por 2 anos, com limpeza automática, e anonimizar nome e e-mail ao excluir um editor (LGPD). Hoje o `DELETE` de um perfil guarda nome e e-mail em `old_data`, e o `INSERT` e o `UPDATE` também podem guardá-los em `new_data` e `old_data`; nenhuma role da API apaga esses dados. Definir como a limpeza roda (ex.: `pg_cron` no Supabase ou job externo) e cobrir os registros anteriores à exclusão do editor. **Respondido pelo usuário (07/11/2026):** `actor_id` e `record_pk` **continuam** no log — a anonimização alcança só nome e e-mail, porque o rastro de quem fez o quê é o próprio motivo da auditoria e o UUID sozinho não identifica ninguém depois que o perfil sai. Origem: `decisão` + `revisão` (R1-5 em VF-093) · `supabase/migrations/017_auditoria_alteracoes.sql`.

### Funcional

- [ ] **VF-020 · Botão de sair e indicador de sessão** — a action `logout` existe, mas nenhuma tela a usa. Origem: `doc`.
- [ ] **VF-021 · Formulários e Server Actions de edição na página da igreja** — os botões "Adicionar" e o lápis ainda não fazem nada. Deve respeitar as permissões da D3. Origem: `doc`.
- [ ] **VF-022 · Seções vazias para o visitante** conforme a D4: esconder os cards vazios de Contato, Clero e Ministérios; em Horários, mostrar "Horários ainda não informados". Atualizar o caso CT-007 do QA. Origem: `doc` + `decisão` · `features/churches/editor/editable-section.tsx`.
- [ ] **VF-024 · Filtro por igreja em `/admin/usuarios`** — o link "Gerenciar editores" envia `?church=<id>`, mas a página ignora o parâmetro e lista todos os editores. Origem: `análise` · `features/churches/editor/admin-church-link.tsx`, `app/admin/usuarios/page.tsx`.
- [ ] **VF-025 · Cargo do clero por período** (D1) — o cargo deixa de ficar em `clergy.role` e passa a ser registrado por período (troca de cargo abre novo período), com no máximo um vínculo ativo por clérigo (índice único parcial). Precisa suportar cargo **sem paróquia** (ex.: reitor de seminário). Ajustar queries e tipos. Depende das perguntas em aberto do VF-003. Origem: `decisão`.
- [ ] **VF-026 · Fonte única para "clérigo ativo"** — o banco tem `church_clergy.is_active`, mas a página da igreja decide ativo e histórico pela presença de `endDate`. Resolver junto com o VF-025. Substitui a ideia antiga de um campo `clergyHistory` separado; o destino da seção de clérigos anteriores depende do VF-003. Origem: `análise` + `doc` · `lib/utils/clergy.ts`, `lib/supabase/queries/churches.ts`.
- [ ] **VF-027 · Telas de cadastro administrativo** de igrejas, clérigos e ministérios. Hoje os dados entram por seed, SQL ou Table Editor. Origem: `doc`.

- [ ] **VF-104 · Permissão por tipo de dado na UI da igreja** · **baixo** — `canEditChurch` (`features/auth/auth-provider.tsx`) vale para a igreja inteira, então o editor vinculado vê o lápis no nome da igreja e o lápis/"Adicionar clérigo" na seção Clero, que são só do admin (D3). Pela D15, o editor vê o Clero como o visitante. O banco já recusa a gravação (`014`). Fazer antes do VF-021. Origem: `revisão` (R1-4 em VF-011).

### Qualidade e confiabilidade

- [ ] **VF-085 · `AuthProvider` carrega o usuário em dobro** · **médio**:
  - na montagem, `loadUser()` roda direto e de novo no evento `INITIAL_SESSION` do `onAuthStateChange` (perfil e vínculos buscados duas vezes, com corrida de estado), e repete a cada `TOKEN_REFRESHED`;
  - não há tratamento de erro;
  - o provider fica no layout raiz, então o cliente `supabase-js` vai no bundle de todos os visitantes, mesmo anônimos.

  Reagir só a `SIGNED_IN`/`SIGNED_OUT`/`USER_UPDATED` e avaliar carregar o provider só quando há sessão. Origem: `avaliação` · `features/auth/auth-provider.tsx`.
- [ ] **VF-086 · Middleware consulta o Supabase Auth a cada requisição** · **médio** — para quem está logado, `auth.getUser()` faz uma chamada de rede ao Auth em toda navegação, inclusive no prefetch de links. Para visitantes anônimos não há chamada (sem sessão). Avaliar `auth.getClaims()`, disponível na versão instalada, que valida o JWT localmente quando o projeto usa chaves de assinatura assimétricas, e restringir o `matcher` às rotas que dependem de sessão. Origem: `avaliação` · `lib/supabase/middleware.ts`, `middleware.ts`.
- [ ] **VF-087 · Migrations sem histórico no projeto remoto** · **médio** — as migrations são aplicadas manualmente no SQL Editor, e o histórico remoto só tem a `010`, o que abre espaço para divergência entre o repositório e o banco. **Feito (07–09/11/2026):** o CLI do Supabase virou devDependency fixada na v2.122.0 (D25, chamado com `npx supabase`), o projeto foi linkado e o VF-098 provou que as **18 migrations aplicam do zero, em ordem**, no Supabase local (D10). **Falta a parte remota:** `supabase migration repair` para 001–013 e `supabase db push`, para o histórico do projeto de produção bater com o repositório. As migrations de dados (`011`–`013`) localizam linhas pelo nome do clérigo; preferir chaves estáveis (ver VF-119). Origem: `avaliação` · `supabase/migrations/`.
- [ ] **VF-089 · Backup e pausa do plano gratuito** · **médio** — confirmar a política de backup do plano atual do Supabase e agendar um dump periódico (`supabase db dump`) guardado fora do Supabase. No plano gratuito o projeto pausa por inatividade e o site fica sem dados (ver VF-030). **Tarefa assistida (07/11/2026):** a sessão escreve o script de dump, o agendamento (launchd no macOS ou GitHub Action com secret) e a documentação; o usuário faz o que depende do painel e de credencial — conferir a política de backup do plano (Database → Backups), fornecer a senha do banco por variável de ambiente ou Keychain (**nunca** no repositório nem em texto na conversa) e escolher onde o dump fica guardado. Momento sugerido: agora que o Supabase local existe (VF-098), dá para testar a restauração de verdade. Origem: `avaliação`.
- [ ] **VF-091 · Admin acessa o banco direto nas páginas** · **médio** — `app/admin/*` monta consultas Supabase dentro das páginas, e `/admin/usuarios/novo` busca as igrejas no cliente pelo cliente do browser, o que contraria a regra de camadas do `dev-workflow.md`. Mover para `lib/supabase/queries/admin.ts` e Server Components, e mover `features/auth/admin-actions.ts` para `features/admin/`. As páginas do admin também ignoram o `error` do Supabase: o dashboard mostra contagem 0, a lista de editores vem vazia e o detalhe do editor cai em `notFound()`; aplicar a regra "erro lança, ausência é `null`" do VF-030. Também: `app/admin/layout.tsx` repete a regra de admin ativo e pode usar `isActiveAdmin` (`features/auth/access.ts`); o formulário `/admin/usuarios/novo` não limita o tamanho de nome e senha (`maxLength`), só o servidor valida (VF-083). Origem: `avaliação` + `análise` (sessão do VF-030).
- [ ] **VF-095 · Cliente público e limites de consulta** · **baixo** — `createPublicClient()` não desliga `persistSession`/`autoRefreshToken` e é recriado a cada chamada. As consultas de listagem não têm `.limit`/paginação, e o PostgREST corta em 1000 linhas por padrão, o que passa a importar na expansão para a Arquidiocese (VF-073). Origem: `avaliação` · `lib/supabase/public.ts`, `lib/supabase/queries/`.
- [ ] **VF-096 · Desempenho do RLS e índices redundantes** · **baixo** — envolver `auth.uid()`, `is_admin()` e `is_editor_of()` em `(select …)` nas políticas, como o Supabase recomenda, para avaliar uma vez por consulta e não por linha. Remover os índices redundantes:
  - `churches_slug_idx` duplica o índice do `unique`;
  - `editor_churches_editor_id_idx` duplica o prefixo da chave primária;
  - `church_clergy_is_active_idx` é booleano, de baixa seletividade.

  Impacto pequeno com o volume atual. Origem: `avaliação` · `008_rls_policies.sql`, `002`, `005`, `007`.
- [ ] **VF-097 · Código sem uso** · **baixo** — `getAllClergyWithChurch` e `getClergyForChurch` em `lib/utils/clergy.ts` não são usados (o primeiro tem o mesmo nome da query de `lib/supabase/queries/clergy.ts`), e `getSession` em `features/auth/actions.ts` é exportada sem uso. A prop `onAdd` de `EditableSection` nunca é passada. `getSession()` sem uso devolve o perfil mesmo inativo: remover em vez de corrigir (VF-013). Origem: `avaliação`.
- [ ] **VF-031 · Imagem padrão de compartilhamento inexistente** · **baixo** — o Open Graph usa `/images/placeholder.svg`, que não existe em `public/images`. Origem: `análise` · `app/igreja/[slug]/page.tsx`.
- [ ] **VF-032 · Avisos do Next no console** · **baixo** — `metadataBase` não definido; logo detectada como LCP sem `priority`. Origem: `doc`.
- [ ] **VF-033 · Sitemap e robots** — o README promete "Sitemap automático", mas não existem `app/sitemap.ts` nem `app/robots.ts`. Origem: `análise`.
- [ ] **VF-034 · Extrair o bloco de logo e marca** compartilhado entre `PageHeader` e `AdminHeader`. Origem: `doc`.
- [ ] **VF-035 · Tipos gerados do banco** (`supabase gen types`) · **médio** — o cliente Supabase não é tipado, então `data` chega como `any`; hoje as linhas são descritas por interfaces `Db*` escritas à mão. Origem: `análise` · `lib/supabase/queries/`.
- [ ] **VF-037 · Seed idempotente** · **baixo** — `npm run seed` usa `insert`; rodar duas vezes gera erros de slug duplicado e dados parciais. Origem: `análise` · `scripts/seed.ts`.
- [ ] **VF-038 · Avaliar tipos de coluna para datas e horários** — `time`, `end_time` e as datas do clero são `text`. Hoje é intencional para aceitar só o ano. Reavaliar se surgir necessidade de ordenar ou filtrar por data. Origem: `análise`.
- [ ] **VF-039 · Migrar `next lint` para o ESLint CLI** — `next lint` está obsoleto e foi removido no Next 16. Hoje ele só verifica as pastas padrão (`app`, `components`, `lib`, `pages`, `src`): `features/` e `tests/` ficam de fora. Origem: `análise`.
- [ ] **VF-040 · Atualizar dependências** — o Next já está na 15.5.28 (VF-080). Aqui fica o restante: `@supabase/supabase-js` 2.99 → 2.118, `@supabase/ssr` 0.9 → 0.12 e Radix; avaliar Next 16 e `lucide-react` 1.x à parte. Ao subir o Next, tratar o override `overrides.next.postcss`: rodar `npm explain postcss`, remover o override se o Next novo já depender de `postcss >= 8.5.23` e removê-lo antes da atualização se ela fixar outra major do postcss (ver "Override do `postcss` no Next" no `ARCHITECTURE.md`). Ao subir para o Next 16, resolver também o 500 genérico do Next (em inglês) que aparece em página ISR sem cache com o Supabase fora do ar, sem passar pelo `error.tsx` (D20). Origem: `análise` + `revisão` (R1-1 em VF-080; VF-092).

- [ ] **VF-099 · `formatInstagramHandle` devolve `@https` para URL** · **baixo** — com `https://instagram.com/paroquia` a regex sem âncora devolve `@https`; o CT-003 espera `@paroquia`. Os dados atuais usam `@handle`, então não aparece no site. Ao corrigir, trocar o `it.fails` de `lib/utils/contact.test.ts` por `it`. Origem: `análise` (achado pelos testes do VF-036) · `lib/utils/contact.ts`.
- [ ] **VF-102 · Busca e filtro de bairro da home sem rótulo acessível** · **baixo** — o campo "Buscar igreja..." e o select de bairro não têm `label`/`aria-label`. Origem: `análise` (testes do VF-036) · `features/churches/`.
- [ ] **VF-103 · `useChurchFilters` altera a prop `churches`** · **baixo** — sem filtro, ordena com `.sort()` o array recebido; trocar por `[...result].sort(...)`. Origem: `análise` (testes do VF-036).

- [ ] **VF-106 · CSP mais estrita** · **baixo** — hoje `script-src` precisa de `'unsafe-inline'` por causa dos scripts inline do RSC em páginas estáticas (nonce exige render dinâmico). Reavaliar hash/nonce, `experimental.sri` e um endpoint `report-to` quando o Next permitir com ISR. Origem: `análise` (sessão do VF-081) · `lib/security/headers.ts`.
- [ ] **VF-110 · `ThemeProvider` repete a regra do tema** · **baixo** — usar `applyStoredTheme()` de `features/theme/theme-script.ts` em vez de repetir a regra. Origem: `revisão` (R1-3 em VF-090 + VF-092).
- [ ] **VF-111 · `settle()` do e2e depende de `networkidle`** · **baixo** — instável por natureza; trocar por uma espera objetiva. Origem: `revisão` (VF-093) · `tests/e2e/security-headers.spec.ts:110`.
- [ ] **VF-112 · Auditar `TRUNCATE` nas tabelas editáveis** (opcional) · **baixo** — o trigger da `017` cobre `INSERT`, `UPDATE` e `DELETE`, mas não `TRUNCATE`. Origem: `revisão` (VF-093).

- [ ] **VF-113 · Teste próprio da fixture unificada** · **baixo** — criar `tests/fixtures/supabase.integration.test.ts` cobrindo: fila consumida em ordem, valor único reusado, erro ao consultar tabela sem resposta, erro de fila esgotada, `{ reject }` rejeitando só quando a consulta é aguardada, e `tables`/`queries`/`callsTo`/`findQueries`/`argsOf` com duas consultas na mesma tabela. **Depende de uma linha no `vitest.config.mts`:** o `include` dos projetos cobre só `{app,lib,features,components,types}/**`, então `tests/**` fica de fora (seguro: o padrão `*.integration.test.{ts,tsx}` não captura os specs do Playwright). Hoje o comportamento está coberto indiretamente pelos 111 testes de integração. Origem: `revisão` (R1-4 e R2 em VF-107) · `tests/fixtures/supabase.ts`.
- [ ] **VF-114 · Job no CI para o projeto Vitest `db`** · **médio** — o `npm run test:db` existe e passa (45 testes), mas é opt-in e não roda no CI, porque o runner não tem Docker. Criar um job com `supabase/setup-cli` que suba o stack local, aplique as migrations, **gere o `.env.test` com `npm run test:db:env`** (ele não vem do repositório, D26) e rode o `test:db`. Decidir se roda em todo PR ou só quando o diff tocar `supabase/migrations/`, `tests/db/` ou `lib/supabase/` (tempo de CI). Não foi feito na onda 1 para não conflitar com os PRs paralelos em `.github/workflows/ci.yml`. Origem: `revisão` (fatiamento do VF-098, D23).
- [ ] **VF-115 · Converter os roteiros de `supabase/tests/` para pgTAP (ou mudá-los de pasta)** · **médio** — os 7 arquivos de `supabase/tests/*.sql` são roteiros de verificação manual para o SQL Editor, não pgTAP, então `supabase test db` não os reconhece e falharia se alguém rodar. Converter para pgTAP ou mover para `supabase/verificacoes/` e documentar. A `014` já está coberta pelo `test:db` e o roteiro dela pode ser aposentado. Origem: `análise` (fatiamento do VF-098, D23) · `supabase/tests/`.
- [ ] **VF-116 · Paridade entre as funções de formato SQL e TS a partir de uma lista única de casos** · **médio** — `is_valid_schedule_time`/`isValidTime` e `is_valid_clergy_date`/`isValidClergyDate` repetem a mesma regra em SQL e em TS, e hoje nada garante que não divirjam. Escrever a lista de casos uma vez e rodá-la nas duas implementações: o lado SQL cabe no projeto `db`, porque as funções são expostas como RPC (caminho já provado no VF-098). Cobrir também `is_clergy_date_order_valid`, `is_schedule_time_order_valid` e `is_clergy_date_not_future`/`isClergyDateNotFuture`, lembrando que esta última diverge de propósito com `today` inválido. Origem: `revisão` (R1-1 em VF-088; fatiamento do VF-098, D23).
- [ ] **VF-117 · e2e logado (CT-011 a CT-013) e testes das Server Actions de admin no Supabase local** · **médio** — o `test:db` cobre RLS e triggers pelo cliente Supabase, mas não o fluxo de login no navegador nem as Server Actions. Usar o `.env.test` e o seed de `tests/db/seed.ts` para subir o `next start` contra o Supabase local e cobrir CT-011 a CT-013 com usuário logado, mais `createEditor` e as demais actions de `/admin`. Hoje o e2e cobre só a parte deslogada do CT-011 (`/login` com `noindex`, `/admin` → `/login`). Depende do **VF-114** para valer no CI. Origem: `análise` (fatiamento do VF-098, D23).
- [ ] **VF-118 · Cobrir no projeto `db` as migrations `015` a `018`** · **baixo** — o núcleo do VF-098 cobriu a `010` e a `014`. Faltam, e seguem só em roteiro manual: perfil inicial sem permissão (`015`), CHECKs de formato (`016`), trigger de auditoria da `017` (quem alterou, o quê, `actor_db_role`, `church_id` em cascata) e, da `018`, o `error.code` 23514 com o `details` `<tabela>_<coluna>_not_future`. Inclui também o upsert do seed com `start_date` nulo (índice `church_clergy_church_clergy_start_key`, `nulls not distinct`). Origem: `análise` (fatiamento do VF-098, D23) · `tests/db/`.
- [ ] **VF-119 · A migration `011` insere clero mesmo em banco vazio** · **baixo** — depois de um `supabase db reset` a tabela `clergy` não fica vazia: a `011` insere `José Elielton da Silva` e `Denis Francisco Menezes` mesmo sem o seed, porque o `where not exists` compara só o nome, e o comentário da migration ("os inserts não fazem nada se o seed ainda não rodou") está errado quanto a isso. O `insert into church_clergy` da mesma migration depende de `ch.slug = 'sao-paulo-apostolo'`, que não existe num banco novo, então as duas linhas ficam **sem vínculo com igreja**. Não afeta produção nem os testes atuais, mas polui qualquer banco recriado e reforça o ponto do VF-087 de que as migrations de dados deveriam usar chaves estáveis. Avaliar separar migrations de schema das de dados. Origem: `análise` (sessão do VF-098) · `supabase/migrations/011_clergy_vital_dates.sql`.
- [ ] **VF-121 · `.claude/docs/QA.md` desatualizado depois do VF-098** · **baixo** — o QA.md ainda lista só `test:unit`, `test:integration` e `test:e2e`, afirma que "testes que gravam dados … ainda não existem", e o CT-012 e o CT-013 seguem apontando roteiro **manual** no SQL Editor para a `014` e para a escalada de privilégio — o que os 45 testes do `test:db` agora automatizam. Acrescentar o `test:db`, marcar a parte da `010`/`014` como automatizada e ajustar o item "Migration nova aplicada" do checklist de regressão. Não feito na PR #39 porque o QA.md é compartilhado com a leva (o VF-104 mexe no CT-013). Origem: `revisão` (ressalva do `tester` no VF-098) · `.claude/docs/QA.md`.
- [ ] **VF-122 · Testar o caminho negativo da guarda de `tests/db/env.ts`** · **baixo** — `assertLocalSupabaseUrl` é a barreira que impede um teste de gravar em produção e, com o `.env.test` fora do versionamento (D26), é a **única**. Hoje só é exercitada no caminho válido. Testar em `tests/db/env.test.ts` (projeto `unit`, sem Docker): URL remota recusada, URL inválida recusada, os truques `http://127.0.0.1@evil.com` e `http://evil.com#127.0.0.1` recusados, a mensagem de variável faltando e o fato de a recusa **chegar ao terminal**. Avisar no arquivo para ninguém reintroduzir o acesso a `error.stack` em `tests/db/global-setup.ts` (ver VF-124). Origem: `revisão` (ressalva do `tester` no VF-098) · `tests/db/env.ts`.
- [ ] **VF-123 · `supabase db reset` avisa que falta `supabase/seed.sql`** · **baixo** — o `supabase/config.toml` tem `[db.seed] sql_paths = ["./seed.sql"]` e o arquivo não existe, então todo `db reset` imprime `no files matched pattern: supabase/seed.sql`. Inofensivo, mas é ruído que parece erro. Resolver com `sql_paths = []` (o seed de teste é o do Vitest, em `tests/db/seed.ts`) ou criando um `seed.sql` vazio com comentário. Origem: `análise` (sessão do VF-098) · `supabase/config.toml`.
- [ ] **VF-124 · Acompanhar o bug do `extractInlineSourceMap` no Vite/Vitest** · **baixo** — erro lançado no `globalSetup` tem a mensagem engolida (o Vite quebra em `extractInlineSourceMap` e imprime um `TypeError` no lugar). O `tests/db/global-setup.ts` contorna escrevendo `error.message` em stderr — **sem** tocar em `error.stack`, que é o que dispara o bug. Quando a correção subir upstream, o contorno pode sair. Origem: `análise` (sessão do VF-098) · `tests/db/global-setup.ts`.

_O **VF-120** foi cancelado em 08/11/2026: registrava uma exceção para versionar o `.env.test`, que deixou de existir com a D26. O ID fica sem uso._

### Dados e conteúdo

- [ ] **VF-050 · Conferir dados de exemplo no seed** — contato de São Paulo Apóstolo com `+5582999999999`; WhatsApp `+5582999888777` do Diác. Inácio Filho e Facebook `pe.manoeljose` com cara de valor fictício. Origem: `doc` + `análise` · `data/churches.ts`, `data/clergy.ts`.
- [ ] **VF-051 · Ampliar o cadastro do clero** — só a Paróquia São Paulo Apóstolo tem clérigos cadastrados. Origem: `doc`.
- [ ] **VF-053 · Poucos horários cadastrados** — em 30/10 o banco tinha 11 horários (`schedule_events`) e 2 atividades para as 55 igrejas. Horário é a informação principal da página (D4). Origem: `avaliação`.
- [ ] **VF-052 · Conferir os textos do rodapé** — "Arquediocese" (grafia) e "Dom. Carlos Alberto Breis - OFM" × "Dom Beto Breis" na bio do Pe. José Elielton. Origem: `análise` · `components/footer.tsx`.

### Ambiente e ferramentas

- [ ] **VF-060 · Node local na versão 24** — a máquina local roda Node 22; `engines` e `.nvmrc` pedem 24.x. Origem: `análise`.
- [ ] **VF-061 · `package-lock.json` solto na pasta home** (`~/package-lock.json`) — faz o Next inferir a raiz errada do workspace (aviso no lint e no build). Origem: `análise`.
- [ ] **VF-109 · Tela de auditoria no admin** — hoje o `audit_log` só pode ser lido pela API ou pelo SQL Editor. Depende das respostas em **Perguntas em aberto**. Origem: `revisão` (VF-093).
- [ ] **VF-064 · Portar comandos e agentes do Cursor para o Claude Code** — `reviewer`, `qa-tester` e `verifier` já viraram os agentes `reviewer` e `tester` (VF-004). Faltam `.cursor/commands` (commit, create-pr, qa, add-church, build-check…), o agente `data-auditor` e as `.cursor/skills`. Origem: `análise`.

---

## Ideias futuras

- [ ] **VF-070 · Sugestão de correção/contribuição** — botão discreto na página da igreja e no modal do clérigo ("Algum dado errado ou deseja contribuir com outras informações?"). Modal com referência automática, assunto, descrição e email. Primeira versão sem backend: `console.log` + toast. Origem: `doc`.
- [ ] **VF-071 · Sugestão de cadastro** — "Não encontrou a igreja que queria?" abaixo do filtro da home, e "Não encontrou o padre que queria?" em `/clero`. Modal com os campos da entidade; mínimos obrigatórios: nome e bairro (igreja), nome e função (clérigo). Primeira versão sem backend. Origem: `doc`.
- [ ] **VF-072 · Imagens em storage na nuvem (V2)** — sair de `public/images` para Supabase Storage, Vercel Blob ou Cloudinary. Necessário para upload pelos editores. Ao trazer fotos remotas, acrescentar a origem em `img-src` da CSP (`lib/security/headers.ts`) e em `images.remotePatterns` (VF-081). Origem: `doc`.
- [ ] **VF-073 · Expansão para toda a Arquidiocese** (D5) — hoje "Maceió/AL" está fixo na interface e `churches` só tem `district`. Vai exigir cidade no modelo e no filtro. Origem: `decisão`.
- [ ] **VF-074 · Editor sugere alteração de dados de identidade** (nome, endereço…) para aprovação do admin (D3). Origem: `decisão`.

---

## Decisões

| ID | Data | Decisão |
|----|------|---------|
| D1 | 29/10/2026 | Um clérigo está vinculado a **no máximo uma igreja por vez**; o cargo pode mudar com o tempo (ex.: vigário → pároco) e cada troca **abre um novo período**. Por ora **não** se guarda o histórico de igrejas anteriores do clérigo: o foco é o estado atual. Um clérigo pode ter cargo **sem paróquia** (ex.: Pe. Marcio Manoel, reitor do Seminário Maior Nossa Senhora da Assunção). Pontos em aberto no VF-003. |
| D2 | 29/10/2026 | Clérigos **falecidos** e **sem igreja** continuam aparecendo na listagem e na busca de `/clero`. |
| D3 | 29/10/2026 | Permissões do editor: edita contato, horários, atividades e grupos/movimentos/pastorais das igrejas vinculadas. Identidade da igreja (nome, slug, endereço, bairro, tipo) e clero (cadastro e vínculos) são só do admin. Complementada pela D11, D14 e D15. |
| D4 | 29/10/2026 | Seção vazia para o visitante: Contato, Clero e Ministérios vazios ficam ocultos; Horários vazio mostra "Horários ainda não informados". |
| D5 | 29/10/2026 | Abrangência: por ora só Maceió; o objetivo é toda a Arquidiocese de Maceió. |
| D6 | 29/10/2026 | Fluxo de trabalho mantido: Conventional Commits em português, branch por entrega, PR para `develop` e de `develop` para `main`. |
| D7 | 23/10/2026 | A `bio` do clérigo descreve a pessoa; vínculos com igrejas ficam em `church_clergy`, não na bio. |
| D8 | 30/10/2026 | Toda demanda de código segue o ciclo implementar → revisar (agente `reviewer`) → testar (agente `tester`): severidades crítico, alto, médio e baixo; crítico e alto corrigidos na hora; até 5 rodadas; retrospectiva com 8 ou mais achados, 3 ou mais críticos/altos ou rodada 4. Ver `.claude/rules/dev-workflow.md`. |
| D9 | 30/10/2026 | Testes: Vitest + Testing Library (unitários e integração) e Playwright (e2e). |
| D10 | 30/10/2026 | Testes que gravam dados rodam no Supabase local (Docker + CLI do Supabase), nunca no projeto de produção. |
| D11 | 30/10/2026 | Complemento da D3: o editor também altera a **foto da igreja** (`image_url`) e o **link do Google Maps** (`google_maps_url`), junto com o contato. |
| D12 | 30/10/2026 | Orquestração: uma sessão orquestradora abre sessões paralelas por fase (crítico → alto → médio → baixo → funcionalidades). Com o `reviewer` aprovado e o `tester` passando, a sessão commita e abre o PR para `develop`; o **merge é sempre do usuário**. O board é atualizado só pelo orquestrador, em PR `docs/` por leva. |
| D13 | 30/10/2026 | VF-062: `.github` passa a ser versionado (workflows de CI); só `.github/copilot-instructions.md` continua no `.gitignore`. |
| D14 | 30/10/2026 | Grupos, movimentos e pastorais: o **catálogo** (`ministries`) é só do admin; o editor **vincula e desvincula** itens existentes à igreja dele, sem criar itens novos. |
| D15 | 30/10/2026 | Na página da igreja, o editor vinculado vê a seção **Clero como o visitante**: sem lápis nem "Adicionar"; vazia, a seção some (D4). |
| D16 | 31/10/2026 | Validar a ordem no banco e em função pura: fim do vínculo depois do início, falecimento depois do nascimento, horário de término depois do de início. |
| D17 | 31/10/2026 | Datas do clero (nascimento, falecimento, início e fim do vínculo) não podem ser futuras. |
| D18 | 31/10/2026 | `.github/agents/` (agente antigo do Copilot) fica fora do Git, como o `.github/copilot-instructions.md`. |
| D19 | 02/11/2026 | Textos da tela de erro aprovados: "Não foi possível carregar esta página", "Algo deu errado do nosso lado. Tente novamente em instantes; se o problema continuar, volte mais tarde.", "Tentar novamente" ("Tentando…") e "Voltar para o início". |
| D20 | 02/11/2026 | O 500 genérico do Next em página ISR sem cache, com o Supabase fora do ar, será resolvido na atualização para o Next 16 (VF-040). |
| D21 | 02/11/2026 | Horário que atravessa a meia-noite continua **recusado**: vigílias longas ficam só com o horário de início, sem término. |
| D22 | 02/11/2026 | `audit_log` guardado por **2 anos**, com limpeza automática; nome e e-mail são **anonimizados** ao excluir um editor (LGPD). A implementar no VF-108. |
| D23 | 07/11/2026 | VF-098 fatiado: o núcleo (Supabase local no ar, migrations do zero, `.env.test`, projeto Vitest `db` e testes de RLS) entra na leva 3; job no CI, pgTAP, paridade SQL/TS e e2e logado viram itens próprios (VF-114 a VF-118). |
| D24 | 07/11/2026 | "Migrations são aplicadas pelo usuário" vale para **produção**. No Supabase **local** a própria sessão aplica. |
| D25 | 07/11/2026 | CLI do Supabase fixo na **v2.122.0**, como devDependency chamada com `npx supabase`; subir para a v3 é item próprio. |
| D26 | 08/11/2026 | O `.env.test` **não** é versionado: a regra "nunca commitar `.env*`" continua sem exceção. Cada máquina gera o arquivo com `npm run test:db:env`. |

---

## Concluído

### Novembro/2026

- [x] **VF-098 (núcleo)** · Supabase local como ambiente de teste: as 18 migrations aplicam do zero, projeto Vitest `db` opt-in (`npm run test:db`, 45 testes de RLS do editor e do trigger da `010`), seed mínimo de teste separado do `npm run seed` e `.env.test` gerado por máquina (D23 a D26). O resto do VF-098 virou VF-114 a VF-118 — PR #39 (09/11)
- [x] **VF-107** · Fixtures do Supabase simulado unificadas em `createFakeSupabaseClient`; `tests/fixtures/supabase-auth.ts` removida, sem perda de testes (unit 287 + 1 expected fail; integração 111) — PR #38 (08/11)
- [x] **VF-010** · Cadastro público desativado no Supabase, conferido pelo usuário (07/11)
- [x] **VF-105** · Ordem das datas e horários e datas não futuras: CHECKs de ordem, triggers "não futura" no fuso de Maceió e validadores em função pura (migration `018`, aplicada e verificada em 04/11; D16, D17, D21) — PR #36 (04/11)
- [x] **VF-093** · Auditoria de alterações: `audit_log` preenchido por trigger nas 10 tabelas editáveis, com leitura só do admin (migration `017`, aplicada e verificada em 04/11) — PR #35 (04/11)
- [x] **VF-090 + VF-092** · Ícones leves (1,2 KB e 4 KB) e logo de 1 MB para 8,4 KB; `error.tsx`, `global-error.tsx` e `app/admin/loading.tsx`, sem `loading.tsx` na página da igreja para não gerar soft-404 (D19, D20) — PR #34 (04/11)
- [x] **VF-084** · Página da igreja com consulta aninhada única e `cache()`; `toChurch` comum a `getChurches` e `getChurchBySlug`; `findQueryError` removida — PR #33 (04/11)
- [x] Board: leva 1 da Fase 2 concluída e leva 2 registrada — PR #32 (02/11)

### Outubro/2026

- [x] **VF-023** · `alert()` trocado por mensagem na tela em `toggleEditorActive` e `updateEditorChurches`, entregue junto com o VF-083 — PR #31 (31/10)
- [x] **VF-082 + VF-013 + VF-083** · Perfil novo nasce inativo (migration `015`, aplicada e verificada em 31/10); perfil desativado não entra e perde a edição; actions de admin validadas com zod e restritas a editores; `alert()` trocado por mensagem na tela — PR #31 (31/10)
- [x] **VF-088** · CHECK de formato `HH:MM` e `YYYY`/`YYYY-MM-DD`, índice único com `nulls not distinct` em `church_clergy` e `isValidTime` exigindo dois dígitos (migration `016`, aplicada e verificada em 31/10) — PR #29 (31/10)
- [x] **VF-081** · Cabeçalhos de segurança: CSP aplicada, `X-Frame-Options`, `nosniff`, `Referrer-Policy` e `Permissions-Policy`; HSTS vem da Vercel — PR #30 (31/10)
- [x] **VF-100 + VF-101** · Cliente Supabase simulado registra as chamadas; testes de `getChurchBySlug` e `findQueryError` (função removida depois, no VF-084) — PR #28 (31/10)
- [x] Board: Fase 1 concluída e leva 1 da Fase 2 registrada — PR #27 (31/10)
- [x] **VF-036** · Testes automatizados e CI: Vitest (unitários e integração) e Playwright (e2e só de leitura), workflow no GitHub Actions com Node 24 — PR #26 (31/10)
- [x] **VF-062** · `.github` versionado; só `.github/copilot-instructions.md` continua no `.gitignore` (D13) — PR #26 (31/10)
- [x] **VF-030** · Erro do Supabase lança em vez de virar 404 em cache; `.maybeSingle()` e `findQueryError()` nas consultas paralelas — PR #24 (31/10)
- [x] **VF-011** · RLS do editor conforme a D3/D11: trigger com lista de colunas permitidas em `churches` e editor sem escrita em `church_clergy` (migration `014`, aplicada e verificada no SQL Editor em 31/10) — PR #25 (31/10)
- [x] Orquestração por fases, decisões D11 a D15 e itens vindos da Fase 1 — PR #23 (31/10)
- [x] **VF-080** · Next.js 15.5.9 → 15.5.28 e `npm audit` zerado (produção e dev): `npm audit fix` (sharp 0.35, postcss, ws, nanoid, picomatch, source-map-js…), `overrides` para o Next usar `postcss` ≥ 8.5.23, `tsx` 4.23 (esbuild 0.28) e remoção do bloco `images` (`dangerouslyAllowSVG`) do `next.config.ts` — PR #22 (30/10)
- [x] **VF-004** · Fluxo implementar → revisar → testar: agentes `reviewer` e `tester`, regra `dev-workflow.md` e `APRENDIZADOS.md` — PR #20 (30/10)
- [x] **VF-002** · Projeto preparado para o Claude Code: `.claude/CLAUDE.md`, regras, docs em `.claude/docs/` e este board — PR #19 (30/10)
- [x] **VF-063** · GitHub CLI (`gh`) instalado e autenticado na conta `matheusmcz` (30/10)
- [x] **VF-001** · Clero da Paróquia São Paulo Apóstolo — PR #18 (24/10): migrations `011` (nascimento/falecimento), `012` (títulos: Cônego, Vigário Geral, Prefeito de Estudos) e `013` (bios sem paróquias); componentes `ClergyVitalInfo` e `ClergyHonorFlags`; Pe. José Elielton da Silva e Diác. Denis Francisco Menezes no clero; Pe. Manoel José dos Santos e Diác. Inácio Filho no histórico. Migrations conferidas no banco em 30/10
- [x] Validação ponta a ponta com Playwright dos fluxos públicos, admin e editor (23/10)
- [x] Migration `010`: trigger impede que não admins alterem o próprio `role`/`is_active`; remove as políticas de INSERT da `009` (23/10)
- [x] Server Actions de editores checam admin ativo (`requireAdmin`) (23/10)
- [x] `createEditor` remove o usuário do Auth se o perfil ou os vínculos falharem (23/10)
- [x] `updateEditorChurches` insere os vínculos novos antes de remover os antigos (23/10)
- [x] `lib/supabase/service-role.ts` protegido com `server-only` (23/10)
- [x] `bootstrap-users` identifica email duplicado pelo código `email_exists` (23/10)
- [x] Detalhe do editor com consultas em paralelo (23/10)
- [x] Título e `noindex` em `/admin` e `/login` (23/10)
- [x] Header do painel admin no padrão do site público e telas `/admin/*` responsivas (23/10)
- [x] Capturas de tela no README (23/10)

### Agosto/2026

- [x] Script `npm run bootstrap-users` e cliente service role (`createEditor` pela Auth Admin API) (27/08)
- [x] Migration `009`: `handle_new_user()` com `search_path` explícito (corrige "Database error creating new user") (27/08)

### Março/2026

- [x] Integração com Supabase: clientes, env com fallback da integração Vercel, middleware de sessão (21/03)
- [x] Migrations `001`–`008` (schema + RLS) e script de seed a partir de `data/*.ts` (21/03)
- [x] Páginas públicas lendo do Supabase com ISR (`revalidate = 60`) (21/03)
- [x] Login, `AuthProvider`/`useAuth`, painel admin (dashboard, lista, detalhe e criação de editores) (21/03)
- [x] Seções editáveis e indicadores de edição para admin e editor (só UI) (21/03)
- [x] Grupos, movimentos e pastorais na página da igreja (19/03)
- [x] Horários por dia em acordeão (19/03)
- [x] Página `/clero` com busca, filtro alfabético e modal de detalhes (18/03)
- [x] Modal de detalhes do clérigo com bio e redes sociais (18/03)
- [x] Agentes de QA e auditoria de dados no Cursor (18/03)

### Fevereiro/2026

- [x] Contato da igreja (telefone, WhatsApp, redes, site) e link para o Google Maps (27/02)
- [x] Clero na página da igreja: ativos, histórico, cargos e títulos (27/02)
- [x] Horários em abas: missas, adoração, confissões e atividades, com validação de hora (26/02)
- [x] Layout da página 404 da igreja com card (27/02)

### Janeiro/2026

- [x] MVP: listagem das 55 igrejas, busca por nome sem acentos, filtro por bairro, página de detalhes e 404 (09/01)
- [x] Paginação com itens por página (09/01)
- [x] Tema claro/escuro (09/01)
- [x] Rodapé (09/01)
- [x] Vercel Analytics, SEO básico (metadata, Open Graph, Twitter Cards) (09/01)
