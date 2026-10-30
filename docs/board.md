# Board de demandas — Via Fidei

Controle das demandas do projeto: o que está em andamento, o que falta fazer, as decisões tomadas e o que já foi entregue.

**Atualizado em:** 30/10/2026

## Como usar

- Cada item tem um ID (`VF-NNN`) para ser citado em conversas, branches e PRs.
- **Origem** indica de onde o item veio:
  - `doc`: já estava listado na documentação (ARCHITECTURE, QA) até 23/10/2026.
  - `análise`: identificado na análise do código feita com o Claude em 29/10/2026.
  - `decisão`: consequência de uma decisão registrada na seção **Decisões**.
- Ao concluir um item, marcar `[x]`, mover para **Concluído** com a data e citar o PR.
- A ordem dentro de cada seção **não** é prioridade. A priorização será definida depois.

---

## Em andamento

- [ ] **VF-002 · Preparar o projeto para o Claude Code** — branch `chore/claude-setup`.
  - `.claude/CLAUDE.md`, regras em `.claude/rules/`, docs movidos para `.claude/docs/` e este board.

---

## A fazer

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

- [ ] **VF-010 · Confirmar que o cadastro público está desativado** no Supabase (Authentication → Providers). O app não tem tela de cadastro. Origem: `doc`.
- [ ] **VF-011 · Ajustar o RLS às permissões do editor** (D3). Hoje `churches_update_editor` libera qualquer coluna de `churches` (inclusive `slug` e `name`), e as políticas `church_clergy_*_editor` deixam o editor mexer nos vínculos do clero. Pela decisão, identidade da igreja e clero ficam só com o admin. Origem: `decisão` · `supabase/migrations/008_rls_policies.sql`.
- [ ] **VF-012 · `search_path` nas funções `is_admin()` e `is_editor_of()`** — são `security definer` sem `set search_path`. O Supabase recomenda fixar. Origem: `análise` · `008_rls_policies.sql`.
- [ ] **VF-013 · Editor desativado ainda consegue entrar** — o `login` não checa `is_active`, e o `canEditChurch` do `AuthProvider` também não, então o lápis aparece. A escrita já é barrada pelo RLS. Origem: `análise` · `features/auth/actions.ts`, `features/auth/auth-provider.tsx`.

### Funcional

- [ ] **VF-020 · Botão de sair e indicador de sessão** — a action `logout` existe, mas nenhuma tela a usa. Origem: `doc`.
- [ ] **VF-021 · Formulários e Server Actions de edição na página da igreja** — os botões "Adicionar" e o lápis ainda não fazem nada. Deve respeitar as permissões da D3. Origem: `doc`.
- [ ] **VF-022 · Seções vazias para o visitante** conforme a D4: esconder os cards vazios de Contato, Clero e Ministérios; em Horários, mostrar "Horários ainda não informados". Atualizar o caso CT-007 do QA. Origem: `doc` + `decisão` · `features/churches/editor/editable-section.tsx`.
- [ ] **VF-023 · Trocar `alert()` por mensagem na tela** nos erros de `toggleEditorActive` e `updateEditorChurches`. Origem: `doc`.
- [ ] **VF-024 · Filtro por igreja em `/admin/usuarios`** — o link "Gerenciar editores" envia `?church=<id>`, mas a página ignora o parâmetro e lista todos os editores. Origem: `análise` · `features/churches/editor/admin-church-link.tsx`, `app/admin/usuarios/page.tsx`.
- [ ] **VF-025 · Cargo do clero por período** (D1) — o cargo deixa de ficar em `clergy.role` e passa a ser registrado por período (troca de cargo abre novo período), com no máximo um vínculo ativo por clérigo (índice único parcial). Precisa suportar cargo **sem paróquia** (ex.: reitor de seminário). Ajustar queries e tipos. Depende das perguntas em aberto do VF-003. Origem: `decisão`.
- [ ] **VF-026 · Fonte única para "clérigo ativo"** — o banco tem `church_clergy.is_active`, mas a página da igreja decide ativo e histórico pela presença de `endDate`. Resolver junto com o VF-025. Substitui a ideia antiga de um campo `clergyHistory` separado; o destino da seção de clérigos anteriores depende do VF-003. Origem: `análise` + `doc` · `lib/utils/clergy.ts`, `lib/supabase/queries/churches.ts`.
- [ ] **VF-027 · Telas de cadastro administrativo** de igrejas, clérigos e ministérios. Hoje os dados entram por seed, SQL ou Table Editor. Origem: `doc`.

### Qualidade e confiabilidade

- [ ] **VF-030 · Página da igreja dá 404 quando o Supabase falha** — `getChurchBySlug` retorna `null` em qualquer erro, inclusive com o projeto pausado ou fora do ar. Os erros das 4 consultas paralelas (horários, atividades, clero, ministérios) são ignorados e as seções somem sem aviso. Origem: `análise` · `lib/supabase/queries/churches.ts`.
- [ ] **VF-031 · Imagem padrão de compartilhamento inexistente** — o Open Graph usa `/images/placeholder.svg`, que não existe em `public/images`. Origem: `análise` · `app/igreja/[slug]/page.tsx`.
- [ ] **VF-032 · Avisos do Next no console** — `metadataBase` não definido; logo detectada como LCP sem `priority`. Origem: `doc`.
- [ ] **VF-033 · Sitemap e robots** — o README promete "Sitemap automático", mas não existem `app/sitemap.ts` nem `app/robots.ts`. Origem: `análise`.
- [ ] **VF-034 · Extrair o bloco de logo e marca** compartilhado entre `PageHeader` e `AdminHeader`. Origem: `doc`.
- [ ] **VF-035 · Tipos gerados do banco** (`supabase gen types`) — hoje as linhas são descritas por interfaces `Db*` escritas à mão, e o mapeamento de igreja está duplicado em `getChurches` e `getChurchBySlug`. Origem: `análise` · `lib/supabase/queries/`.
- [ ] **VF-036 · Testes automatizados e CI** — não há testes nem workflow. Sugestão inicial: testes unitários de `lib/utils` (horários, clero, contato) e um GitHub Actions com `lint` + `tsc` + `build`. Origem: `análise`.
- [ ] **VF-037 · Seed idempotente** — `npm run seed` usa `insert`; rodar duas vezes gera erros de slug duplicado e dados parciais. Origem: `análise` · `scripts/seed.ts`.
- [ ] **VF-038 · Avaliar tipos de coluna para datas e horários** — `time`, `end_time` e as datas do clero são `text`. Hoje é intencional para aceitar só o ano. Reavaliar se surgir necessidade de ordenar ou filtrar por data. Origem: `análise`.
- [ ] **VF-039 · Migrar `next lint` para o ESLint CLI** — `next lint` está obsoleto e foi removido no Next 16. Origem: `análise`.
- [ ] **VF-040 · Atualizar dependências** — Next 15.5.9 → 15.5.x mais recente (correções de patch), `@supabase/supabase-js`, `@supabase/ssr` e Radix; avaliar Next 16 e `lucide-react` 1.x à parte. Origem: `análise`.

### Dados e conteúdo

- [ ] **VF-050 · Conferir dados de exemplo no seed** — contato de São Paulo Apóstolo com `+5582999999999`; WhatsApp `+5582999888777` do Diác. Inácio Filho e Facebook `pe.manoeljose` com cara de valor fictício. Origem: `doc` + `análise` · `data/churches.ts`, `data/clergy.ts`.
- [ ] **VF-051 · Ampliar o cadastro do clero** — só a Paróquia São Paulo Apóstolo tem clérigos cadastrados. Origem: `doc`.
- [ ] **VF-052 · Conferir os textos do rodapé** — "Arquediocese" (grafia) e "Dom. Carlos Alberto Breis - OFM" × "Dom Beto Breis" na bio do Pe. José Elielton. Origem: `análise` · `components/footer.tsx`.

### Ambiente e ferramentas

- [ ] **VF-060 · Node local na versão 24** — a máquina local roda Node 22; `engines` e `.nvmrc` pedem 24.x. Origem: `análise`.
- [ ] **VF-061 · `package-lock.json` solto na pasta home** (`~/package-lock.json`) — faz o Next inferir a raiz errada do workspace (aviso no lint e no build). Origem: `análise`.
- [ ] **VF-062 · Destino do `.github/copilot-instructions.md`** — desatualizado (ainda fala em dados estáticos e escopo só de MVP) e fora do Git, porque `.github` está no `.gitignore`. Decidir: remover, atualizar ou deixar. Atenção: esse `.gitignore` também bloqueia futuros workflows de CI (VF-036). Origem: `análise`.
- [ ] **VF-064 · Portar comandos e agentes do Cursor para o Claude Code** — `.cursor/commands` (commit, create-pr, qa, add-church, build-check…), `.cursor/agents` (data-auditor, qa-tester, reviewer, verifier) e `.cursor/skills` como skills e agents em `.claude/`. Origem: `análise`.

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
| D3 | 29/10/2026 | Permissões do editor: edita contato, horários, atividades e grupos/movimentos/pastorais das igrejas vinculadas. Identidade da igreja (nome, slug, endereço, bairro, tipo) e clero (cadastro e vínculos) são só do admin. |
| D4 | 29/10/2026 | Seção vazia para o visitante: Contato, Clero e Ministérios vazios ficam ocultos; Horários vazio mostra "Horários ainda não informados". |
| D5 | 29/10/2026 | Abrangência: por ora só Maceió; o objetivo é toda a Arquidiocese de Maceió. |
| D6 | 29/10/2026 | Fluxo de trabalho mantido: Conventional Commits em português, branch por entrega, PR para `develop` e de `develop` para `main`. |
| D7 | 23/10/2026 | A `bio` do clérigo descreve a pessoa; vínculos com igrejas ficam em `church_clergy`, não na bio. |

---

## Concluído

### Outubro/2026

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
