# Arquitetura — organização por features

O projeto é organizado por **domínio/feature**, não por tipo de arquivo. Detalhes completos em [`.claude/docs/ARCHITECTURE.md`](../docs/ARCHITECTURE.md).

| Pasta | Responsabilidade |
|-------|-----------------|
| `app/` | Rotas, layouts e páginas (App Router) |
| `features/` | Módulos de domínio (componentes, hooks, lógica e Server Actions agrupados) |
| `components/ui/` | Exclusivo para componentes shadcn/ui |
| `components/` | Componentes compartilhados entre features (ex.: footer) |
| `lib/supabase/` | Clientes Supabase, resolução de env e queries |
| `lib/utils/` | Funções utilitárias de domínio, puras |
| `lib/security/` | Cabeçalhos HTTP de segurança (funções puras usadas pelo `next.config.ts`) |
| `types/` | Tipos TypeScript de domínio |
| `data/` | Dados legados em TS — fonte do seed, **não** importar em runtime |
| `supabase/migrations/` | Schema e RLS versionados em SQL |
| `scripts/` | Scripts de manutenção (`seed`, `bootstrap-users`) |

## Regras

- Novas funcionalidades ficam em `features/<nome-em-kebab-case>/`, com `index.ts` de barrel exports.
- Não criar pastas por tipo (`hooks/`, `services/`) na raiz — agrupar dentro da feature.
- `components/ui/` é reservado ao shadcn/ui.
- Utilitários de domínio ficam em `lib/utils/` (ex.: `clergy.ts`, `schedule.ts`) e são re-exportados por `lib/utils/index.ts`.
- Tipos de domínio ficam em `types/church.ts` e são re-exportados por `types/index.ts`.
- Imports sem `/index` (`@/lib/utils`, não `@/lib/utils/index`).

## Qual cliente Supabase usar

| Contexto | Cliente |
|----------|---------|
| Leitura pública em Server Component, `generateStaticParams`, `generateMetadata` | `createPublicClient()` de `lib/supabase/public.ts` (sem cookies, role `anon`) |
| Server Component/Action que depende do usuário logado | `createClient()` de `lib/supabase/server.ts` (cookies) |
| Client Component | `createClient()` de `lib/supabase/client.ts` |
| Auth Admin API ou bypass de RLS, só no servidor | `createServiceRoleClient()` de `lib/supabase/service-role.ts` |

- Nunca importar `service-role.ts` em código de cliente (o `server-only` quebra o build).
- Server Actions que alteram dados checam o papel no servidor (ex.: `requireAdmin()`), além do RLS.
