# Code Review

Revise as alterações de código no projeto Via Fidei.

## Passos

1. Execute `git diff` para identificar arquivos alterados
2. Analise cada arquivo contra os padrões do projeto
3. Apresente o feedback organizado por severidade

## Checklist

- Componentes em `features/` com barrel exports atualizados
- Server Components por padrão; `"use client"` apenas com interatividade
- Named exports, interface de props no topo, sem default exports
- Tipagem forte (sem `any`), tipos de `@/types`
- Imports com `@/` para módulos fora da feature atual
- Tailwind mobile-first, `cn()` para classes condicionais, dark mode (`dark:`)
- `next/image` para imagens, `next/link` para links internos
- Links externos com `target="_blank"` e `rel="noopener noreferrer"`
- Sem `console.log` ou `debugger` restante
- Empty states tratados
- Acessibilidade: alt em imagens, HTML semântico

## Formato de Saída

Para cada problema:
- **CRITICO**: deve corrigir antes do merge
- **SUGESTAO**: melhoria recomendada
- **OPCIONAL**: refinamento estético

Inclua arquivo, linha, problema e código corrigido para cada item.
Finalize com um resumo geral: total por severidade e veredicto.
