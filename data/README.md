# Dados Estáticos - Igrejas

## Arquivo: `data/churches.ts`

Este arquivo contém a lista de igrejas católicas de Maceió/AL.

### Estrutura dos dados

```typescript
export const churches: Church[] = [
  {
    id: string;           // Identificador único
    name: string;         // Nome completo da igreja
    slug: string;         // URL-friendly (gerado via slugify)
    address: string;      // Endereço completo
    district: string;     // Bairro
    imageUrl?: string;    // Opcional: caminho para imagem
  }
];
```

### Regras para slugs

Gerados pela função `slugify()`:

- Lowercase
- Sem acentos
- Espaços substituídos por `-`

**Exemplos:**

- `São José Operário` → `sao-jose-operario`
- `Nossa Senhora dos Prazeres` → `nossa-senhora-dos-prazeres`

### Dados atuais

**Total:** 12 igrejas fictícias

**Bairros representados:**

- Centro (2)
- Pajuçara (2)
- Farol (1)
- Jatiúca (1)
- Ponta Verde (1)
- Jaraguá (1)
- Mangabeiras (1)
- Cidade Universitária (1)
- Benedito Bentes (1)
- Tabuleiro do Martins (1)

### Imagens

Apenas 1 igreja possui `imageUrl` definida (para teste):

- Igreja de Nossa Senhora dos Prazeres

As demais usarão o placeholder padrão: `/images/placeholder.svg`

### Gerenciamento

- ✅ **Dados versionados no repositório**
- ✅ **Sem CRUD**
- ✅ **Cadastro manual**
- ⚠️ **Dados fictícios** - Substituir por dados reais em produção

### Como usar

```typescript
import { churches } from "@/data/churches";

// Listar todas
const allChurches = churches;

// Buscar por slug
const church = churches.find((c) => c.slug === "sao-jose-operario");

// Filtrar por bairro
const pajucaraChurches = churches.filter((c) => c.district === "Pajuçara");

// Obter lista de bairros únicos
const districts = [...new Set(churches.map((c) => c.district))].sort();
```

### Adicionando novas igrejas

1. Definir nome, endereço e bairro
2. Gerar slug usando `slugify(name)`
3. (Opcional) Adicionar foto em `/public/images/churches/`
4. Adicionar entrada no array `churches`

```typescript
{
  id: "13",
  name: "Nova Paróquia",
  slug: slugify("Nova Paróquia"), // → "nova-paroquia"
  address: "Endereço completo",
  district: "Nome do Bairro",
  imageUrl: "/images/churches/nova-paroquia.jpg", // opcional
}
```
