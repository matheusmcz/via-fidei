# Novo Componente

Crie um novo componente React seguindo os padrões do projeto Via Fidei.

## Informações Necessárias

Pergunte ao usuário (se não fornecidas):
1. Nome do componente
2. Em qual feature ele pertence (ex: `churches`, `clergy`, `schedule`)
3. Se é interativo (precisa de `"use client"`)

## Estrutura do Arquivo

```tsx
"use client"; // apenas se interativo

import { cn } from "@/lib/utils";
// outros imports...

interface NomeComponenteProps {
  // props tipadas
}

export function NomeComponente({ ...props }: NomeComponenteProps) {
  return (
    // JSX com Tailwind mobile-first
  );
}
```

## Regras Obrigatórias

- Named export (não default)
- Interface de props no topo
- Arquivo em kebab-case (ex: `clergy-card.tsx`)
- Componente em PascalCase (ex: `ClergyCard`)
- `cn()` para classes condicionais
- Tailwind mobile-first
- Tratar empty states quando aplicável
- Colocar em `features/churches/<sub-feature>/`
- Atualizar barrel exports: `<sub-feature>/index.ts` e `features/churches/index.ts`

## Checklist Final

- [ ] Arquivo criado no diretório correto
- [ ] Named export com interface de props
- [ ] Barrel exports atualizados
- [ ] `"use client"` apenas se necessário
- [ ] Acessibilidade básica (alt, semântica HTML)
