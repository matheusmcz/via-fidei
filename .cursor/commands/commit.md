# Git Commit

Analise as mudanças staged e crie um commit com mensagem adequada.

## Passos

1. Execute `git diff --staged` para ver as alterações
2. Execute `git log --oneline -5` para ver o estilo dos commits recentes
3. Determine o tipo e escopo da mudança
4. Crie a mensagem de commit e execute o commit

## Formato

```
<tipo>(<escopo>): <descrição>
```

## Tipos

| Tipo | Uso |
|------|-----|
| `feat` | Nova funcionalidade |
| `fix` | Correção de bug |
| `refactor` | Refatoração sem mudança de comportamento |
| `style` | Mudanças visuais/CSS |
| `docs` | Documentação |
| `chore` | Manutenção (deps, configs) |

## Escopos

`churches`, `clergy`, `schedule`, `contact`, `ui`, `data`, `seo`, `theme`

## Regras

- Descrição em português brasileiro, primeira letra minúscula, sem ponto final
- Máximo 72 caracteres na primeira linha
- Corpo opcional para explicar o "porquê"
- Não commitar arquivos com segredos (.env, credentials)
