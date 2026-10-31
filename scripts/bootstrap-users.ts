/**
 * Cria usuário admin e usuário editor de teste no Supabase (Auth + profiles + editor_churches).
 *
 * O perfil criado pelo trigger handle_new_user nasce inativo (migration 015);
 * o script ativa os dois perfis explicitamente.
 *
 * Uso: defina variáveis de ambiente e rode:
 *   npm run bootstrap-users
 *
 * Requer no .env.local (ou export no shell):
 * - NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY
 * - ADMIN_EMAIL, ADMIN_PASSWORD
 * - EDITOR_EMAIL, EDITOR_PASSWORD
 *
 * Opcionais:
 * - ADMIN_NAME (default: "Administrador")
 * - EDITOR_NAME (default: "Editor teste")
 * - EDITOR_CHURCH_ID — UUID de uma igreja; se omitido, usa a primeira linha de `churches`.
 */

import "./load-env";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseServiceRoleKey, getSupabaseUrl } from "../lib/supabase/env";

function requireEnv(name: string): string {
  const v = process.env[name]?.trim();
  if (!v) {
    console.error(`Variável obrigatória ausente: ${name}`);
    process.exit(1);
  }
  return v;
}

let supabaseUrl: string;
let serviceRoleKey: string;
try {
  supabaseUrl = getSupabaseUrl();
  serviceRoleKey = getSupabaseServiceRoleKey();
} catch (e) {
  console.error(
    (e as Error).message,
    "\nConfira .env.local (URL do projeto + SUPABASE_SERVICE_ROLE_KEY)."
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function ensureUser(
  email: string,
  password: string,
  displayName: string
): Promise<string> {
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name: displayName },
  });

  if (data?.user) {
    return data.user.id;
  }

  if (!error) {
    throw new Error(`Falha ao criar usuário: ${email}`);
  }

  if (error.code === "email_exists") {
    const { data: row, error: profileError } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (row?.id) {
      console.warn(`Usuário já existia: ${email} (id ${row.id}).`);
      return row.id;
    }
    throw new Error(
      `Email já usado no Auth mas sem perfil em profiles: ${email}. ${profileError?.message ?? error.message}`
    );
  }

  const hint = error.message.includes("Database error")
    ? "\nDica: confira se a migration 009 (handle_new_user com search_path) foi aplicada no projeto Supabase."
    : "";
  throw new Error(
    `Falha ao criar usuário ${email} (${error.code ?? error.status}): ${error.message}${hint}`
  );
}

async function resolveChurchId(): Promise<string> {
  const fromEnv = process.env.EDITOR_CHURCH_ID?.trim();
  if (fromEnv) return fromEnv;

  const { data, error } = await supabase
    .from("churches")
    .select("id")
    .limit(1)
    .maybeSingle();

  if (error || !data?.id) {
    throw new Error(
      "Nenhuma igreja no banco e EDITOR_CHURCH_ID não definido. Rode npm run seed ou defina EDITOR_CHURCH_ID."
    );
  }
  console.log(`Usando primeira igreja do banco como vínculo do editor: ${data.id}`);
  return data.id;
}

async function main() {
  const adminEmail = requireEnv("ADMIN_EMAIL");
  const adminPassword = requireEnv("ADMIN_PASSWORD");
  const editorEmail = requireEnv("EDITOR_EMAIL");
  const editorPassword = requireEnv("EDITOR_PASSWORD");

  const adminName = process.env.ADMIN_NAME?.trim() || "Administrador";
  const editorName = process.env.EDITOR_NAME?.trim() || "Editor teste";

  console.log("Criando ou reutilizando usuário admin...");
  const adminId = await ensureUser(adminEmail, adminPassword, adminName);

  const { error: adminProfileError } = await supabase
    .from("profiles")
    .update({ name: adminName, role: "admin", is_active: true })
    .eq("id", adminId);

  if (adminProfileError) {
    throw new Error(`Perfil admin: ${adminProfileError.message}`);
  }
  console.log(`Admin OK: ${adminEmail} (${adminId})`);

  console.log("Criando ou reutilizando usuário editor...");
  const editorId = await ensureUser(editorEmail, editorPassword, editorName);

  const { error: editorProfileError } = await supabase
    .from("profiles")
    .update({ name: editorName, role: "editor", is_active: true })
    .eq("id", editorId);

  if (editorProfileError) {
    throw new Error(`Perfil editor: ${editorProfileError.message}`);
  }

  const churchId = await resolveChurchId();

  const { error: linkError } = await supabase.from("editor_churches").upsert(
    { editor_id: editorId, church_id: churchId },
    { onConflict: "editor_id,church_id" }
  );

  if (linkError) {
    throw new Error(`editor_churches: ${linkError.message}`);
  }

  console.log(`Editor OK: ${editorEmail} (${editorId}) vinculado à igreja ${churchId}`);
  console.log("\nPróximos passos: acesse /login com cada conta e valide /admin (admin) e edição na igreja vinculada (editor).");
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
