import { createClient } from "@supabase/supabase-js";
import { getSupabaseServiceRoleKey, getSupabaseUrl } from "./env";

/**
 * Cliente Supabase com chave service_role — só em servidor (Server Actions, Route Handlers).
 * Necessário para Auth Admin API (`auth.admin.createUser`, etc.).
 */
export function createServiceRoleClient() {
  return createClient(getSupabaseUrl(), getSupabaseServiceRoleKey(), {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
