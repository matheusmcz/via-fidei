import { AuthProvider } from "@/features/auth/auth-provider";
import type { ChurchDataKind } from "@/features/auth/types";
import {
  createFakeSupabaseClient,
  type FakeSupabaseOptions,
} from "@/tests/fixtures/supabase";
import { createClient } from "@/lib/supabase/client";
import { render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EditableSection } from "./editable-section";
import { EditIndicator } from "./edit-indicator";

vi.mock("@/lib/supabase/client", () => ({ createClient: vi.fn() }));
vi.mock("next/navigation", () => ({ usePathname: () => "/igreja/exemplo" }));

const USER_ID = "5d2e8f1a-3c4b-4a6d-8e9f-7b1c2d3e4f5a";
const CHURCH = "3f1c2b7e-8d4a-4f6b-9a2c-1e5d7f8a9b0c";

/** Rótulo em português de cada tipo de dado, só para achar a seção no teste. */
const KIND_LABELS: Record<ChurchDataKind, string> = {
  identity: "identidade",
  contact: "contato",
  schedule: "horários",
  ministries: "ministérios",
  clergy: "clero",
};

const KINDS = Object.keys(KIND_LABELS) as ChurchDataKind[];

/** Tipos que a D3/D11/D14 dão ao editor vinculado. */
const EDITOR_KINDS: ChurchDataKind[] = ["contact", "schedule", "ministries"];
/** Tipos só do admin (D3 e D15). */
const ADMIN_ONLY_KINDS: ChurchDataKind[] = ["identity", "clergy"];

function mockBrowserClient(options: FakeSupabaseOptions) {
  const client = createFakeSupabaseClient(options);
  vi.mocked(createClient).mockReturnValue(
    client as unknown as ReturnType<typeof createClient>,
  );
  return client;
}

function profileRow(role: "admin" | "editor") {
  return {
    data: {
      id: USER_ID,
      name: "Maria",
      email: "maria@example.com",
      role,
      is_active: true,
      created_at: "2026-10-01T00:00:00Z",
      updated_at: "2026-10-01T00:00:00Z",
    },
    error: null,
  };
}

/**
 * Uma seção por tipo de dado, cada uma com os dois controles de edição
 * (lápis e "Adicionar"), para conferir quem vê o quê em um render só.
 */
function ChurchSections() {
  return (
    <>
      {KINDS.map((kind) => (
        <section key={kind} aria-label={KIND_LABELS[kind]}>
          <EditIndicator churchId={CHURCH} kind={kind} />
          <EditableSection
            churchId={CHURCH}
            kind={kind}
            hasContent={false}
            emptyMessage={`Nada em ${KIND_LABELS[kind]}.`}
            addLabel={`Adicionar ${KIND_LABELS[kind]}`}
          >
            <p>conteúdo</p>
          </EditableSection>
        </section>
      ))}
    </>
  );
}

function renderSections() {
  render(
    <AuthProvider>
      <ChurchSections />
    </AuthProvider>,
  );
}

function section(kind: ChurchDataKind) {
  return within(screen.getByRole("region", { name: KIND_LABELS[kind] }));
}

describe("controles de edição na página da igreja (D3, D15)", () => {
  beforeEach(() => {
    vi.mocked(createClient).mockReset();
    vi.spyOn(console, "error").mockImplementation(() => {});
    document.cookie = "sb-exemplo-auth-token=fake";
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.cookie = `sb-exemplo-auth-token=;expires=${new Date(0).toUTCString()}`;
  });

  it("editor vinculado edita contato, horários e ministérios", async () => {
    mockBrowserClient({
      user: { id: USER_ID },
      responses: {
        profiles: profileRow("editor"),
        editor_churches: { data: [{ church_id: CHURCH }], error: null },
      },
    });
    renderSections();

    expect(
      await screen.findByRole("button", { name: "Adicionar contato" }),
    ).toBeInTheDocument();

    for (const kind of EDITOR_KINDS) {
      expect(section(kind).getByTitle("Editar")).toBeInTheDocument();
      expect(
        section(kind).getByRole("button", {
          name: `Adicionar ${KIND_LABELS[kind]}`,
        }),
      ).toBeInTheDocument();
    }
  });

  it("editor vinculado vê identidade e clero como o visitante", async () => {
    mockBrowserClient({
      user: { id: USER_ID },
      responses: {
        profiles: profileRow("editor"),
        editor_churches: { data: [{ church_id: CHURCH }], error: null },
      },
    });
    renderSections();

    // Espera o carregamento terminar por um controle que ele deve ver.
    await screen.findByRole("button", { name: "Adicionar contato" });

    for (const kind of ADMIN_ONLY_KINDS) {
      expect(section(kind).queryByTitle("Editar")).not.toBeInTheDocument();
      expect(
        section(kind).queryByRole("button", {
          name: `Adicionar ${KIND_LABELS[kind]}`,
        }),
      ).not.toBeInTheDocument();
      expect(section(kind)).toBeTruthy();
    }
  });

  it("admin vê o lápis e o 'Adicionar' em todas as seções", async () => {
    mockBrowserClient({
      user: { id: USER_ID },
      responses: { profiles: profileRow("admin") },
    });
    renderSections();

    expect(
      await screen.findByRole("button", { name: "Adicionar clero" }),
    ).toBeInTheDocument();

    for (const kind of KINDS) {
      expect(section(kind).getByTitle("Editar")).toBeInTheDocument();
      expect(
        section(kind).getByRole("button", {
          name: `Adicionar ${KIND_LABELS[kind]}`,
        }),
      ).toBeInTheDocument();
    }
  });

  it("visitante anônimo não vê controle nenhum", async () => {
    document.cookie = `sb-exemplo-auth-token=;expires=${new Date(0).toUTCString()}`;
    renderSections();

    // Sem sessão o provider não carrega nada; o estado final é "sem permissão".
    await vi.waitFor(() => {
      expect(screen.queryAllByTitle("Editar")).toHaveLength(0);
    });
    expect(screen.queryAllByRole("button")).toHaveLength(0);
    expect(vi.mocked(createClient)).not.toHaveBeenCalled();
  });
});
