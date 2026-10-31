// @vitest-environment node
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import type { FakeQueryResult } from "@/tests/fixtures/supabase";
import {
  argsOf,
  createFakeAuthClient,
  findQueries,
} from "@/tests/fixtures/supabase-auth";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { EDITOR_NOT_FOUND_MESSAGE } from "./access";
import {
  createEditor,
  toggleEditorActive,
  updateEditorChurches,
} from "./admin-actions";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/supabase/service-role", () => ({
  createServiceRoleClient: vi.fn(),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const ADMIN_ID = "0b9a8c7d-6e5f-4a3b-9c2d-1e0f9a8b7c6d";
const EDITOR_ID = "5d2e8f1a-3c4b-4a6d-8e9f-7b1c2d3e4f5a";
const NEW_USER_ID = "9e8d7c6b-5a4f-4e3d-8c2b-1a0f9e8d7c6b";
const CHURCH_A = "3f1c2b7e-8d4a-4f6b-9a2c-1e5d7f8a9b0c";
const CHURCH_B = "a7e9d1c3-5b2f-4e8a-b6d4-0c9f8e7d6a5b";

const ACTIVE_ADMIN: FakeQueryResult = {
  data: { role: "admin", is_active: true },
  error: null,
};
const OK: FakeQueryResult = { data: null, error: null };
/** Erro do PostgREST quando `.single()` não encontra linha. */
const NO_ROWS_ERROR = {
  code: "PGRST116",
  message: "JSON object requested, multiple (or no) rows returned",
};

function mockServerClient(profiles: FakeQueryResult[], extra = {}) {
  const client = createFakeAuthClient({
    user: { id: ADMIN_ID },
    tables: { profiles, ...extra },
  });
  vi.mocked(createClient).mockResolvedValue(
    client as unknown as Awaited<ReturnType<typeof createClient>>,
  );
  return client;
}

function mockServiceRole() {
  const admin = {
    createUser: vi.fn(async () => ({
      data: { user: { id: NEW_USER_ID } },
      error: null,
    })),
    deleteUser: vi.fn(async () => ({ data: {}, error: null })),
  };
  vi.mocked(createServiceRoleClient).mockReturnValue({
    auth: { admin },
  } as unknown as ReturnType<typeof createServiceRoleClient>);
  return admin;
}

function editorForm(overrides: Record<string, string | string[]> = {}) {
  const values: Record<string, string | string[]> = {
    name: "Maria das Graças",
    email: "maria@example.com",
    password: "senha-segura",
    churchIds: [CHURCH_A],
    ...overrides,
  };
  const formData = new FormData();
  for (const [key, value] of Object.entries(values)) {
    for (const item of Array.isArray(value) ? value : [value]) {
      formData.append(key, item);
    }
  }
  return formData;
}

beforeEach(() => {
  vi.mocked(createClient).mockReset();
  vi.mocked(createServiceRoleClient).mockReset();
});

describe("createEditor", () => {
  it("cria o usuário e grava o perfil como editor", async () => {
    const client = mockServerClient(
      [ACTIVE_ADMIN, { data: { id: NEW_USER_ID }, error: null }],
      { editor_churches: OK },
    );
    const authAdmin = mockServiceRole();

    await expect(createEditor(editorForm())).resolves.toEqual({
      success: true,
      userId: NEW_USER_ID,
    });

    expect(authAdmin.createUser).toHaveBeenCalledWith(
      expect.objectContaining({ email: "maria@example.com" }),
    );
    const [update] = findQueries(client, "profiles", "update");
    expect(argsOf(update, "update")).toEqual([
      { name: "Maria das Graças", role: "editor" },
    ]);
    expect(argsOf(update, "eq")).toEqual(["id", NEW_USER_ID]);
    const [link] = findQueries(client, "editor_churches", "insert");
    expect(argsOf(link, "insert")).toEqual([
      [{ editor_id: NEW_USER_ID, church_id: CHURCH_A }],
    ]);
  });

  it("recusa entrada inválida antes de criar o usuário", async () => {
    // Uma checagem de admin por chamada.
    mockServerClient([ACTIVE_ADMIN, ACTIVE_ADMIN]);
    const authAdmin = mockServiceRole();

    await expect(
      createEditor(editorForm({ email: "maria@" })),
    ).resolves.toEqual({ error: "Informe um email válido" });
    await expect(
      createEditor(editorForm({ churchIds: ["abc"] })),
    ).resolves.toEqual({ error: "Igreja inválida" });

    expect(authAdmin.createUser).not.toHaveBeenCalled();
  });

  it("remove o usuário do Auth quando o perfil não é encontrado para ativar", async () => {
    mockServerClient([ACTIVE_ADMIN, { data: null, error: NO_ROWS_ERROR }]);
    const authAdmin = mockServiceRole();

    const result = await createEditor(editorForm());

    expect(result).toEqual({
      error: "Erro ao atualizar perfil: o perfil do novo editor não foi criado",
    });
    expect(authAdmin.deleteUser).toHaveBeenCalledWith(NEW_USER_ID);
  });

  it("remove o usuário do Auth quando a ativação do perfil falha", async () => {
    mockServerClient([
      ACTIVE_ADMIN,
      { data: null, error: { message: "fetch failed" } },
    ]);
    const authAdmin = mockServiceRole();

    const result = await createEditor(editorForm());

    expect(result).toEqual({ error: "Erro ao atualizar perfil: fetch failed" });
    expect(authAdmin.deleteUser).toHaveBeenCalledWith(NEW_USER_ID);
  });

  it("não deixa quem não é admin criar editor", async () => {
    mockServerClient([{ data: { role: "editor", is_active: true }, error: null }]);
    const authAdmin = mockServiceRole();

    await expect(createEditor(editorForm())).resolves.toEqual({
      error: "Acesso negado",
    });
    expect(authAdmin.createUser).not.toHaveBeenCalled();
  });

  it("não deixa admin desativado criar editor", async () => {
    mockServerClient([{ data: { role: "admin", is_active: false }, error: null }]);
    const authAdmin = mockServiceRole();

    await expect(createEditor(editorForm())).resolves.toEqual({
      error: "Acesso negado",
    });
    expect(authAdmin.createUser).not.toHaveBeenCalled();
  });
});

describe("toggleEditorActive", () => {
  it("alterna o status de um editor, filtrando o update por papel", async () => {
    const client = mockServerClient([
      ACTIVE_ADMIN,
      { data: { role: "editor", is_active: true }, error: null },
      { data: { id: EDITOR_ID }, error: null },
    ]);

    await expect(toggleEditorActive(EDITOR_ID)).resolves.toEqual({
      success: true,
    });
    const [update] = findQueries(client, "profiles", "update");
    expect(argsOf(update, "update")).toEqual([{ is_active: false }]);
    const filters = update.calls
      .filter((call) => call.method === "eq")
      .map((call) => call.args);
    expect(filters).toEqual([
      ["id", EDITOR_ID],
      ["role", "editor"],
    ]);
  });

  it("devolve erro quando o update não atinge nenhum editor", async () => {
    mockServerClient([
      ACTIVE_ADMIN,
      { data: { role: "editor", is_active: true }, error: null },
      { data: null, error: NO_ROWS_ERROR },
    ]);

    await expect(toggleEditorActive(EDITOR_ID)).resolves.toEqual({
      error: EDITOR_NOT_FOUND_MESSAGE,
    });
  });

  it("mostra o erro original quando o update falha por outro motivo", async () => {
    mockServerClient([
      ACTIVE_ADMIN,
      { data: { role: "editor", is_active: true }, error: null },
      { data: null, error: { message: "fetch failed" } },
    ]);

    await expect(toggleEditorActive(EDITOR_ID)).resolves.toEqual({
      error: "fetch failed",
    });
  });

  it("para sem gravar quando a leitura do alvo falha", async () => {
    const client = mockServerClient([
      ACTIVE_ADMIN,
      { data: null, error: { message: "fetch failed" } },
    ]);

    await expect(toggleEditorActive(EDITOR_ID)).resolves.toEqual({
      error: "fetch failed",
    });
    expect(findQueries(client, "profiles", "update")).toEqual([]);
  });

  it("não deixa admin desativado alternar status", async () => {
    const client = mockServerClient([
      { data: { role: "admin", is_active: false }, error: null },
    ]);

    await expect(toggleEditorActive(EDITOR_ID)).resolves.toEqual({
      error: "Acesso negado",
    });
    expect(client.queries).toHaveLength(1);
  });

  it("recusa ID que não é UUID sem consultar o alvo", async () => {
    const client = mockServerClient([ACTIVE_ADMIN]);

    await expect(toggleEditorActive("abc")).resolves.toEqual({
      error: "Editor inválido",
    });
    expect(client.queries).toHaveLength(1);
  });

  it("recusa um admin como alvo, inclusive o próprio", async () => {
    const client = mockServerClient([
      ACTIVE_ADMIN,
      { data: { role: "admin", is_active: true }, error: null },
    ]);

    await expect(toggleEditorActive(ADMIN_ID)).resolves.toEqual({
      error: EDITOR_NOT_FOUND_MESSAGE,
    });
    expect(findQueries(client, "profiles", "update")).toEqual([]);
  });

  it("recusa perfil inexistente", async () => {
    mockServerClient([ACTIVE_ADMIN, OK]);

    await expect(toggleEditorActive(EDITOR_ID)).resolves.toEqual({
      error: EDITOR_NOT_FOUND_MESSAGE,
    });
  });
});

describe("updateEditorChurches", () => {
  it("adiciona e remove vínculos de um editor", async () => {
    const client = mockServerClient(
      [ACTIVE_ADMIN, { data: { role: "editor", is_active: true }, error: null }],
      {
        editor_churches: [
          { data: [{ church_id: CHURCH_A }], error: null },
          OK,
          OK,
        ],
      },
    );

    await expect(
      updateEditorChurches(EDITOR_ID, [CHURCH_B, CHURCH_B]),
    ).resolves.toEqual({ success: true });

    const [insert] = findQueries(client, "editor_churches", "insert");
    expect(argsOf(insert, "insert")).toEqual([
      [{ editor_id: EDITOR_ID, church_id: CHURCH_B }],
    ]);
    const [remove] = findQueries(client, "editor_churches", "delete");
    expect(argsOf(remove, "in")).toEqual(["church_id", [CHURCH_A]]);
  });

  it("recusa um admin como alvo", async () => {
    const client = mockServerClient([
      ACTIVE_ADMIN,
      { data: { role: "admin", is_active: true }, error: null },
    ]);

    await expect(updateEditorChurches(ADMIN_ID, [CHURCH_A])).resolves.toEqual({
      error: EDITOR_NOT_FOUND_MESSAGE,
    });
    expect(client.queries.map((query) => query.table)).toEqual([
      "profiles",
      "profiles",
    ]);
  });

  it("para sem tocar nos vínculos quando a leitura do alvo falha", async () => {
    const client = mockServerClient([
      ACTIVE_ADMIN,
      { data: null, error: { message: "fetch failed" } },
    ]);

    await expect(updateEditorChurches(EDITOR_ID, [CHURCH_A])).resolves.toEqual({
      error: "fetch failed",
    });
    expect(client.queries.map((query) => query.table)).toEqual([
      "profiles",
      "profiles",
    ]);
  });

  it("recusa igreja ou editor inválidos", async () => {
    mockServerClient([ACTIVE_ADMIN]);
    await expect(updateEditorChurches(EDITOR_ID, ["abc"])).resolves.toEqual({
      error: "Igreja inválida",
    });

    mockServerClient([ACTIVE_ADMIN]);
    await expect(updateEditorChurches("abc", [CHURCH_A])).resolves.toEqual({
      error: "Editor inválido",
    });
  });
});
