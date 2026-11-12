import { AuthProvider } from "@/features/auth/auth-provider";
import { createClient } from "@/lib/supabase/client";
import { getChurchBySlug } from "@/lib/supabase/queries";
import {
  createFakeSupabaseClient,
  type FakeSupabaseOptions,
} from "@/tests/fixtures/supabase";
import type { Church } from "@/types";
import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ChurchDetailPage from "./page";

/**
 * Fiação dos tipos de dado na página real (VF-104): garante que cada seção
 * declara o `kind` certo. Só o `tsc` exige que a prop exista; um `kind` trocado
 * por outro válido passaria em tudo, e é justamente o que quebraria a D3/D15.
 */

vi.mock("@/lib/supabase/queries", () => ({
  getChurchBySlug: vi.fn(),
  getChurchSlugs: vi.fn(),
}));
vi.mock("@/lib/supabase/client", () => ({ createClient: vi.fn() }));
vi.mock("next/navigation", () => ({
  usePathname: () => "/igreja/sao-paulo-apostolo",
  notFound: () => {
    throw new Error("notFound");
  },
}));

const USER_ID = "5d2e8f1a-3c4b-4a6d-8e9f-7b1c2d3e4f5a";
const CHURCH_ID = "3f1c2b7e-8d4a-4f6b-9a2c-1e5d7f8a9b0c";
const SLUG = "sao-paulo-apostolo";

/** Igreja com todas as seções vazias: os "Adicionar" revelam cada `kind`. */
const EMPTY_CHURCH: Church = {
  id: CHURCH_ID,
  name: "Paróquia São Paulo Apóstolo",
  slug: SLUG,
  address: "Rua das Flores, 100",
  district: "Farol",
};

/** Rótulo do "Adicionar" de cada seção, como a página o escreve. */
const ADD_CONTACT = "Adicionar contato";
const ADD_CLERGY = "Adicionar clérigo";
const ADD_SCHEDULE = "Adicionar horários";
const ADD_MINISTRY = "Adicionar ministério";

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

async function renderPage() {
  const page = await ChurchDetailPage({
    params: Promise.resolve({ slug: SLUG }),
  });
  render(<AuthProvider>{page}</AuthProvider>);
}

/** O lápis da seção fica dentro do próprio título. */
function pencilInHeading(name: RegExp, level: 1 | 2) {
  return screen
    .getByRole("heading", { level, name })
    .querySelector("button[title='Editar']");
}

describe("página da igreja: tipo de dado por seção (D3, D15)", () => {
  beforeEach(() => {
    vi.mocked(createClient).mockReset();
    vi.mocked(getChurchBySlug).mockResolvedValue(EMPTY_CHURCH);
    vi.spyOn(console, "error").mockImplementation(() => {});
    document.cookie = "sb-exemplo-auth-token=fake";
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.cookie = `sb-exemplo-auth-token=;expires=${new Date(0).toUTCString()}`;
  });

  it("editor vinculado edita contato, horários e ministérios, mas não o clero", async () => {
    mockBrowserClient({
      user: { id: USER_ID },
      responses: {
        profiles: profileRow("editor"),
        editor_churches: { data: [{ church_id: CHURCH_ID }], error: null },
      },
    });
    await renderPage();

    expect(await screen.findByText(ADD_CONTACT)).toBeInTheDocument();
    expect(screen.getByText(ADD_SCHEDULE)).toBeInTheDocument();
    expect(screen.getByText(ADD_MINISTRY)).toBeInTheDocument();

    // Clero é só do admin (D15): nem "Adicionar", nem lápis.
    expect(screen.queryByText(ADD_CLERGY)).not.toBeInTheDocument();
    expect(pencilInHeading(/^Clero/, 2)).toBeNull();
    // Identidade da igreja (nome) também é só do admin (D3).
    expect(pencilInHeading(/Paróquia São Paulo Apóstolo/, 1)).toBeNull();
    // Contraprova: onde ele pode editar, o lápis está lá.
    expect(pencilInHeading(/^Contato/, 2)).not.toBeNull();
  });

  it("admin edita todas as seções, inclusive nome e clero", async () => {
    mockBrowserClient({
      user: { id: USER_ID },
      responses: { profiles: profileRow("admin") },
    });
    await renderPage();

    expect(await screen.findByText(ADD_CLERGY)).toBeInTheDocument();
    for (const label of [ADD_CONTACT, ADD_SCHEDULE, ADD_MINISTRY]) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
    expect(pencilInHeading(/Paróquia São Paulo Apóstolo/, 1)).not.toBeNull();
    expect(pencilInHeading(/^Clero/, 2)).not.toBeNull();
  });

  it("visitante não vê nenhum controle de edição", async () => {
    document.cookie = `sb-exemplo-auth-token=;expires=${new Date(0).toUTCString()}`;
    await renderPage();

    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: /Paróquia São Paulo Apóstolo/,
      }),
    ).toBeInTheDocument();
    for (const label of [ADD_CONTACT, ADD_CLERGY, ADD_SCHEDULE, ADD_MINISTRY]) {
      expect(screen.queryByText(label)).not.toBeInTheDocument();
    }
    expect(screen.queryAllByTitle("Editar")).toHaveLength(0);
    expect(vi.mocked(createClient)).not.toHaveBeenCalled();
  });
});
