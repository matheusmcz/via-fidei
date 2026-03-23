# Dados

## Supabase (produção)

Os dados da aplicação são armazenados no **Supabase** (PostgreSQL). As páginas consomem dados via queries em `lib/supabase/queries/` (cliente público em `lib/supabase/public.ts`, sem cookies — compatível com `generateStaticParams` e RLS `anon`).

### Variáveis de ambiente

A resolução de URL e chave pública está centralizada em [`lib/supabase/env.ts`](../lib/supabase/env.ts): aceita `NEXT_PUBLIC_SUPABASE_*` **ou** os nomes da integração Vercel↔Supabase (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, etc.). O [`next.config.ts`](../next.config.ts) espelha `SUPABASE_*` para `NEXT_PUBLIC_*` no build do cliente. Para **seed** e operações privilegiadas, use `SUPABASE_SERVICE_ROLE_KEY` (nunca exponha com prefixo público).

### Aplicar o schema

1. No [Supabase Dashboard](https://supabase.com/dashboard) → **SQL Editor**, execute os arquivos em `supabase/migrations/` **na ordem numérica** (`001_profiles.sql` … `008_rls_policies.sql`).
2. Opcional: com [Supabase CLI](https://supabase.com/docs/guides/cli) e projeto linkado: `supabase db push`.
3. Preencha `.env.local` (ver `.env.example`) e rode `npm run seed` para importar dados a partir dos TS abaixo.

### Tabelas principais

| Tabela | Descrição |
|--------|-----------|
| `churches` | Igrejas com contato e localização |
| `schedule_events` | Horários de missas, adorações e confissões |
| `activities` | Atividades pastorais |
| `activity_schedules` | Horários das atividades |
| `clergy` | Clérigos como entidades independentes |
| `church_clergy` | Vínculo clérigo-igreja (com datas) |
| `ministries` | Grupos, movimentos e pastorais |
| `church_ministries` | Vínculo ministério-igreja |
| `profiles` | Perfis de usuários (admin/editor) |
| `editor_churches` | Vínculo editor-igreja |

### Migrations

As migrations SQL estão em `supabase/migrations/` e devem ser executadas na ordem numérica.

### Seed

O script `scripts/seed.ts` migra os dados dos arquivos estáticos legados para o Supabase. Requer URL resolvível (`NEXT_PUBLIC_SUPABASE_URL` ou `SUPABASE_URL`) e **`SUPABASE_SERVICE_ROLE_KEY`**. Carrega `.env.local` automaticamente via `scripts/load-env.ts`.

```bash
npm run seed
```

## Arquivos estáticos (legado)

Os arquivos abaixo são mantidos como referência e para o script de seed:

- `churches.ts` — 55 igrejas reais de Maceió/AL (fonte: [Hora da Missa](https://www.horadamissa.com))
- `clergy.ts` — Clérigos com vínculo por `churchId`
- `ministries.ts` — Grupos, movimentos e pastorais por categoria

Esses arquivos **não são mais importados** pelas páginas da aplicação.
