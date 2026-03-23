# Plano de commits — integração Supabase

Branch sugerida: `feat/supabase-integracao`

**Estado:** os arquivos foram adicionados ao stage (`git add -A`). **Nenhum commit foi criado.**

Para aplicar commits **atômicos** na ordem abaixo:

```bash
git reset HEAD   # desfaz o stage atual
```

Depois, para cada bloco: `git add …` conforme indicado e `git commit -m "…"` (primeira linha = título; corpo opcional com `git commit -m "título" -m "corpo"`).

---

## 1. Dependências e componentes base

**Arquivos:** `package.json`, `package-lock.json`, `components/ui/button.tsx`, `components/ui/label.tsx`

```bash
git add package.json package-lock.json components/ui/button.tsx components/ui/label.tsx
```

**Mensagem:**

```
chore(deps): adicionar Supabase, dotenv, tsx e componentes shadcn

Inclui @supabase/supabase-js, @supabase/ssr, dotenv e tsx para seed.
Componentes button e label do shadcn para login e admin.
```

---

## 2. Núcleo Supabase e middleware

**Arquivos:** `lib/supabase/`, `middleware.ts`

```bash
git add lib/supabase middleware.ts
```

**Mensagem:**

```
feat(supabase): clientes, env, queries públicas e middleware de sessão

- env.ts (publishable + service role), public.ts para leituras sem cookies
- server.ts e client.ts com @supabase/ssr
- queries de igrejas e clero; middleware na raiz para refresh de sessão
```

---

## 3. Schema SQL e seed

**Arquivos:** `supabase/` (migrations, `config.toml`, `.gitignore` se existirem), `scripts/`, `.env.example`

```bash
git add supabase scripts .env.example
```

**Mensagem:**

```
feat(data): migrations Supabase e script de seed

Migrations 001–008 (profiles, churches, schedules, clergy, ministries, RLS).
scripts/seed.ts e load-env.ts; .env.example alinhado ao quickstart oficial.
```

---

## 4. Páginas e layout consumindo o banco

**Arquivos:** `app/page.tsx`, `app/clero/page.tsx`, `app/igreja/[slug]/page.tsx`, `app/layout.tsx`

```bash
git add app/page.tsx app/clero/page.tsx app/igreja app/layout.tsx
```

**Mensagem:**

```
feat(app): consumir dados via Supabase nas páginas públicas

ISR revalidate, generateStaticParams com getChurchSlugs, AuthProvider no layout.
```

---

## 5. Autenticação e área admin

**Arquivos:** `features/auth/`, `app/login/`, `app/admin/`

```bash
git add features/auth app/login app/admin
```

**Mensagem:**

```
feat(auth): login, provider, actions e painel admin

Login em /login; dashboard e gestão de editores; Server Actions de admin.
```

---

## 6. UX de edição na igreja

**Arquivos:** `features/churches/editor/`, `features/churches/index.ts`

```bash
git add features/churches/editor features/churches/index.ts
```

**Mensagem:**

```
feat(churches): seções editáveis e indicadores para admin/editor

EditableSection, EditIndicator e AdminChurchLink na página de detalhes.
```

---

## 7. Tipos e regras do Cursor

**Arquivos:** `types/church.ts`, `.cursor/rules/`

```bash
git add types/church.ts .cursor/rules
```

**Mensagem:**

```
fix(types): tornar churchId opcional em Clergy

Atualiza regras Cursor (overview, data-management, nextjs) para Supabase.
```

---

## 8. Documentação

**Arquivos:** `ARCHITECTURE.md`, `README.md`, `data/README.md`, `docs/QA.md`, `docs/commit-plan.md`

```bash
git add ARCHITECTURE.md README.md data/README.md docs/QA.md docs/commit-plan.md
```

**Mensagem:**

```
docs: documentar stack Supabase, fluxos e plano de commits

README e ARCHITECTURE alinhados ao estado atual; QA com novas rotas;
commit-plan para histórico do processo de review.
```

---

## Alternativa: um único commit

Se preferir um único commit após `git add -A`:

**Mensagem:**

```
feat(supabase): integrar banco, auth, admin e documentação

Supabase (PostgreSQL, RLS, migrations, seed), login e painel admin,
queries públicas sem cookies, páginas com ISR, UX de edição e docs atualizadas.
```

---

## Resumo dos arquivos alterados (análise)

| Área | Descrição |
|------|-----------|
| **Deps** | Supabase SSR/JS, dotenv, tsx; shadcn button/label |
| **lib/supabase** | env, public, server, client, middleware helper, queries |
| **Raiz** | middleware.ts (sessão) |
| **supabase/** | SQL 001–008 |
| **scripts** | seed + load-env |
| **app** | Home, clero, igreja [slug], layout, login, admin |
| **features** | auth (provider, actions, admin-actions), churches/editor |
| **docs** | ARCHITECTURE, README, data/README, QA, commit-plan |
| **rules** | project-overview, data-management, nextjs-patterns |
| **types** | `churchId?` em Clergy |
