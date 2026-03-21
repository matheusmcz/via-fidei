/**
 * Variáveis de ambiente alinhadas ao quickstart Next.js do Supabase:
 * @see https://supabase.com/docs/guides/getting-started/quickstarts/nextjs
 *
 * Tipos de chave e período de transição (publishable vs anon JWT):
 * @see https://supabase.com/docs/guides/api/api-keys
 * @see https://github.com/orgs/supabase/discussions/29260
 */

/**
 * URL do projeto — aceita nomes do quickstart Next (`NEXT_PUBLIC_*`) e da
 * integração Vercel↔Supabase (`SUPABASE_URL` sem prefixo público).
 */
function resolveSupabaseUrlRaw(): string | undefined {
  const a = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (a) return a;
  const b = process.env.SUPABASE_URL?.trim();
  if (b) return b;
  return undefined;
}

/**
 * Chave pública (publishable ou anon) — mesma ordem que o dashboard costuma expor.
 */
function resolveSupabasePublishableKeyRaw(): string | undefined {
  const candidates = [
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    process.env.SUPABASE_PUBLISHABLE_KEY,
    process.env.SUPABASE_ANON_KEY,
  ];
  for (const c of candidates) {
    const t = c?.trim();
    if (t) return t;
  }
  return undefined;
}

/** URL + chave pública presentes (sem lançar). Útil em build e `generateStaticParams`. */
export function isSupabasePublicConfigured(): boolean {
  return Boolean(resolveSupabaseUrlRaw() && resolveSupabasePublishableKeyRaw());
}

function supabasePublicEnvHint(): string {
  if (process.env.VERCEL) {
    return " Na Vercel: Project → Settings → Environment Variables. A integração Supabase costuma criar `SUPABASE_URL` e `SUPABASE_ANON_KEY`; o projeto também aceita esses nomes. Para **Preview** (PRs), marque as mesmas variáveis para o ambiente Preview — se estiverem só em Production, o build do preview falha.";
  }
  return " Local: copie `.env.example` para `.env.local` e preencha com a URL e a chave do projeto (Project Settings → API).";
}

export function getSupabaseUrl(): string {
  const url = resolveSupabaseUrlRaw();
  if (!url) {
    throw new Error(
      `Defina NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_URL.${supabasePublicEnvHint()}`
    );
  }
  return url;
}

/**
 * Chave **publishable** (recomendada no dashboard atual).
 * Durante a transição, a chave **anon** (JWT) legada ainda é aceita como fallback.
 */
export function getSupabasePublishableKey(): string {
  const key = resolveSupabasePublishableKeyRaw();
  if (!key) {
    throw new Error(
      `Defina NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ou NEXT_PUBLIC_SUPABASE_ANON_KEY (ou SUPABASE_PUBLISHABLE_KEY / SUPABASE_ANON_KEY da integração Vercel).${supabasePublicEnvHint()}`
    );
  }
  return key;
}

/**
 * Chave **service_role** — acesso privilegiado; só em servidor, scripts e CI.
 * Nunca use com prefixo `NEXT_PUBLIC_`.
 */
export function getSupabaseServiceRoleKey(): string {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error(
      "Defina SUPABASE_SERVICE_ROLE_KEY (Project Settings → API → chave service_role)"
    );
  }
  return key;
}
