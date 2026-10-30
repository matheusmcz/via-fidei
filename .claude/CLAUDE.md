# Via Fidei

Aplicação web para encontrar igrejas católicas de Maceió/AL: listagem com busca e filtro por bairro, página de cada igreja (contato, clero, horários, grupos/movimentos/pastorais), listagem do clero e área restrita para admin e editores. Projeto pessoal, em produção em https://viafidei.vercel.app.

Abrangência: hoje só **Maceió**; o objetivo é cobrir toda a **Arquidiocese de Maceió**.

## Stack

- Next.js 15 (App Router, Turbopack), React 19, TypeScript strict
- Tailwind CSS 3 + shadcn/ui (new-york), ícones lucide-react
- Supabase: PostgreSQL + Auth + RLS (`@supabase/ssr`, `@supabase/supabase-js`)
- Deploy na Vercel + Vercel Analytics
- Node **24.x** (`.nvmrc`, `engines`)

## Comandos

```bash
npm run dev              # dev server com Turbopack
npm run build            # build de produção (precisa das variáveis do Supabase)
npm run lint             # ESLint (next lint)
npx tsc --noEmit         # checagem de tipos
npm run seed             # popula o banco a partir de data/*.ts (service role)
npm run bootstrap-users  # cria admin + editor de teste (service role)
```

Não há testes automatizados nem CI. Para validar uma mudança: `npx tsc --noEmit`, `npm run lint` e, quando houver UI, rodar o app e conferir desktop, mobile e dark mode seguindo [`.claude/docs/QA.md`](docs/QA.md).

## Documentação

| Arquivo | Conteúdo |
|---------|----------|
| [`.claude/docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Arquitetura, clientes Supabase, env, migrations, controle de acesso, regras de domínio |
| [`.claude/docs/QA.md`](docs/QA.md) | Casos de teste e checklist de regressão |
| [`.claude/docs/SHADCN.md`](docs/SHADCN.md) | Uso do shadcn/ui |
| [`.claude/docs/commit-plan.md`](docs/commit-plan.md) | Registro histórico da integração Supabase (não reaplicar) |
| [`docs/board.md`](../docs/board.md) | **Board de demandas**: em andamento, a fazer, decisões, concluído |
| [`data/README.md`](../data/README.md) | Tabelas, seed e arquivos legados |

Regras por assunto em `.claude/rules/` (git, arquitetura, dados, Next.js, React, estilo, TypeScript).

## Como trabalhar neste projeto

- **Perguntar antes de assumir** regras de produto ou de domínio (quem vê o quê, quais dados exibir, termos católicos). O usuário conhece o produto e prefere explicar. Escolhas técnicas com padrão óbvio podem seguir, dizendo qual foi a escolha.
- Idioma: conversa, textos da UI, documentação, commits e PRs em **português brasileiro**.
- Consultar o [board](../docs/board.md) antes de começar uma tarefa; ao terminar, mover o item para Concluído. Problemas encontrados e não resolvidos entram no board.
- Commits, branches e PRs seguem [`rules/git-workflow.md`](rules/git-workflow.md): branch a partir de `origin/develop`, PR para `develop`, commit só quando o usuário pedir.
- Manter `.claude/docs/ARCHITECTURE.md` atualizado quando a mudança alterar estrutura, schema, permissões ou regras de domínio.

## Armadilhas conhecidas

- **Migrations** são aplicadas manualmente pelo SQL Editor do Supabase; `supabase migration list` não reflete o estado real. Conferir pelo schema.
- **Supabase gratuito pausa** após inatividade: erros `ENOTFOUND`/500 locais geralmente significam projeto pausado (restaurar no Dashboard).
- **Variáveis na Vercel** precisam estar em Production **e** Preview, senão o build de PR falha.
- `data/*.ts` **não** é usado em runtime; mudar só o TS não muda o site.
- A UI de edição (lápis, "Adicionar") existe, mas ainda não tem formulários nem Server Actions.
- O Cursor (`.cursor/`) continua configurado em paralelo; `.github/copilot-instructions.md` está desatualizado e fora do Git (`.github` está no `.gitignore`).
