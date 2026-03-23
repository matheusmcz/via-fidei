# Lint Fix

Execute o linter e corrija todos os erros encontrados.

## Passos

1. Execute `npm run lint` para identificar problemas
2. Analise cada erro reportado
3. Corrija os erros mantendo a funcionalidade original
4. Re-execute `npm run lint` para confirmar que todos foram resolvidos
5. Execute `npm run build` para garantir que as correções não quebraram nada

## Regras

- Corrigir erros é obrigatório; warnings são aceitáveis
- Não usar `// eslint-disable` a menos que seja absolutamente necessário
- Não usar `any` para resolver erros de tipo — tipar corretamente
- Manter a funcionalidade original ao corrigir
- Se um erro exigir mudança de lógica, explique antes de fazer
