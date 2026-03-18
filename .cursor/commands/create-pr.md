# Criar Pull Request

Crie um pull request com descrição detalhada usando GitHub CLI.

## Passos

1. Execute `git status` para ver alterações pendentes
2. Execute `git diff main...HEAD` para ver todos os commits da branch
3. Execute `git log --oneline main..HEAD` para listar commits
4. Analise todas as mudanças (não apenas o último commit)
5. Gere título e descrição
6. Execute `git push -u origin HEAD`
7. Crie o PR com `gh pr create`

## Formato do Título

```
<tipo>(<escopo>): <descrição curta>
```

Tipos: `feat`, `fix`, `refactor`, `style`, `docs`, `chore`

## Formato do Body

```markdown
## Resumo
- Bullet points descrevendo as mudanças principais

## Detalhes
Explicação mais detalhada quando necessário.

## Checklist
- [ ] Build passa sem erros (`npm run build`)
- [ ] Lint passa sem erros (`npm run lint`)
- [ ] Testado em desktop e mobile
- [ ] Dark mode verificado
- [ ] Empty states tratados
```

## Regras

- Título e corpo em português brasileiro
- Incluir TODAS as mudanças da branch (não apenas o último commit)
- Referenciar issues quando aplicável (ex: "Closes #123")
- Não fazer push para main/master diretamente
