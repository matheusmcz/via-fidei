# Dados Estáticos

## Arquivo: `data/churches.ts`

Este arquivo contém a lista de igrejas católicas de Maceió/AL, coletadas do site [Hora da Missa](https://www.horadamissa.com).

### Estrutura dos dados

```typescript
export const churches: Church[] = [
  {
    id: string;                    // Identificador único
    name: string;                  // Nome completo da igreja
    slug: string;                  // URL-friendly (gerado via slugify)
    address: string;               // Endereço completo
    district: string;              // Bairro
    imageUrl?: string;             // Caminho para imagem
    type?: ChurchType;             // "parish" | "rectory" | "cathedral" | "chapel" | "sanctuary"
    contact?: ChurchContact;       // Telefone, WhatsApp, redes sociais, website
    googleMapsUrl?: string;        // URL do Google Maps
    masses?: ScheduleEvent[];      // Horários de missas
    adorations?: ScheduleEvent[];  // Horários de adoração
    confessions?: ScheduleEvent[]; // Horários de confissão
    activities?: Activity[];       // Atividades (Terço, Novena, Catequese, etc.)
    clergy?: Clergy[];             // Clérigos vinculados (dados completos inline)
    ministries?: ChurchMinistries; // Grupos, movimentos e pastorais
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

**Total:** 55 igrejas reais de Maceió/AL

**Bairros representados:** 40 bairros, incluindo Centro (5), Farol (4), Mangabeiras (3), Feitosa (2), Jacintinho (2), Jaraguá (2), Pinheiro (2), Poço (2), Vergel do Lago (2), entre outros.

### Imagens

Igrejas sem `imageUrl` usam automaticamente `/images/via-fidei-logo.png` como placeholder. Consulte `public/images/README.md` para a convenção de nomes.

### Gerenciamento

- ✅ **Dados reais** coletados do Hora da Missa
- ✅ **Dados versionados no repositório**
- ✅ **Sem CRUD** — cadastro manual
- ✅ **Sem backend** — importação direta em Server Components

### Como usar

```typescript
import { churches } from "@/data/churches";

// Listar todas
const allChurches = churches;

// Buscar por slug
const church = churches.find((c) => c.slug === "sao-paulo-apostolo");

// Filtrar por bairro
const centroChurches = churches.filter((c) => c.district === "Centro");

// Obter lista de bairros únicos
const districts = [...new Set(churches.map((c) => c.district))].sort();
```

### Adicionando novas igrejas

1. Definir nome, endereço e bairro
2. Gerar slug usando `slugify(name)`
3. (Opcional) Adicionar foto em `/public/images/` seguindo a convenção de nomes
4. Adicionar entrada no array `churches`

```typescript
{
  id: "56",
  name: "Nova Paróquia",
  slug: slugify("Nova Paróquia"), // → "nova-paroquia"
  address: "Endereço completo",
  district: "Nome do Bairro",
  type: "parish",
  imageUrl: "/images/nova-paroquia.jpg",
  googleMapsUrl: "https://maps.app.goo.gl/...",
  contact: {
    phone: "+5582999999999",
    whatsapp: "+5582999999999",
    instagram: "@novaparoquia",
  },
  masses: [
    { dayOfWeek: 0, time: "08:00" },
    { dayOfWeek: 0, time: "19:00" },
  ],
}
```

## Modelo dual de dados

### Clérigos

Os dados de clérigos existem em **dois lugares** intencionalmente:

1. **Dentro de `churches.ts`** -- em `Church.clergy[]`, com os objetos completos. A página de detalhes da igreja usa diretamente `church.clergy`.
2. **Em `data/clergy.ts`** -- como entidades independentes com `churchId`. A página `/clero` usa este array para listagem e busca.

Ao cadastrar um novo clérigo, os dados devem ser adicionados nos dois arquivos.

### Ministérios (grupos, movimentos e pastorais)

Os dados de ministérios seguem o mesmo modelo dual:

1. **Dentro de `churches.ts`** -- em `Church.ministries`, com os objetos completos organizados por categoria (`groups`, `movements`, `pastorals`). A página de detalhes da igreja usa diretamente `church.ministries`.
2. **Em `data/ministries.ts`** -- como listas independentes exportadas por categoria (`groups`, `movements`, `pastorals`).

Ao cadastrar um novo ministério, os dados devem ser adicionados nos dois arquivos.

## Arquivo: `data/ministries.ts`

Contém a lista completa de grupos, movimentos e pastorais como entidades independentes, organizados por categoria.

### Estrutura dos dados

```typescript
import type { ChurchMinistry } from "@/types";

export const groups: ChurchMinistry[] = [
  {
    id: string;       // UUID único
    label: string;    // Nome completo (e.g., "Renovação Carismática Católica")
    acronym?: string; // Sigla opcional (e.g., "RCC")
  }
];

export const movements: ChurchMinistry[] = [...];
export const pastorals: ChurchMinistry[] = [...];
```

### Adicionando novos ministérios

```typescript
{
  id: "uuid-gerado",
  label: "Nome do Ministério",
  acronym: "SIGLA",
}
```

IDs devem ser UUIDs únicos. Gerar via `uuidgen` ou equivalente.

## Arquivo: `data/clergy.ts`

Contém a lista de clérigos (padres, diáconos, etc.) como entidades independentes, vinculados a igrejas por `churchId`.

### Estrutura dos dados

```typescript
export const clergyMembers: Clergy[] = [
  {
    id: string;                    // Identificador único
    name: string;                  // Nome do clérigo
    churchId: string;              // ID da igreja (referência a Church.id)
    role: ClergyRole;              // "parish-priest" | "vicar" | "deacon" | "administrator" | "rector"
    title?: ClergyTitle;           // "padre" | "monsenhor" | "frei" | "dom"
    suffix?: ReligiousOrderSuffix; // Ordem religiosa (OFM, SJ, etc.)
    imageUrl?: string;             // Caminho para foto
    startDate?: string;            // Início na paróquia
    endDate?: string;              // Fim (omitido para ativos)
    bio?: string;                  // Biografia
    socialLinks?: {                // Redes sociais
      whatsapp?: string;
      instagram?: string;
      facebook?: string;
    };
  }
];
```

### Adicionando novos clérigos

```typescript
{
  id: "56-clergy-1",
  name: "Nome do Padre",
  churchId: "56",
  role: "parish-priest",
  title: "padre",
}
```
