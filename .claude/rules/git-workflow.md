# Fluxo de Git, commits e PRs

## Branches

- Fluxo: `feat/*`, `fix/*`, `chore/*`, `docs/*`, `refactor/*` → PR para **`develop`** → PR de `develop` para **`main`** (release).
- Criar a branch a partir de `origin/develop` atualizada. A `develop` local pode estar desatualizada: rodar `git fetch` antes.
- Nome em kebab-case, em português ou inglês, descrevendo a entrega (ex.: `feat/clero-sao-paulo-apostolo`, `feat/create-users`).
- Nunca fazer commit ou push direto em `main` ou `develop`.

## Commits

- Só commitar quando o usuário pedir.
- Formato Conventional Commits: `<tipo>(<escopo>): <descrição>`
- Descrição em **português brasileiro**, primeira letra minúscula, sem ponto final, até 72 caracteres na primeira linha.
- Corpo opcional, explicando o **porquê** (não o quê).
- Commits atômicos: um assunto por commit.
- Nunca commitar segredos (`.env*`, chaves do Supabase).

| Tipo | Uso |
|------|-----|
| `feat` | Nova funcionalidade |
| `fix` | Correção de bug |
| `refactor` | Refatoração sem mudança de comportamento |
| `style` | Mudanças visuais/CSS sem lógica |
| `docs` | Documentação |
| `chore` | Manutenção (deps, configs, ferramentas) |
| `test` | Testes |

Escopos em uso: `churches`, `clergy`, `schedule`, `contact`, `ministries`, `auth`, `admin`, `supabase`, `data`, `seo`, `theme`, `ui`, `types`, `deps`, `claude`.

Exemplos:

```
feat(clergy): adicionar modal com detalhes do clérigo
fix(auth): impedir que editor altere o próprio papel
chore(claude): configurar documentação e regras para o Claude Code
```

## Pull Requests

- Título no mesmo formato do commit; título e corpo em português.
- Considerar **todos** os commits da branch (`git log origin/develop..HEAD`), não só o último.
- Corpo:

```markdown
## Resumo
- Mudanças principais

## Detalhes
Explicação quando necessário.

## Checklist
- [ ] Build passa sem erros (`npm run build`)
- [ ] Lint passa sem erros (`npm run lint`)
- [ ] Testado em desktop e mobile
- [ ] Dark mode verificado
- [ ] Empty states tratados
```

- `gh` (GitHub CLI) não está instalado na máquina local; se precisar abrir PR, avisar o usuário.

## Board

- Ao concluir uma tarefa do [`docs/board.md`](../../docs/board.md), mover o item para **Concluído** no mesmo PR, com a data.
- Problemas encontrados durante o trabalho que não serão resolvidos agora entram no board, em vez de ficarem só na conversa.
