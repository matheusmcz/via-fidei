/**
 * Variáveis de ambiente alinhadas ao quickstart Next.js do Supabase:
 * @see https://supabase.com/docs/guides/getting-started/quickstarts/nextjs
 *
 * Tipos de chave e período de transição (publishable vs anon JWT):
 * @see https://supabase.com/docs/guides/api/api-keys
 * @see https://github.com/orgs/supabase/discussions/29260
 */

export function getSupabaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) {
    throw new Error("Defina NEXT_PUBLIC_SUPABASE_URL");
  }
  return url;
}

/**
 * Chave **publishable** (recomendada no dashboard atual).
 * Durante a transição, a chave **anon** (JWT) legada ainda é aceita como fallback.
 */
export function getSupabasePublishableKey(): string {
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!key) {
    throw new Error(
      "Defina NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (ou, durante a transição, NEXT_PUBLIC_SUPABASE_ANON_KEY)"
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
