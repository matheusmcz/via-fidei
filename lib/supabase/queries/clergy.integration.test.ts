// @vitest-environment node
import { createPublicClient } from "@/lib/supabase/public";
import {
  mockPublicClient,
  type FakeQueryResult,
} from "@/tests/fixtures/supabase";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getAllClergyWithChurch } from "./clergy";

vi.mock("@/lib/supabase/public", () => ({ createPublicClient: vi.fn() }));

function mockClergyTable(result: FakeQueryResult) {
  return mockPublicClient({ clergy: result });
}

const baseRow = {
  id: "clergy-1",
  name: "Manoel José dos Santos",
  role: "parish-priest",
  title: null,
  suffix: null,
  image_url: null,
  birth_date: null,
  death_date: null,
  honors: null,
  bio: null,
  whatsapp: null,
  instagram: null,
  facebook: null,
  church_clergy: [],
};

const saoPaulo = {
  id: "church-1",
  name: "Paróquia São Paulo Apóstolo",
  slug: "sao-paulo-apostolo",
};

describe("getAllClergyWithChurch (query)", () => {
  beforeEach(() => {
    vi.mocked(createPublicClient).mockReset();
  });

  it("consulta a tabela clergy", async () => {
    const client = mockClergyTable({ data: [], error: null });
    await getAllClergyWithChurch();
    expect(client.tables).toEqual(["clergy"]);
  });

  it("usa o vínculo ativo para a igreja e o período atual", async () => {
    mockClergyTable({
      data: [
        {
          ...baseRow,
          title: "padre",
          church_clergy: [
            {
              start_date: "2010",
              end_date: "2015",
              is_active: false,
              churches: { id: "old", name: "Antiga", slug: "antiga" },
            },
            {
              start_date: "2021",
              end_date: null,
              is_active: true,
              churches: saoPaulo,
            },
          ],
        },
      ],
      error: null,
    });

    const [clergy] = await getAllClergyWithChurch();

    expect(clergy).toEqual({
      id: "clergy-1",
      name: "Manoel José dos Santos",
      role: "parish-priest",
      title: "padre",
      churchId: "church-1",
      startDate: "2021",
      churchName: "Paróquia São Paulo Apóstolo",
      churchSlug: "sao-paulo-apostolo",
    });
  });

  it("não associa igreja a quem só tem vínculos encerrados", async () => {
    mockClergyTable({
      data: [
        {
          ...baseRow,
          church_clergy: [
            {
              start_date: "2010",
              end_date: "2015",
              is_active: false,
              churches: saoPaulo,
            },
          ],
        },
      ],
      error: null,
    });

    const [clergy] = await getAllClergyWithChurch();

    expect(clergy).not.toHaveProperty("churchId");
    expect(clergy).not.toHaveProperty("churchName");
    expect(clergy).not.toHaveProperty("endDate");
  });

  it("omite campos nulos e mapeia os opcionais preenchidos", async () => {
    mockClergyTable({
      data: [
        {
          ...baseRow,
          title: "monsenhor",
          suffix: "OFM",
          image_url: "https://img/1.jpg",
          birth_date: "1950-01-02",
          death_date: "2020",
          honors: ["vicar-general", "desconhecida", "canon"],
          bio: "Ordenado em 1975.",
          whatsapp: "+5582999990000",
          instagram: "@padre",
          facebook: null,
        },
      ],
      error: null,
    });

    const [clergy] = await getAllClergyWithChurch();

    expect(clergy).toEqual({
      id: "clergy-1",
      name: "Manoel José dos Santos",
      role: "parish-priest",
      title: "monsenhor",
      suffix: "OFM",
      imageUrl: "https://img/1.jpg",
      birthDate: "1950-01-02",
      deathDate: "2020",
      honors: ["canon", "vicar-general"],
      bio: "Ordenado em 1975.",
      socialLinks: { whatsapp: "+5582999990000", instagram: "@padre" },
    });
  });

  it("devolve lista vazia quando não há dados", async () => {
    mockClergyTable({ data: null, error: null });
    await expect(getAllClergyWithChurch()).resolves.toEqual([]);
  });

  it("propaga o erro do Supabase", async () => {
    mockClergyTable({ data: null, error: { message: "falha de rede" } });
    await expect(getAllClergyWithChurch()).rejects.toMatchObject({
      message: "falha de rede",
    });
  });
});
