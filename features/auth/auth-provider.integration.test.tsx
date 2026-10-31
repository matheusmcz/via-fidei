import { createClient } from "@/lib/supabase/client";
import {
  createFakeAuthClient,
  type FakeAuthClientOptions,
} from "@/tests/fixtures/supabase-auth";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "./auth-provider";
import { useAuth } from "./use-auth";

vi.mock("@/lib/supabase/client", () => ({ createClient: vi.fn() }));

const USER_ID = "5d2e8f1a-3c4b-4a6d-8e9f-7b1c2d3e4f5a";
const LINKED_CHURCH = "3f1c2b7e-8d4a-4f6b-9a2c-1e5d7f8a9b0c";

function mockBrowserClient(options: FakeAuthClientOptions) {
  const client = createFakeAuthClient(options);
  vi.mocked(createClient).mockReturnValue(
    client as unknown as ReturnType<typeof createClient>,
  );
  return client;
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

function AuthProbe() {
  const { isLoading, isAuthenticated, isAdmin, canEditChurch } = useAuth();
  if (isLoading) return <p>carregando</p>;
  return (
    <ul>
      <li>autenticado: {String(isAuthenticated)}</li>
      <li>admin: {String(isAdmin)}</li>
      <li>edita vinculada: {String(canEditChurch(LINKED_CHURCH))}</li>
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
  });

  it("dá permissão ao editor ativo na igreja vinculada", async () => {
    const client = mockBrowserClient({
      user: { id: USER_ID },
      tables: {
        profiles: profileRow("editor", true),
        editor_churches: { data: [{ church_id: LINKED_CHURCH }], error: null },
      },
    });
    renderProvider();

    expect(await screen.findByText("edita vinculada: true")).toBeInTheDocument();
    expect(screen.getByText("autenticado: true")).toBeInTheDocument();
    expect(client.auth.signOut).not.toHaveBeenCalled();
  });

  it("não dá permissão ao editor desativado e encerra a sessão", async () => {
    const client = mockBrowserClient({
      user: { id: USER_ID },
      tables: {
        profiles: profileRow("editor", false),
        editor_churches: { data: [{ church_id: LINKED_CHURCH }], error: null },
      },
    });
    renderProvider();

    expect(
      await screen.findByText("edita vinculada: false"),
    ).toBeInTheDocument();
    expect(screen.getByText("autenticado: false")).toBeInTheDocument();
    expect(client.auth.signOut).toHaveBeenCalledTimes(1);
  });

  it("não trata admin desativado como admin", async () => {
    const client = mockBrowserClient({
      user: { id: USER_ID },
      tables: { profiles: profileRow("admin", false) },
    });
    renderProvider();

    expect(await screen.findByText("admin: false")).toBeInTheDocument();
    expect(screen.getByText("edita vinculada: false")).toBeInTheDocument();
    expect(client.auth.signOut).toHaveBeenCalledTimes(1);
  });

  it("admin ativo edita qualquer igreja", async () => {
    mockBrowserClient({
      user: { id: USER_ID },
      tables: { profiles: profileRow("admin", true) },
    });
    renderProvider();

    expect(await screen.findByText("admin: true")).toBeInTheDocument();
    expect(screen.getByText("edita vinculada: true")).toBeInTheDocument();
  });

  it("visitante não tem permissão", async () => {
    mockBrowserClient({ user: null });
    renderProvider();

    expect(
      await screen.findByText("edita vinculada: false"),
    ).toBeInTheDocument();
    expect(screen.getByText("autenticado: false")).toBeInTheDocument();
  });
});
