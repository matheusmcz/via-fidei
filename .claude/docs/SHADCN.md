# Guia: shadcn/ui

## Instalando componentes

O projeto está configurado para usar **shadcn/ui**. Para adicionar componentes:

```bash
npx shadcn@latest add [component-name]
```

### Exemplos de componentes úteis para o MVP

```bash
# Card (para exibir igrejas)
npx shadcn@latest add card

# Input (para busca)
npx shadcn@latest add input

# Select (para filtro de bairro)
npx shadcn@latest add select

# Badge (para exibir informações)
npx shadcn@latest add badge

# Skeleton (para loading states)
npx shadcn@latest add skeleton
```

## Componentes instalados

Os componentes são adicionados em `/components/ui/` e podem ser importados assim:

```tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
```

## Customização

Todos os componentes podem ser customizados diretamente nos arquivos em `/components/ui/`.

As variáveis de cor e espaçamento estão definidas em:

- `app/globals.css` (CSS variables)
- `tailwind.config.ts` (configuração do Tailwind)

## Documentação oficial

https://ui.shadcn.com/docs
