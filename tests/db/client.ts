/**
 * Clientes Supabase para o projeto Vitest `db` (VF-098, D10).
 *
 * Os testes do projeto `db` falam com o Postgres local de verdade, então não
 * usam as fixtures simuladas de `tests/fixtures/` nem os clientes de
 * `lib/supabase/`: estes últimos leem `process.env`, que `tests/setup/env.ts`
 * apaga de propósito. Aqui a configuração vem só do `.env.test`.
 *
 * - `createAnonTestClient()`: papel `anon`, sujeito ao RLS. É o ponto de partida
 *   para entrar como admin ou editor.
 * - `signInAsTestUser()`: devolve um cliente já autenticado, igual ao que o
 *   navegador usa (papel `authenticated` no Postgres).
 * - `createServiceRoleTestClient()`: ignora o RLS e os triggers que olham
 *   `current_user`. Só para montar e limpar cenário, nunca para o que está
 *   sendo verificado.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getDbTestEnv } from "./env";

/** Sem persistir sessão: cada cliente do teste é independente. */
const CLIENT_OPTIONS = {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
} as const;

/** Credenciais de um usuário de teste criado pelo seed. */
export interface TestUserCredentials {
  email: string;
  password: string;
}

/** Cliente com a chave pública: papel `anon`, RLS valendo. */
export function createAnonTestClient(): SupabaseClient {
  const { supabaseUrl, publishableKey } = getDbTestEnv();
  return createClient(supabaseUrl, publishableKey, CLIENT_OPTIONS);
}

/** Cliente com a chave secreta: ignora o RLS. Só para montar e limpar cenário. */
export function createServiceRoleTestClient(): SupabaseClient {
  const { supabaseUrl, serviceRoleKey } = getDbTestEnv();
  return createClient(supabaseUrl, serviceRoleKey, CLIENT_OPTIONS);
}

/**
 * Entra com e-mail e senha e devolve o cliente autenticado.
 * Falha com mensagem clara se o seed não tiver rodado.
 */
export async function signInAsTestUser(
  credentials: TestUserCredentials
): Promise<SupabaseClient> {
  const client = createAnonTestClient();
  const { error } = await client.auth.signInWithPassword(credentials);

  if (error) {
    throw new Error(
      `Não foi possível entrar como ${credentials.email}: ${error.message}. ` +
        "Confira se o Supabase local está no ar (`npx supabase start`) e se o seed de teste rodou."
    );
  }

  return client;
}
