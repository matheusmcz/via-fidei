---
name: new-feature
description: Guia para criar novas features no projeto Via Fidei seguindo a arquitetura por domínio. Use quando o usuário pedir para adicionar uma nova funcionalidade, seção, ou módulo ao projeto.
---

# Nova Feature — Via Fidei

## Workflow

Copie e acompanhe o progresso:

```
Progresso:
- [ ] 1. Definir tipos
- [ ] 2. Criar utilitários
- [ ] 3. Criar componentes
- [ ] 4. Configurar barrel exports
- [ ] 5. Integrar na página
- [ ] 6. Atualizar dados
```

## Passo 1: Definir Tipos

Adicionar novos tipos em `types/church.ts` e re-exportar via `types/index.ts`.

```typescript
// types/church.ts
export type NewFeatureRole = "option-a" | "option-b";

export interface NewFeature {
  id: string;
  name: string;
  role: NewFeatureRole;
}
```

## Passo 2: Criar Utilitários

Criar `lib/utils/<feature>.ts` com funções de domínio. Exportar via `lib/utils/index.ts`.

Padrões a seguir:
- Funções puras e tipadas
- Nome descritivo: `formatX()`, `getXLabel()`, `sortXBy()`
- Referência: ver `lib/utils/clergy.ts` como exemplo

## Passo 3: Criar Componentes

Criar pasta `features/churches/<feature>/` com:

| Arquivo | Responsabilidade |
|---------|-----------------|
| `<feature>-card.tsx` | Card individual |
| `<feature>-list.tsx` | Lista/grid de cards |
| `index.ts` | Barrel exports da sub-feature |

Padrões obrigatórios:
- Named exports
- Interface de props no topo
- `cn()` para classes condicionais
- Componentes shadcn/ui de `@/components/ui/`
- Mobile-first com Tailwind
- Tratar empty states

## Passo 4: Barrel Exports

Atualizar dois arquivos:
1. `features/churches/<feature>/index.ts` — exportar componentes da sub-feature
2. `features/churches/index.ts` — re-exportar a sub-feature

```typescript
// features/churches/<feature>/index.ts
export { FeatureCard } from "./feature-card";
export { FeatureList } from "./feature-list";
```

## Passo 5: Integrar na Página

Adicionar a nova seção em `app/igreja/[slug]/page.tsx`:
- Importar do barrel export: `import { FeatureList } from "@/features/churches"`
- Renderizar condicionalmente (verificar se dados existem)
- Manter ordem visual consistente com as seções existentes

## Passo 6: Atualizar Dados

Adicionar dados em `data/churches.ts`:
- Seguir interface definida no passo 1
- IDs únicos
- Slugs via `slugify()`

## Referências

- Arquitetura: @ARCHITECTURE.md
- Exemplo de feature completa: `features/churches/clergy/`
- Exemplo de utilitários: `lib/utils/clergy.ts`
