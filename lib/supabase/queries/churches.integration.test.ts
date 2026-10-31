// @vitest-environment node
import { createPublicClient } from "@/lib/supabase/public";
import {
  mockPublicClient,
  type FakeQueryResult,
} from "@/tests/fixtures/supabase";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getChurches, getChurchSlugs } from "./churches";

// Só a listagem é coberta aqui. `getChurchBySlug` está sendo reescrita
// (tratamento de erro e número de consultas) e ganha testes junto com ela.

vi.mock("@/lib/supabase/public", () => ({ createPublicClient: vi.fn() }));

function mockChurchesTable(result: FakeQueryResult) {
  return mockPublicClient({ churches: result });
}

const emptyColumns = {
  image_url: null,
  type: null,
  phone: null,
  whatsapp: null,
  email: null,
  instagram: null,
  facebook: null,
  website: null,
  google_maps_url: null,
};

describe("getChurches (query)", () => {
  beforeEach(() => {
    vi.mocked(createPublicClient).mockReset();
  });

  it("mapeia a linha mínima sem criar campos vazios", async () => {
    mockChurchesTable({
      data: [
        {
          id: "c1",
          name: "Catedral Nossa Senhora dos Prazeres",
          slug: "catedral-nossa-senhora-dos-prazeres",
          address: "Praça Dom Pedro II",
          district: "Centro",
          ...emptyColumns,
        },
      ],
      error: null,
    });

    await expect(getChurches()).resolves.toEqual([
      {
        id: "c1",
        name: "Catedral Nossa Senhora dos Prazeres",
        slug: "catedral-nossa-senhora-dos-prazeres",
        address: "Praça Dom Pedro II",
        district: "Centro",
      },
    ]);
  });

  it("agrupa os contatos preenchidos em `contact` e converte snake_case", async () => {
    mockChurchesTable({
      data: [
        {
          id: "c2",
          name: "Paróquia São Paulo Apóstolo",
          slug: "sao-paulo-apostolo",
          address: "Rua Exemplo, 100",
          district: "Farol",
          ...emptyColumns,
          image_url: "https://img/igreja.jpg",
          type: "parish",
          phone: "+558233334444",
          instagram: "@avozdoapostolo",
          google_maps_url: "https://maps.google.com/?q=1",
        },
      ],
      error: null,
    });

    const [church] = await getChurches();

    expect(church).toMatchObject({
      imageUrl: "https://img/igreja.jpg",
      type: "parish",
      googleMapsUrl: "https://maps.google.com/?q=1",
      contact: { phone: "+558233334444", instagram: "@avozdoapostolo" },
    });
    expect(church.contact).not.toHaveProperty("whatsapp");
  });

  it("propaga o erro do Supabase", async () => {
    mockChurchesTable({ data: null, error: { message: "indisponível" } });
    await expect(getChurches()).rejects.toMatchObject({
      message: "indisponível",
    });
  });
});

describe("getChurchSlugs (query)", () => {
  it("devolve só os slugs", async () => {
    mockChurchesTable({
      data: [{ slug: "a" }, { slug: "b" }],
      error: null,
    });
    await expect(getChurchSlugs()).resolves.toEqual(["a", "b"]);
  });

  it("propaga o erro do Supabase", async () => {
    mockChurchesTable({ data: null, error: { message: "indisponível" } });
    await expect(getChurchSlugs()).rejects.toMatchObject({
      message: "indisponível",
    });
  });
});
