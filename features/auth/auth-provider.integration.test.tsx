import { createClient } from "@/lib/supabase/client";
import {
  createFakeSupabaseClient,
  type FakeAuthListener,
  type FakeSupabaseClient,
  type FakeSupabaseOptions,
} from "@/tests/fixtures/supabase";
import { act, render, screen } from "@testing-library/react";
import { StrictMode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "./auth-provider";
import { useAuth } from "./use-auth";

vi.mock("@/lib/supabase/client", () => ({ createClient: vi.fn() }));
// A rota é mutável: o provider volta a procurar a sessão a cada navegação.
const nav = vi.hoisted(() => ({ pathname: "/igreja/exemplo" }));
vi.mock("next/navigation", () => ({ usePathname: () => nav.pathname }));

const USER_ID = "5d2e8f1a-3c4b-4a6d-8e9f-7b1c2d3e4f5a";
const LINKED_CHURCH = "3f1c2b7e-8d4a-4f6b-9a2c-1e5d7f8a9b0c";
const SESSION = { user: { id: USER_ID } };

/** Cookie de sessão do `@supabase/ssr`: sem ele o provider nem baixa o cliente. */
function signInCookie() {
  document.cookie = "sb-exemplo-auth-token=fake";
}

function clearCookies() {
  for (const cookie of document.cookie.split(";")) {
    document.cookie = `${cookie.split("=")[0]}=;expires=${new Date(0).toUTCString()}`;
  }
}

function mockBrowserClient(options: FakeSupabaseOptions) {
  const client = createFakeSupabaseClient(options);
  vi.mocked(createClient).mockReturnValue(
    client as unknown as ReturnType<typeof createClient>,
  );
  return client;
}

/** Ouvinte que o provider registrou, para o teste disparar os eventos. */
function authListener(client: FakeSupabaseClient): FakeAuthListener {
  const [listener] = client.auth.onAuthStateChange.mock.calls[0];
  return listener;
}

function profileRow(role: "admin" | "editor", isActive: boolean) {
  return {
    data: {
      id: USER_ID,
      name: "Maria",
      email: "maria@example.com",
      role,
      is_active: isActive,
      created_at: "2026-10-01T00:00:00Z",
      updated_at: "2026-10-01T00:00:00Z",
    },
    error: null,
  };
}

/** Editor ativo vinculado a `LINKED_CHURCH`: duas consultas por carregamento. */
function linkedEditor(): FakeSupabaseOptions {
  return {
    user: { id: USER_ID },
    responses: {
      profiles: profileRow("editor", true),
      editor_churches: { data: [{ church_id: LINKED_CHURCH }], error: null },
    },
  };
}

function AuthProbe() {
  const { isLoading, isAuthenticated, isAdmin, canEditChurchData } = useAuth();
  if (isLoading) return <p>carregando</p>;
  return (
    <ul>
      <li>autenticado: {String(isAuthenticated)}</li>
      <li>admin: {String(isAdmin)}</li>
      <li>
        contato: {String(canEditChurchData(LINKED_CHURCH, "contact"))}
      </li>
      <li>
        identidade: {String(canEditChurchData(LINKED_CHURCH, "identity"))}
      </li>
      <li>clero: {String(canEditChurchData(LINKED_CHURCH, "clergy"))}</li>
    </ul>
  );
}

function renderProvider() {
  return render(
    <AuthProvider>
      <AuthProbe />
    </AuthProvider>,
  );
}

describe("AuthProvider", () => {
  beforeEach(() => {
    vi.mocked(createClient).mockReset();
    vi.spyOn(console, "error").mockImplementation(() => {});
    nav.pathname = "/igreja/exemplo";
    signInCookie();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    clearCookies();
  });

  it("dá permissão ao editor ativo nos dados da igreja vinculada", async () => {
    const client = mockBrowserClient(linkedEditor());
    renderProvider();

    expect(await screen.findByText("contato: true")).toBeInTheDocument();
    expect(screen.getByText("autenticado: true")).toBeInTheDocument();
    expect(client.auth.signOut).not.toHaveBeenCalled();
  });

  it("esconde identidade e clero do editor vinculado (D3, D15)", async () => {
    mockBrowserClient(linkedEditor());
    renderProvider();

    expect(await screen.findByText("identidade: false")).toBeInTheDocument();
    expect(screen.getByText("clero: false")).toBeInTheDocument();
  });

  it("não dá permissão ao editor desativado e encerra a sessão", async () => {
    const client = mockBrowserClient({
      user: { id: USER_ID },
      responses: { profiles: profileRow("editor", false) },
    });
    renderProvider();

    expect(await screen.findByText("contato: false")).toBeInTheDocument();
    expect(screen.getByText("autenticado: false")).toBeInTheDocument();
    expect(client.auth.signOut).toHaveBeenCalledTimes(1);
    // Perfil inativo nem chega a consultar os vínculos.
    expect(client.tables).toEqual(["profiles"]);
  });

  it("não trata admin desativado como admin", async () => {
    const client = mockBrowserClient({
      user: { id: USER_ID },
      responses: { profiles: profileRow("admin", false) },
    });
    renderProvider();

    expect(await screen.findByText("admin: false")).toBeInTheDocument();
    expect(screen.getByText("contato: false")).toBeInTheDocument();
    expect(client.auth.signOut).toHaveBeenCalledTimes(1);
  });

  it("admin ativo edita todo tipo de dado de qualquer igreja", async () => {
    mockBrowserClient({
      user: { id: USER_ID },
      responses: { profiles: profileRow("admin", true) },
    });
    renderProvider();

    expect(await screen.findByText("admin: true")).toBeInTheDocument();
    expect(screen.getByText("identidade: true")).toBeInTheDocument();
    expect(screen.getByText("clero: true")).toBeInTheDocument();
  });

  it("visitante anônimo nem cria o cliente do Supabase (VF-085)", async () => {
    clearCookies();
    renderProvider();

    expect(await screen.findByText("contato: false")).toBeInTheDocument();
    expect(screen.getByText("autenticado: false")).toBeInTheDocument();
    expect(vi.mocked(createClient)).not.toHaveBeenCalled();
  });

  it("encontra a sessão aberta depois da montagem (login em outra rota)", async () => {
    clearCookies();
    const client = mockBrowserClient(linkedEditor());
    const { rerender } = renderProvider();

    expect(await screen.findByText("autenticado: false")).toBeInTheDocument();
    expect(vi.mocked(createClient)).not.toHaveBeenCalled();

    // O login grava o cookie e o Next navega sem remontar o layout raiz.
    signInCookie();
    nav.pathname = "/";
    rerender(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>,
    );

    expect(await screen.findByText("contato: true")).toBeInTheDocument();
    expect(client.tables).toEqual(["profiles", "editor_churches"]);
  });

  it("cookie sem sessão válida não autentica ninguém", async () => {
    const client = mockBrowserClient({ user: null });
    renderProvider();

    expect(await screen.findByText("autenticado: false")).toBeInTheDocument();
    expect(client.tables).toEqual([]);
  });

  it("carrega o perfil uma vez só: INITIAL_SESSION e TOKEN_REFRESHED não recarregam (VF-085)", async () => {
    const client = mockBrowserClient(linkedEditor());
    renderProvider();

    expect(await screen.findByText("contato: true")).toBeInTheDocument();
    expect(client.tables).toEqual(["profiles", "editor_churches"]);

    await act(async () => {
      authListener(client)("INITIAL_SESSION", SESSION);
      authListener(client)("TOKEN_REFRESHED", SESSION);
    });

    expect(client.tables).toEqual(["profiles", "editor_churches"]);
  });

  it("recarrega o perfil quando entra outro usuário (SIGNED_IN)", async () => {
    const client = mockBrowserClient(linkedEditor());
    renderProvider();

    expect(await screen.findByText("contato: true")).toBeInTheDocument();

    await act(async () => {
      authListener(client)("SIGNED_IN", SESSION);
    });

    expect(client.tables).toEqual([
      "profiles",
      "editor_churches",
      "profiles",
      "editor_churches",
    ]);
  });

  it("tira a permissão no SIGNED_OUT, sem consultar o perfil de novo", async () => {
    const client = mockBrowserClient(linkedEditor());
    renderProvider();

    expect(await screen.findByText("contato: true")).toBeInTheDocument();

    await act(async () => {
      authListener(client)("SIGNED_OUT", null);
    });

    expect(screen.getByText("autenticado: false")).toBeInTheDocument();
    expect(screen.getByText("contato: false")).toBeInTheDocument();
    expect(client.tables).toEqual(["profiles", "editor_churches"]);
  });

  it("sobrevive ao efeito duplo do StrictMode sem carregar duas vezes", async () => {
    const client = mockBrowserClient(linkedEditor());
    render(
      <StrictMode>
        <AuthProvider>
          <AuthProbe />
        </AuthProvider>
      </StrictMode>,
    );

    expect(await screen.findByText("contato: true")).toBeInTheDocument();
    expect(client.tables).toEqual(["profiles", "editor_churches"]);
  });

  it("logout durante um carregamento em voo vence a resposta atrasada", async () => {
    const client = mockBrowserClient(linkedEditor());
    renderProvider();

    expect(await screen.findByText("contato: true")).toBeInTheDocument();

    await act(async () => {
      // O recarregamento para no primeiro `await`; o logout chega antes da
      // resposta e não pode ser desfeito por ela.
      authListener(client)("SIGNED_IN", SESSION);
      authListener(client)("SIGNED_OUT", null);
    });

    expect(screen.getByText("autenticado: false")).toBeInTheDocument();
    expect(screen.getByText("contato: false")).toBeInTheDocument();
  });

  it("falha de rede deixa a UI como visitante e registra o erro", async () => {
    mockBrowserClient({
      user: { id: USER_ID },
      responses: { profiles: { reject: new TypeError("fetch failed") } },
    });
    renderProvider();

    expect(await screen.findByText("autenticado: false")).toBeInTheDocument();
    expect(screen.getByText("contato: false")).toBeInTheDocument();
    const logged = vi.mocked(console.error).mock.calls.flat().join(" ");
    expect(logged).toContain("fetch failed");
  });
});
