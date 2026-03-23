---
name: commit-message
description: Gera mensagens de commit descritivas em português brasileiro seguindo o padrão do projeto Via Fidei. Use quando o usuário pedir para commitar, criar um commit, ou gerar uma mensagem de commit.
---

# Commit Message — Via Fidei

## Formato

```
<tipo>(<escopo>): <descrição curta>

<corpo opcional>
```

## Tipos

| Tipo | Quando usar |
|------|-------------|
| `feat` | Nova funcionalidade |
| `fix` | Correção de bug |
| `refactor` | Refatoração sem mudança de comportamento |
| `style` | Mudanças visuais/CSS (sem lógica) |
| `docs` | Documentação |
| `chore` | Tarefas de manutenção (deps, configs) |
| `test` | Testes |

## Escopos Comuns

| Escopo | Descrição |
|--------|-----------|
| `churches` | Feature de igrejas |
| `clergy` | Feature de clero |
| `schedule` | Horários e atividades |
| `contact` | Informações de contato |
| `ui` | Componentes de UI compartilhados |
| `data` | Dados estáticos das igrejas |
| `seo` | Metadata e SEO |
| `theme` | Tema claro/escuro |

## Regras

- Descrição em **português brasileiro**
- Primeira letra minúscula na descrição
- Sem ponto final na descrição
- Corpo opcional para explicar o "porquê" (não o "o quê")
- Máximo 72 caracteres na primeira linha

## Workflow

1. Analisar `git diff --staged` para entender as mudanças
2. Identificar tipo e escopo adequados
3. Escrever descrição concisa focando no "porquê"
4. Adicionar corpo se a mudança não for óbvia

## Exemplos

```
feat(clergy): adicionar modal com detalhes do clérigo
```

```
fix(schedule): corrigir agrupamento de horários por dia da semana

Horários de recorrência especial (primeira sexta-feira) não eram
agrupados corretamente com os horários regulares do mesmo dia.
```

```
refactor(churches): extrair lógica de filtro para hook dedicado
```

```
chore(deps): atualizar shadcn/ui e dependências do Radix
```
