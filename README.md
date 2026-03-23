<div align="center">
  <img src="public/images/via-fidei-logo.png" alt="Via Fidei Logo" width="200" />
  
  # Via Fidei
  
  **Igrejas Católicas de Maceió/AL**
  
  [![Next.js](https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=next.js)](https://nextjs.org/)
  [![React](https://img.shields.io/badge/React-19-blue?style=flat-square&logo=react)](https://react.dev/)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
  [![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-38bdf8?style=flat-square&logo=tailwind-css)](https://tailwindcss.com/)
  
  Uma aplicação web simples e objetiva para encontrar igrejas católicas em Maceió/AL
  
  [Demo](https://viafidei.vercel.app) • [Reportar Bug](https://github.com/matheusmcz/via-fidei/issues)
</div>

---

## 📋 Sobre o Projeto

Via Fidei é uma aplicação web desenvolvida para facilitar a busca de igrejas católicas apostólicas romanas em Maceió, Alagoas. O projeto oferece uma interface limpa e intuitiva para visualizar informações sobre paróquias da cidade.

### Documentação

| Documento | Conteúdo |
|-----------|----------|
| [ARCHITECTURE.md](ARCHITECTURE.md) | Estrutura de pastas, **diagrama e integração Supabase** (três clientes, env, Vercel, RLS), migrations, fluxo de dados, próximos passos |
| [docs/QA.md](docs/QA.md) | Casos de teste e checklist de regressão |
| [data/README.md](data/README.md) | Tabelas, seed, arquivos legados em `data/` |
| [docs/SHADCN.md](docs/SHADCN.md) | Uso do shadcn/ui no projeto |

### ✨ Funcionalidades

- 🔍 **Busca em tempo real** - Encontre igrejas por nome (ignora acentos)
- 📍 **Filtro por bairro** - Localize paróquias em bairros específicos
- 📱 **Design responsivo** - Interface mobile-first otimizada
- ⚡ **Performance** - SSR/ISR com Next.js 15 e Turbopack (`revalidate` nas páginas com dados)
- 🎨 **UI moderna** - Componentes do shadcn/ui
- 🔗 **Detalhes completos** - Página individual para cada igreja
- 🗄️ **Dados** - [Supabase](https://supabase.com/) (PostgreSQL + RLS); seed a partir dos arquivos em `data/`
- 🔐 **Auth (admin/editor)** - Login em `/login`, área `/admin` (rotas sem link público na UI)
- 📊 **Analytics** - Vercel Analytics integrado

## 🚀 Tecnologias

### Core

- **[Next.js 15](https://nextjs.org/)** - Framework React com App Router
- **[React 19](https://react.dev/)** - Biblioteca UI
- **[TypeScript](https://www.typescriptlang.org/)** - Tipagem estática

### Estilização

- **[Tailwind CSS](https://tailwindcss.com/)** - Framework CSS utility-first
- **[shadcn/ui](https://ui.shadcn.com/)** - Componentes reutilizáveis

### Ferramentas

- **[Vercel Analytics](https://vercel.com/analytics)** - Analytics (plano gratuito)
- **[Turbopack](https://turbo.build/pack)** - Bundler ultra-rápido

### Dados e Supabase

- **[Supabase](https://supabase.com/)** — PostgreSQL, Auth e API
- Variáveis de ambiente no padrão do [quickstart Next.js + Supabase](https://supabase.com/docs/guides/getting-started/quickstarts/nextjs): `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (veja [API keys](https://supabase.com/docs/guides/api/api-keys)). Para o script `npm run seed`, use também `SUPABASE_SERVICE_ROLE_KEY` (somente servidor).

## 📦 Instalação

### Pré-requisitos

- **Node.js 24.x** (definido em `engines` e `.nvmrc`; Vercel usa a mesma faixa)
- npm ou yarn

### Clone e instale

```bash
# Clone o repositório
git clone https://github.com/matheusmcz/via-fidei.git

# Entre no diretório
cd via-fidei

# Instale as dependências
npm install

# Configure o Supabase (copie e preencha com as chaves do projeto)
cp .env.example .env.local

# Inicie o servidor de desenvolvimento
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000) no navegador.

`npm run build` e o deploy na **Vercel** precisam da URL e da chave pública do Supabase. Você pode usar `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (ou `NEXT_PUBLIC_SUPABASE_ANON_KEY`), **ou** os nomes da integração Vercel↔Supabase (`SUPABASE_URL`, `SUPABASE_ANON_KEY` / `SUPABASE_PUBLISHABLE_KEY`) — o projeto faz fallback e o `next.config.ts` espelha para o bundle do cliente.

**Importante:** na Vercel, marque **Production** e **Preview** para as mesmas variáveis. Se aparecerem só em Production, o build de **deploys de PR (Preview)** continua sem essas variáveis e falha.

Após criar o projeto no Supabase, execute as migrations SQL em `supabase/migrations/` (ordem `001` → `008`) no **SQL Editor**, depois:

```bash
npm run seed
```

## 🛠️ Scripts Disponíveis

```bash
# Desenvolvimento com Turbopack
npm run dev

# Build de produção
npm run build

# Iniciar servidor de produção
npm run start

# Linting
npm run lint

# Popular o banco a partir dos dados legados em data/ (requer SUPABASE_SERVICE_ROLE_KEY)
npm run seed
```

## 📁 Estrutura do Projeto

```
via-fidei/
├── app/                      # App Router (rotas, layouts, páginas)
│   ├── admin/                # Painel admin (dashboard, editores)
│   ├── clero/                # Listagem de clérigos
│   ├── igreja/[slug]/        # Detalhe da igreja
│   ├── login/                # Login (rota escondida)
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
├── middleware.ts             # Refresh de sessão Supabase
├── components/ui/            # shadcn/ui
├── features/                 # Domínios (churches, clergy, auth, theme, …)
├── data/                     # Fonte do seed (legado; não usado em runtime)
├── lib/
│   ├── supabase/             # Clientes, env, queries
│   └── utils/
├── scripts/                  # seed.ts, load-env.ts
├── supabase/migrations/      # SQL do schema (001–008)
├── types/
└── public/images/
```

Detalhes em [ARCHITECTURE.md](ARCHITECTURE.md).

## 🎨 Componentes Principais

### ChurchCard

Componente de card para exibir informações resumidas da igreja.

### ChurchList

Lista de igrejas com busca e filtros integrados.

### useChurchFilters

Hook customizado para gerenciar busca, filtro e ordenação.

## 📊 Dados

Os dados em produção ficam no **Supabase** (PostgreSQL). O conjunto inicial replica as **55 igrejas** e metadados derivados da fonte [Hora da Missa](https://www.horadamissa.com), carregados via `npm run seed` a partir de `data/*.ts`.

Tipos de domínio em [`types/church.ts`](types/church.ts); leitura na aplicação via [`lib/supabase/queries/`](lib/supabase/queries/). Ver também [`data/README.md`](data/README.md).

## 🎯 SEO

- ✅ Metadata dinâmica por página
- ✅ Open Graph para redes sociais
- ✅ Twitter Cards
- ✅ Sitemap automático
- ✅ SSR para melhor indexação

## 🚢 Deploy

### Vercel (Recomendado)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/matheusmcz/via-fidei)

1. Conecte seu repositório GitHub
2. Em **Environment Variables**, defina as mesmas chaves do `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - (Opcional no build) `SUPABASE_SERVICE_ROLE_KEY` — só se algum script de build precisar; em geral **não** exponha no cliente
3. Deploy!

O banco já deve existir no Supabase (migrations aplicadas, seed executado uma vez em dev ou via pipeline separado).

### Outras plataformas

O projeto é compatível com qualquer plataforma que suporte Next.js:

- Netlify
- Railway
- Render
- AWS Amplify

## 📝 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

## 👨‍💻 Autor

**Matheus Vieira do Nascimento**

- 📧 Email: [matheusmczvieira@gmail.com](mailto:matheusmczvieira@gmail.com)
- 🐙 GitHub: [@matheusmcz](https://github.com/matheusmcz)
- 💼 LinkedIn: [Matheus Nascimento](https://www.linkedin.com/in/matheusmcz)

Católico - Maceioense - Marido - Pai - Desenvolvedor

## 🙏 Agradecimentos

- Dados fornecidos por [Hora da Missa](https://www.horadamissa.com)
- Componentes UI por [shadcn/ui](https://ui.shadcn.com)
- Arquidiocese de Maceió

---

<div align="center">
  Feito com carinho para a comunidade católica de Maceió
</div>
