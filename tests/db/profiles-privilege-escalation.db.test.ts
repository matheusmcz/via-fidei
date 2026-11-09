/**
 * Trigger `profiles_prevent_privilege_escalation` da migration `010`, contra o
 * Postgres local (VF-098, D10).
 *
 * A política `profiles_update_own` (`008`) libera UPDATE na própria linha sem
 * restringir coluna. Sem o trigger, um editor viraria admin por uma chamada
 * direta à API. Aqui o teste usa o mesmo caminho do navegador: cliente com a
 * chave pública, autenticado, papel `authenticated` no Postgres.
 *
 * O que distingue os dois tipos de recusa:
 * - **trigger**: a linha passa pelo RLS e o `raise exception` vira erro
 *   `42501` na resposta;
 * - **RLS**: a linha não passa pelo `using`, então o UPDATE não atinge
 *   nenhuma linha e a resposta é uma lista vazia, sem erro.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  createServiceRoleTestClient,
  signInAsTestUser,
} from "./client";
import { TEST_USERS, restoreTestProfiles } from "./seed";

/** Mensagem do `raise exception` da `010`. */
const ESCALATION_MESSAGE =
  "Apenas administradores podem alterar papel ou status do perfil";

/** Dica para quando o banco local estiver numa versão anterior à `010`. */
const MISSING_TRIGGER_HINT =
  "esperava a recusa do trigger da 010; banco local desatualizado? rode `npx supabase db reset`";

let editorClient: SupabaseClient;
let adminClient: SupabaseClient;
let editorId: string;

beforeAll(async () => {
  editorClient = await signInAsTestUser(TEST_USERS.editor);
  adminClient = await signInAsTestUser(TEST_USERS.admin);

  const { data } = await editorClient.auth.getUser();
  if (!data.user) throw new Error("O editor de teste não ficou autenticado");
  editorId = data.user.id;
});

afterAll(async () => {
  // O último teste promove o editor; restaura o cenário mesmo se ele falhar.
  await restoreTestProfiles();
});

describe("profiles: escalada de privilégio (migration 010)", () => {
  it("recusa o editor se promovendo a admin", async () => {
    const { data, error } = await editorClient
      .from("profiles")
      .update({ role: "admin" })
      .eq("id", editorId)
      .select("id, role");

    expect(error?.code, MISSING_TRIGGER_HINT).toBe("42501");
    expect(error?.message).toContain(ESCALATION_MESSAGE);
    expect(data).toBeNull();
  });

  it("recusa o editor alterando o próprio status", async () => {
    const { error } = await editorClient
      .from("profiles")
      .update({ is_active: false })
      .eq("id", editorId)
      .select("id, is_active");

    expect(error?.code, MISSING_TRIGGER_HINT).toBe("42501");
    expect(error?.message).toContain(ESCALATION_MESSAGE);
  });

  it("recusa o editor mudando papel e status na mesma chamada", async () => {
    const { error } = await editorClient
      .from("profiles")
      .update({ role: "admin", is_active: true })
      .eq("id", editorId)
      .select("id");

    expect(error?.code, MISSING_TRIGGER_HINT).toBe("42501");
    expect(error?.message).toContain(ESCALATION_MESSAGE);
  });

  it("mantém o editor como editor ativo depois das tentativas", async () => {
    const service = createServiceRoleTestClient();
    const { data, error } = await service
      .from("profiles")
      .select("role, is_active")
      .eq("id", editorId)
      .single();

    expect(error).toBeNull();
    expect(data).toMatchObject({ role: "editor", is_active: true });
  });

  it("deixa o editor alterar o próprio nome", async () => {
    const name = `${TEST_USERS.editor.name} (renomeado)`;

    const { data, error } = await editorClient
      .from("profiles")
      .update({ name })
      .eq("id", editorId)
      .select("id, name, role");

    expect(error).toBeNull();
    expect(data).toEqual([{ id: editorId, name, role: "editor" }]);
  });

  it("deixa o editor reenviar o próprio papel sem alterar o valor", async () => {
    // `is distinct from` compara valores: reenviar 'editor' não é mudança e
    // passa. Garante que o trigger não bloqueia um PATCH que mande a linha
    // inteira sem alterar papel nem status.
    const { error } = await editorClient
      .from("profiles")
      .update({ role: "editor", is_active: true })
      .eq("id", editorId)
      .select("id");

    expect(error).toBeNull();
  });

  it("não deixa o editor alterar o perfil de outro usuário", async () => {
    const service = createServiceRoleTestClient();
    const { data: adminProfile } = await service
      .from("profiles")
      .select("id")
      .eq("email", TEST_USERS.admin.email)
      .single();

    const { data, error } = await editorClient
      .from("profiles")
      .update({ name: "invadido" })
      .eq("id", adminProfile?.id)
      .select("id");

    // Recusa pelo RLS (`profiles_update_own`): nenhuma linha atingida.
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it("deixa o admin alterar o papel de outro perfil", async () => {
    const { data, error } = await adminClient
      .from("profiles")
      .update({ role: "admin" })
      .eq("id", editorId)
      .select("id, role");

    expect(error).toBeNull();
    expect(data).toEqual([{ id: editorId, role: "admin" }]);

    await restoreTestProfiles();
  });
});
