# Board de demandas — Via Fidei

Controle das demandas do projeto: o que está em andamento, o que falta fazer, as decisões tomadas e o que já foi entregue.

**Atualizado em:** 31/10/2026 (Fase 1 concluída; Fase 2 iniciada)

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

**Fase 2 — médios, leva 1** (31/10/2026)

- [ ] **VF-082 + VF-013 + VF-083** · Perfil nasce sem permissão, editor desativado não entra e validação nas Server Actions de admin — sessão E, branch `fix/auth-perfil-e-validacao`, migration `015`.
- [ ] **VF-081** · Cabeçalhos de segurança — sessão F, branch `fix/cabecalhos-seguranca`.
- [ ] **VF-100 + VF-101** · Testes de `getChurchBySlug` e do cliente simulado — sessão G, branch `test/get-church-by-slug`.
- [ ] **VF-088** · Integridade no banco (formatos de hora e data, duplicatas no clero) — sessão D, branch `fix/integridade-banco`, migration `016`.

**Próximas fases (planejamento)**

| Fase | Itens | Observação |
|------|-------|------------|
| 2 · médios, leva 2 | VF-093 (auditoria, migration `017`) · VF-090 + VF-092 (ícones, `error.tsx`/`loading.tsx`) · VF-084 + VF-035 (consulta da igreja e tipos gerados, depois do VF-101) | Em paralelo |
| 2 · médios, leva 3 | VF-085, VF-086, VF-091, VF-104 (auth e admin, depois da sessão E) | Em sequência (mesmos arquivos) |
| 2 · com o usuário | VF-010 (cadastro público), VF-087 (CLI e histórico de migrations), VF-089 (backup), VF-098 (Docker para o Supabase local) | |
| 3 · baixos | VF-012, VF-094, VF-096 (banco); VF-031, VF-032, VF-095, VF-097, VF-037, VF-033, VF-034, VF-039 | |
| 4 · funcionalidades | VF-020, VF-022, VF-023, VF-024 → VF-021, VF-027 → VF-025, VF-026 | VF-021 depois de VF-083, VF-088 e VF-093; VF-025/026 dependem do VF-003 |

---

## A fazer

### Triagem — avaliação técnica de 30/10/2026

Prioridade sugerida, da mais urgente para a menos urgente. A decisão final é do usuário.

| Severidade | Itens |
|-----------|-------|
| **Crítico** | _Nenhum._ O VF-080 foi concluído em 30/10. |
| **Alto** | _Nenhum._ VF-011 e VF-030 concluídos em 31/10. |
| **Médio** | VF-081 (cabeçalhos de segurança) · VF-082 (papel padrão `editor`) · VF-083 (validação nas Server Actions) · VF-013 (editor desativado entra) · VF-010 (cadastro público) · VF-084 (5 consultas e render duplicado na página da igreja) · VF-085 (AuthProvider carrega em dobro) · VF-086 (middleware consulta o Auth a cada requisição) · VF-087 (migrations sem histórico) · VF-088 (integridade no banco antes dos formulários) · VF-089 (backup e pausa do plano gratuito) · VF-090 (favicon de 1 MB) · VF-091 (admin acessa o banco direto) · VF-092 (sem `error.tsx`/`loading.tsx`) · VF-093 (auditoria de alterações) · VF-035 (tipos gerados) |
| **Baixo** | VF-012 · VF-094 · VF-095 · VF-096 · VF-097 · VF-031 · VF-032 · VF-037 |

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

### Segurança

- [ ] **VF-081 · Cabeçalhos de segurança** · **médio** — não há CSP, `frame-ancestors`/`X-Frame-Options` (permite clickjacking em `/login` e `/admin`), `Referrer-Policy`, `Permissions-Policy` nem `X-Content-Type-Options`. Configurar em `headers()` no `next.config.ts`; a CSP precisa considerar o script inline de tema (hash ou nonce) e o Vercel Analytics. Origem: `avaliação`.
- [ ] **VF-082 · Papel padrão do perfil é `editor`** · **médio** — `profiles.role` tem default `'editor'` e `is_active` default `true`. Todo usuário criado no Auth, por qualquer caminho, vira editor ativo. Hoje não ganha acesso a nenhuma igreja, mas fere o menor privilégio. Criar o perfil sem permissão (ex.: `is_active = false`) e deixar `createEditor`/`bootstrap-users` ativarem. Relacionado ao VF-010. Origem: `avaliação` · `001_profiles.sql`, `009_profiles_auth_insert_policies.sql`.
- [ ] **VF-083 · Validação de entrada nas Server Actions de admin** · **médio** — não há schema de validação (formato de email, tamanho de nome e senha, UUIDs em `churchIds`/`editorId`). `toggleEditorActive` aceita o ID de um admin, inclusive o próprio, o que permite se trancar fora do painel. `updateEditorChurches` aceita o ID de um admin. Validar com schema (ex.: zod) e restringir o alvo a `role = 'editor'`. Origem: `avaliação` · `features/auth/admin-actions.ts`.
- [ ] **VF-010 · Confirmar que o cadastro público está desativado** · **médio** no Supabase (Authentication → Providers). O app não tem tela de cadastro, e com o VF-082 em aberto qualquer cadastro vira editor ativo. Origem: `doc`.
- [ ] **VF-012 · `search_path` e permissão de execução das funções `is_admin()` e `is_editor_of()`** · **baixo** — são `security definer` sem `set search_path` (o Supabase recomenda fixar) e ficam expostas para `anon` em `/rest/v1/rpc/*` (respondem `false`, conferido em 30/10). Fixar o `search_path` e revogar `execute` de `anon`. Origem: `análise` + `avaliação` · `008_rls_policies.sql`.
- [ ] **VF-013 · Editor desativado ainda consegue entrar** · **médio** — o `login` não checa `is_active`, e o `canEditChurch` do `AuthProvider` também não, então o lápis aparece. A escrita já é barrada pelo RLS. Origem: `análise` · `features/auth/actions.ts`, `features/auth/auth-provider.tsx`.

- [ ] **VF-094 · Usuário altera o próprio `email` e `name` em `profiles`** · **baixo** — a política `profiles_update_own` não restringe colunas. O email mostrado no painel admin pode divergir do email real do Auth. Bloquear `email` no trigger da `010` ou ler o email do Auth. Origem: `avaliação` · `008_rls_policies.sql`.

### Funcional

- [ ] **VF-020 · Botão de sair e indicador de sessão** — a action `logout` existe, mas nenhuma tela a usa. Origem: `doc`.
- [ ] **VF-021 · Formulários e Server Actions de edição na página da igreja** — os botões "Adicionar" e o lápis ainda não fazem nada. Deve respeitar as permissões da D3. Origem: `doc`.
- [ ] **VF-022 · Seções vazias para o visitante** conforme a D4: esconder os cards vazios de Contato, Clero e Ministérios; em Horários, mostrar "Horários ainda não informados". Atualizar o caso CT-007 do QA. Origem: `doc` + `decisão` · `features/churches/editor/editable-section.tsx`.
- [ ] **VF-023 · Trocar `alert()` por mensagem na tela** nos erros de `toggleEditorActive` e `updateEditorChurches`. Origem: `doc`.
- [ ] **VF-024 · Filtro por igreja em `/admin/usuarios`** — o link "Gerenciar editores" envia `?church=<id>`, mas a página ignora o parâmetro e lista todos os editores. Origem: `análise` · `features/churches/editor/admin-church-link.tsx`, `app/admin/usuarios/page.tsx`.
- [ ] **VF-025 · Cargo do clero por período** (D1) — o cargo deixa de ficar em `clergy.role` e passa a ser registrado por período (troca de cargo abre novo período), com no máximo um vínculo ativo por clérigo (índice único parcial). Precisa suportar cargo **sem paróquia** (ex.: reitor de seminário). Ajustar queries e tipos. Depende das perguntas em aberto do VF-003. Origem: `decisão`.
- [ ] **VF-026 · Fonte única para "clérigo ativo"** — o banco tem `church_clergy.is_active`, mas a página da igreja decide ativo e histórico pela presença de `endDate`. Resolver junto com o VF-025. Substitui a ideia antiga de um campo `clergyHistory` separado; o destino da seção de clérigos anteriores depende do VF-003. Origem: `análise` + `doc` · `lib/utils/clergy.ts`, `lib/supabase/queries/churches.ts`.
- [ ] **VF-093 · Auditoria de alterações** · **médio** — quando os editores começarem a gravar (VF-021), não haverá registro de quem alterou o quê. Só `churches`, `clergy` e `profiles` têm `updated_at`; nenhuma tabela tem `updated_by`. Implementar junto ou antes do VF-021 (colunas `updated_by`/`updated_at` ou tabela de log via trigger). Origem: `avaliação`.
- [ ] **VF-027 · Telas de cadastro administrativo** de igrejas, clérigos e ministérios. Hoje os dados entram por seed, SQL ou Table Editor. Origem: `doc`.

- [ ] **VF-104 · Permissão por tipo de dado na UI da igreja** · **baixo** — `canEditChurch` (`features/auth/auth-provider.tsx`) vale para a igreja inteira, então o editor vinculado vê o lápis no nome da igreja e o lápis/"Adicionar clérigo" na seção Clero, que são só do admin (D3). Pela D15, o editor vê o Clero como o visitante. O banco já recusa a gravação (`014`). Fazer antes do VF-021. Origem: `revisão` (R1-4 em VF-011).

### Qualidade e confiabilidade

- [ ] **VF-084 · Página da igreja: 5 consultas e render duplicado** · **médio** — `getChurchBySlug` faz 1 consulta e depois mais 4 em paralelo (2 idas ao banco), e é chamada por `generateMetadata` e pela página sem `cache()` do React, que garantiria uma única execução por requisição. Consolidar em uma consulta aninhada do PostgREST (`churches?select=*,schedule_events(*),activities(*,activity_schedules(*)),church_clergy(*,clergy(*)),church_ministries(ministries(*))`) e envolver com `cache()`. Origem: `avaliação` · `lib/supabase/queries/churches.ts`, `app/igreja/[slug]/page.tsx`.
- [ ] **VF-085 · `AuthProvider` carrega o usuário em dobro** · **médio**:
  - na montagem, `loadUser()` roda direto e de novo no evento `INITIAL_SESSION` do `onAuthStateChange` (perfil e vínculos buscados duas vezes, com corrida de estado), e repete a cada `TOKEN_REFRESHED`;
  - não há tratamento de erro;
  - o provider fica no layout raiz, então o cliente `supabase-js` vai no bundle de todos os visitantes, mesmo anônimos.

  Reagir só a `SIGNED_IN`/`SIGNED_OUT`/`USER_UPDATED` e avaliar carregar o provider só quando há sessão. Origem: `avaliação` · `features/auth/auth-provider.tsx`.
- [ ] **VF-086 · Middleware consulta o Supabase Auth a cada requisição** · **médio** — para quem está logado, `auth.getUser()` faz uma chamada de rede ao Auth em toda navegação, inclusive no prefetch de links. Para visitantes anônimos não há chamada (sem sessão). Avaliar `auth.getClaims()`, disponível na versão instalada, que valida o JWT localmente quando o projeto usa chaves de assinatura assimétricas, e restringir o `matcher` às rotas que dependem de sessão. Origem: `avaliação` · `lib/supabase/middleware.ts`, `middleware.ts`.
- [ ] **VF-087 · Migrations sem histórico no projeto remoto** · **médio** — as migrations são aplicadas manualmente no SQL Editor, e o histórico remoto só tem a `010`, o que abre espaço para divergência entre o repositório e o banco. Adotar o CLI do Supabase (`supabase link`, `supabase migration repair` para 001–013, `supabase db push`) e validar as migrations do zero no Supabase local (D10). As migrations de dados (`011`–`013`) localizam linhas pelo nome do clérigo; preferir chaves estáveis. Origem: `avaliação` · `supabase/migrations/`.
- [ ] **VF-088 · Integridade no banco antes dos formulários de edição** · **médio** — hoje a validação existe só na UI:
  - faltam `CHECK` de formato `HH:MM` em `time`/`end_time` (`schedule_events`, `activity_schedules`) e de formato de data (`YYYY` ou `YYYY-MM-DD`) no clero;
  - `unique (church_id, clergy_id, start_date)` em `church_clergy` não impede duplicatas quando `start_date` é nulo (nulos são distintos no Postgres).

  Os dados atuais estão limpos (conferido em 30/10: nenhum horário inválido, nenhum clérigo com dois vínculos ativos). Fazer antes do VF-021 e junto com o VF-025. Origem: `avaliação`.
- [ ] **VF-089 · Backup e pausa do plano gratuito** · **médio** — confirmar a política de backup do plano atual do Supabase e agendar um dump periódico (`supabase db dump`) guardado fora do Supabase. No plano gratuito o projeto pausa por inatividade e o site fica sem dados (ver VF-030). Origem: `avaliação`.
- [ ] **VF-090 · Favicon e ícone Apple com 1 MB** · **médio** — `app/layout.tsx` usa `via-fidei-logo.png` (1.081.277 bytes, servido sem otimização) como `icon` e `apple`, baixado por todo visitante na primeira visita. Também é o fallback das imagens. Gerar ícones dedicados (`app/icon.png` 32 px, `app/apple-icon.png` 180 px) e uma versão leve do logo. Origem: `avaliação` · `app/layout.tsx`, `public/images/via-fidei-logo.png`.
- [ ] **VF-091 · Admin acessa o banco direto nas páginas** · **médio** — `app/admin/*` monta consultas Supabase dentro das páginas, e `/admin/usuarios/novo` busca as igrejas no cliente pelo cliente do browser, o que contraria a regra de camadas do `dev-workflow.md`. Mover para `lib/supabase/queries/admin.ts` e Server Components, e mover `features/auth/admin-actions.ts` para `features/admin/`. As páginas do admin também ignoram o `error` do Supabase: o dashboard mostra contagem 0, a lista de editores vem vazia e o detalhe do editor cai em `notFound()`; aplicar a regra "erro lança, ausência é `null`" do VF-030. Origem: `avaliação` + `análise` (sessão do VF-030).
- [ ] **VF-092 · Sem `error.tsx`, `global-error.tsx` e `loading.tsx`** · **médio** — um erro do Supabase cai na página genérica do Next, e não há estado de carregamento nas rotas dinâmicas e do admin. Origem: `avaliação` · `app/`.
- [ ] **VF-095 · Cliente público e limites de consulta** · **baixo** — `createPublicClient()` não desliga `persistSession`/`autoRefreshToken` e é recriado a cada chamada. As consultas de listagem não têm `.limit`/paginação, e o PostgREST corta em 1000 linhas por padrão, o que passa a importar na expansão para a Arquidiocese (VF-073). Origem: `avaliação` · `lib/supabase/public.ts`, `lib/supabase/queries/`.
- [ ] **VF-096 · Desempenho do RLS e índices redundantes** · **baixo** — envolver `auth.uid()`, `is_admin()` e `is_editor_of()` em `(select …)` nas políticas, como o Supabase recomenda, para avaliar uma vez por consulta e não por linha. Remover os índices redundantes:
  - `churches_slug_idx` duplica o índice do `unique`;
  - `editor_churches_editor_id_idx` duplica o prefixo da chave primária;
  - `church_clergy_is_active_idx` é booleano, de baixa seletividade.

  Impacto pequeno com o volume atual. Origem: `avaliação` · `008_rls_policies.sql`, `002`, `005`, `007`.
- [ ] **VF-097 · Código sem uso** · **baixo** — `getAllClergyWithChurch` e `getClergyForChurch` em `lib/utils/clergy.ts` não são usados (o primeiro tem o mesmo nome da query de `lib/supabase/queries/clergy.ts`), e `getSession` em `features/auth/actions.ts` é exportada sem uso. A prop `onAdd` de `EditableSection` nunca é passada. Origem: `avaliação`.
- [ ] **VF-031 · Imagem padrão de compartilhamento inexistente** · **baixo** — o Open Graph usa `/images/placeholder.svg`, que não existe em `public/images`. Origem: `análise` · `app/igreja/[slug]/page.tsx`.
- [ ] **VF-032 · Avisos do Next no console** · **baixo** — `metadataBase` não definido; logo detectada como LCP sem `priority`. Origem: `doc`.
- [ ] **VF-033 · Sitemap e robots** — o README promete "Sitemap automático", mas não existem `app/sitemap.ts` nem `app/robots.ts`. Origem: `análise`.
- [ ] **VF-034 · Extrair o bloco de logo e marca** compartilhado entre `PageHeader` e `AdminHeader`. Origem: `doc`.
- [ ] **VF-035 · Tipos gerados do banco** (`supabase gen types`) · **médio** — o cliente Supabase não é tipado, então `data` chega como `any`; hoje as linhas são descritas por interfaces `Db*` escritas à mão, e o mapeamento de igreja está duplicado em `getChurches` e `getChurchBySlug`. Origem: `análise` · `lib/supabase/queries/`.
- [ ] **VF-037 · Seed idempotente** · **baixo** — `npm run seed` usa `insert`; rodar duas vezes gera erros de slug duplicado e dados parciais. Origem: `análise` · `scripts/seed.ts`.
- [ ] **VF-038 · Avaliar tipos de coluna para datas e horários** — `time`, `end_time` e as datas do clero são `text`. Hoje é intencional para aceitar só o ano. Reavaliar se surgir necessidade de ordenar ou filtrar por data. Origem: `análise`.
- [ ] **VF-039 · Migrar `next lint` para o ESLint CLI** — `next lint` está obsoleto e foi removido no Next 16. Hoje ele só verifica as pastas padrão (`app`, `components`, `lib`, `pages`, `src`): `features/` e `tests/` ficam de fora. Origem: `análise`.
- [ ] **VF-040 · Atualizar dependências** — o Next já está na 15.5.28 (VF-080). Aqui fica o restante: `@supabase/supabase-js` 2.99 → 2.118, `@supabase/ssr` 0.9 → 0.12 e Radix; avaliar Next 16 e `lucide-react` 1.x à parte. Ao subir o Next, tratar o override `overrides.next.postcss`: rodar `npm explain postcss`, remover o override se o Next novo já depender de `postcss >= 8.5.23` e removê-lo antes da atualização se ela fixar outra major do postcss (ver "Override do `postcss` no Next" no `ARCHITECTURE.md`). Origem: `análise` + `revisão` (R1-1 em VF-080).

- [ ] **VF-098 · Testes de integração e e2e com Supabase local** (D10) · **médio** — Docker + `supabase start`; aplicar as migrations do zero (valida também o VF-087); seed mínimo de teste separado do `npm run seed`; `.env.test`; projeto Vitest `db` (`test:db`). Cobrir RLS (incluindo a `014`), o trigger da `010`, as Server Actions de admin e e2e logado (CT-011 a CT-013). No CI, job com `supabase/setup-cli`. Os roteiros de `supabase/tests/` precisam virar pgTAP ou mudar de pasta, porque o `supabase test db` espera pgTAP. Origem: `análise` (sessão do VF-036) + `revisão` (VF-011).
- [ ] **VF-099 · `formatInstagramHandle` devolve `@https` para URL** · **baixo** — com `https://instagram.com/paroquia` a regex sem âncora devolve `@https`; o CT-003 espera `@paroquia`. Os dados atuais usam `@handle`, então não aparece no site. Ao corrigir, trocar o `it.fails` de `lib/utils/contact.test.ts` por `it`. Origem: `análise` (achado pelos testes do VF-036) · `lib/utils/contact.ts`.
- [ ] **VF-100 · Cliente Supabase simulado não registra filtros** · **baixo** — `tests/fixtures/supabase.ts` aceita qualquer cadeia de chamadas sem guardar `{ table, method, args }`, então não dá para verificar `eq("slug")`/`eq("church_id")`. Fazer antes do VF-101. Origem: `revisão` (R1-4 em VF-036).
- [ ] **VF-101 · Testes de `getChurchBySlug` e `findQueryError`** · **médio** — separação de `schedule_events` por categoria, agrupamento de ministérios, `churchId` no clero, `null` para igreja inexistente, erro lançado na consulta principal e nas 4 paralelas; casos de `findQueryError` (lista vazia, primeiro erro, erro no último). Depois do merge de #24 e #26. Origem: `revisão` (VF-030 e VF-036).
- [ ] **VF-102 · Busca e filtro de bairro da home sem rótulo acessível** · **baixo** — o campo "Buscar igreja..." e o select de bairro não têm `label`/`aria-label`. Origem: `análise` (testes do VF-036) · `features/churches/`.
- [ ] **VF-103 · `useChurchFilters` altera a prop `churches`** · **baixo** — sem filtro, ordena com `.sort()` o array recebido; trocar por `[...result].sort(...)`. Origem: `análise` (testes do VF-036).

### Dados e conteúdo

- [ ] **VF-050 · Conferir dados de exemplo no seed** — contato de São Paulo Apóstolo com `+5582999999999`; WhatsApp `+5582999888777` do Diác. Inácio Filho e Facebook `pe.manoeljose` com cara de valor fictício. Origem: `doc` + `análise` · `data/churches.ts`, `data/clergy.ts`.
- [ ] **VF-051 · Ampliar o cadastro do clero** — só a Paróquia São Paulo Apóstolo tem clérigos cadastrados. Origem: `doc`.
- [ ] **VF-053 · Poucos horários cadastrados** — em 30/10 o banco tinha 11 horários (`schedule_events`) e 2 atividades para as 55 igrejas. Horário é a informação principal da página (D4). Origem: `avaliação`.
- [ ] **VF-052 · Conferir os textos do rodapé** — "Arquediocese" (grafia) e "Dom. Carlos Alberto Breis - OFM" × "Dom Beto Breis" na bio do Pe. José Elielton. Origem: `análise` · `components/footer.tsx`.

### Ambiente e ferramentas

- [ ] **VF-060 · Node local na versão 24** — a máquina local roda Node 22; `engines` e `.nvmrc` pedem 24.x. Origem: `análise`.
- [ ] **VF-061 · `package-lock.json` solto na pasta home** (`~/package-lock.json`) — faz o Next inferir a raiz errada do workspace (aviso no lint e no build). Origem: `análise`.
- [ ] **VF-064 · Portar comandos e agentes do Cursor para o Claude Code** — `reviewer`, `qa-tester` e `verifier` já viraram os agentes `reviewer` e `tester` (VF-004). Faltam `.cursor/commands` (commit, create-pr, qa, add-church, build-check…), o agente `data-auditor` e as `.cursor/skills`. Origem: `análise`.

---

## Ideias futuras

- [ ] **VF-070 · Sugestão de correção/contribuição** — botão discreto na página da igreja e no modal do clérigo ("Algum dado errado ou deseja contribuir com outras informações?"). Modal com referência automática, assunto, descrição e email. Primeira versão sem backend: `console.log` + toast. Origem: `doc`.
- [ ] **VF-071 · Sugestão de cadastro** — "Não encontrou a igreja que queria?" abaixo do filtro da home, e "Não encontrou o padre que queria?" em `/clero`. Modal com os campos da entidade; mínimos obrigatórios: nome e bairro (igreja), nome e função (clérigo). Primeira versão sem backend. Origem: `doc`.
- [ ] **VF-072 · Imagens em storage na nuvem (V2)** — sair de `public/images` para Supabase Storage, Vercel Blob ou Cloudinary. Necessário para upload pelos editores. Origem: `doc`.
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

---

## Concluído

### Outubro/2026

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
