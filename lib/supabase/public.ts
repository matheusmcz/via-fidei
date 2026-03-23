import { createClient } from "@supabase/supabase-js";
import { getSupabasePublishableKey, getSupabaseUrl } from "./env";

/**
 * Cliente Supabase para leituras públicas **sem** cookies de sessão.
 *
 * Use em queries de dados públicos (igrejas, clero) e em contextos onde
 * `cookies()` não existe — ex.: `generateStaticParams`, build estático.
 *
 * Respeita RLS como role `anon`. Para sessão do usuário (Auth), use
 * `createClient` de `server.ts`.
 */
export function createPublicClient() {
  return createClient(getSupabaseUrl(), getSupabasePublishableKey());
}
