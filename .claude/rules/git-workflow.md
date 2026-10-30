# Fluxo de Git, commits e PRs

## Branches

- Fluxo: `feat/*`, `fix/*`, `chore/*`, `docs/*`, `refactor/*` → PR para **`develop`** → PR de `develop` para **`main`** (release).
- Criar a branch a partir de `origin/develop` atualizada. A `develop` local pode estar desatualizada: rodar `git fetch` antes.
- Nome em kebab-case, em português ou inglês, descrevendo a entrega (ex.: `feat/clero-sao-paulo-apostolo`, `feat/create-users`).
- Nunca fazer commit ou push direto em `main` ou `develop`.

## Commits

- Só commitar quando o usuário pedir. Exceção (D12): no modo orquestrador, a sessão commita sozinha depois do `reviewer` aprovado e do `tester` passando.
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

- Abrir com `gh pr create --base develop` (GitHub CLI autenticado na conta `matheusmcz`). Mostrar título e descrição ao usuário antes de criar (no modo orquestrador, D12, a sessão abre direto e o orquestrador reporta o PR; o merge continua com o usuário).

## Board

- Ao concluir uma tarefa do [`docs/board.md`](../../docs/board.md), mover o item para **Concluído** no mesmo PR, com a data.
- **Exceção — modo orquestrador (D12):** quando várias sessões trabalham em paralelo, elas **não** editam o board. A sessão orquestradora move os itens para Concluído e cria os itens vindos da revisão em um PR `docs/` por leva, para evitar conflitos entre PRs paralelos.
- Problemas encontrados durante o trabalho que não serão resolvidos agora entram no board, em vez de ficarem só na conversa.
