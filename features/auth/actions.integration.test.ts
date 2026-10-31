// @vitest-environment node
import { createClient } from "@/lib/supabase/server";
import {
  createFakeAuthClient,
  type FakeAuthClientOptions,
} from "@/tests/fixtures/supabase-auth";
import { redirect } from "next/navigation";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  INACTIVE_PROFILE_MESSAGE,
  PROFILE_UNAVAILABLE_MESSAGE,
  SIGN_OUT_FAILED_HINT,
} from "./access";
import { login } from "./actions";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("next/navigation", () => ({
  // O redirect real lança para interromper a action; o simulado também.
  redirect: vi.fn((path: string) => {
    throw new Error(`NEXT_REDIRECT:${path}`);
  }),
}));

const USER_ID = "5d2e8f1a-3c4b-4a6d-8e9f-7b1c2d3e4f5a";

function mockServerClient(options: FakeAuthClientOptions) {
  const client = createFakeAuthClient(options);
  vi.mocked(createClient).mockResolvedValue(
    client as unknown as Awaited<ReturnType<typeof createClient>>,
  );
  return client;
}

function credentials(): FormData {
  const formData = new FormData();
  formData.set("email", "editor@example.com");
  formData.set("password", "senha-segura");
  return formData;
}

function profile(role: "admin" | "editor", isActive: boolean) {
  return { profiles: { data: { role, is_active: isActive }, error: null } };
}

describe("login (Server Action)", () => {
  beforeEach(() => {
    vi.mocked(createClient).mockReset();
    vi.mocked(redirect).mockClear();
  });

  it("recusa credenciais inválidas sem consultar o perfil", async () => {
    const client = mockServerClient({
      signInError: { message: "Invalid login credentials" },
    });

    await expect(login(credentials())).resolves.toEqual({
      error: "Email ou senha inválidos",
    });
    expect(client.queries).toEqual([]);
  });

  it("leva o admin ativo para /admin", async () => {
    mockServerClient({ user: { id: USER_ID }, tables: profile("admin", true) });

    await expect(login(credentials())).rejects.toThrow("NEXT_REDIRECT:/admin");
  });

  it("leva o editor ativo para a home", async () => {
    const client = mockServerClient({
      user: { id: USER_ID },
      tables: profile("editor", true),
    });

    await expect(login(credentials())).rejects.toThrow("NEXT_REDIRECT:/");
    expect(client.auth.signOut).not.toHaveBeenCalled();
  });

  it("recusa o editor desativado e encerra a sessão aberta pelo login", async () => {
    const client = mockServerClient({
      user: { id: USER_ID },
      tables: profile("editor", false),
    });

    await expect(login(credentials())).resolves.toEqual({
      error: INACTIVE_PROFILE_MESSAGE,
    });
    // Perfil desativado: derruba as sessões de todos os dispositivos.
    expect(client.auth.signOut).toHaveBeenCalledExactlyOnceWith({
      scope: "global",
    });
    expect(redirect).not.toHaveBeenCalled();
  });

  it("recusa o admin desativado", async () => {
    const client = mockServerClient({
      user: { id: USER_ID },
      tables: profile("admin", false),
    });

    await expect(login(credentials())).resolves.toEqual({
      error: INACTIVE_PROFILE_MESSAGE,
    });
    expect(client.auth.signOut).toHaveBeenCalledTimes(1);
  });

  it("recusa e encerra a sessão quando o perfil não carrega", async () => {
    const client = mockServerClient({
      user: { id: USER_ID },
      tables: {
        profiles: { data: null, error: { message: "fetch failed" } },
      },
    });

    await expect(login(credentials())).resolves.toEqual({
      error: PROFILE_UNAVAILABLE_MESSAGE,
    });
    // Falha passageira na leitura: encerra só esta sessão.
    expect(client.auth.signOut).toHaveBeenCalledExactlyOnceWith({
      scope: "local",
    });
  });

  it("avisa quando não consegue encerrar a sessão do perfil recusado", async () => {
    mockServerClient({
      user: { id: USER_ID },
      tables: profile("editor", false),
      signOutError: { message: "fetch failed" },
    });

    await expect(login(credentials())).resolves.toEqual({
      error: `${INACTIVE_PROFILE_MESSAGE} ${SIGN_OUT_FAILED_HINT}`,
    });
    expect(redirect).not.toHaveBeenCalled();
  });
});
