// @vitest-environment node
import { createPublicClient } from "@/lib/supabase/public";
import {
  callsTo,
  mockPublicClient,
  type FakeQueryResponse,
  type FakeQueryResult,
} from "@/tests/fixtures/supabase";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getChurchBySlug, getChurches, getChurchSlugs } from "./churches";

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

// --- getChurchBySlug ---------------------------------------------------------
//
// Os testes de comportamento olham só o que a função devolve ou lança (o
// `Church`, o `null` e os erros), sem depender de quantas consultas são feitas:
// o VF-084 vai consolidar tudo em uma consulta aninhada. Os filtros ficam no
// `describe` próprio, mais abaixo, para serem ajustados nessa refatoração.

const SLUG = "sao-paulo-apostolo";
// Id diferente do slug, para o filtro por `church_id` não passar por acaso.
const CHURCH_ID = "church-42";

const churchRow = {
  id: CHURCH_ID,
  name: "Paróquia São Paulo Apóstolo",
  slug: SLUG,
  address: "Rua Exemplo, 100",
  district: "Farol",
  ...emptyColumns,
};

const baseChurch = {
  id: CHURCH_ID,
  name: "Paróquia São Paulo Apóstolo",
  slug: SLUG,
  address: "Rua Exemplo, 100",
  district: "Farol",
};

const emptyScheduleColumns = {
  day_of_week: null,
  end_time: null,
  recurrence: null,
  notes: null,
};

const emptyClergyColumns = {
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
};

const scheduleEventRows = [
  {
    id: "e1",
    category: "mass",
    ...emptyScheduleColumns,
    day_of_week: 0,
    time: "07:00",
    notes: "Missa cantada",
  },
  {
    id: "e2",
    category: "adoration",
    ...emptyScheduleColumns,
    day_of_week: 4,
    time: "08:00",
    end_time: "12:00",
  },
  {
    id: "e3",
    category: "mass",
    ...emptyScheduleColumns,
    day_of_week: 6,
    time: "18:30",
  },
  {
    id: "e4",
    category: "confession",
    ...emptyScheduleColumns,
    time: "15:00",
    recurrence: "first-friday",
  },
];

const activityRows = [
  {
    id: "a1",
    name: "Terço dos Homens",
    description: "Na capela lateral",
    activity_schedules: [
      { ...emptyScheduleColumns, day_of_week: 1, time: "19:30" },
      {
        ...emptyScheduleColumns,
        time: "20:00",
        end_time: "21:00",
        recurrence: "monthly",
        notes: "Última segunda",
      },
    ],
  },
  { id: "a2", name: "Catequese", description: null, activity_schedules: [] },
];

const churchClergyRows = [
  {
    start_date: "2021",
    end_date: null,
    is_active: true,
    clergy: {
      id: "clergy-1",
      name: "Manoel José dos Santos",
      role: "parish-priest",
      ...emptyClergyColumns,
      title: "monsenhor",
      honors: ["vicar-general", "canon"],
      instagram: "@padre",
    },
  },
  {
    start_date: null,
    end_date: null,
    is_active: true,
    clergy: {
      id: "clergy-2",
      name: "Inácio Filho",
      role: "deacon",
      ...emptyClergyColumns,
    },
  },
];

const churchMinistryRows = [
  {
    ministries: {
      id: "m1",
      label: "Renovação Carismática Católica",
      acronym: "RCC",
      category: "group",
    },
  },
  {
    ministries: {
      id: "m2",
      label: "Pastoral Familiar",
      acronym: null,
      category: "pastoral",
    },
  },
  {
    ministries: {
      id: "m3",
      label: "Terço dos Homens",
      acronym: null,
      category: "group",
    },
  },
];

type ChurchTable =
  | "churches"
  | "schedule_events"
  | "activities"
  | "church_clergy"
  | "church_ministries";

function ok(data: unknown): FakeQueryResult {
  return { data, error: null };
}

/** Igreja encontrada e todas as seções preenchidas; sobrescreva por tabela. */
function mockChurchPage(
  overrides: Partial<Record<ChurchTable, FakeQueryResponse>> = {},
) {
  return mockPublicClient({
    churches: ok(churchRow),
    schedule_events: ok(scheduleEventRows),
    activities: ok(activityRows),
    church_clergy: ok(churchClergyRows),
    church_ministries: ok(churchMinistryRows),
    ...overrides,
  });
}

const RELATED_TABLES = [
  { table: "schedule_events", section: "horários" },
  { table: "activities", section: "atividades" },
  { table: "church_clergy", section: "clero" },
  { table: "church_ministries", section: "ministérios" },
] as const;

describe("getChurchBySlug (query)", () => {
  beforeEach(() => {
    vi.mocked(createPublicClient).mockReset();
  });

  describe("igreja inexistente", () => {
    it("devolve null quando nenhuma igreja tem o slug", async () => {
      mockChurchPage({ churches: ok(null) });
      await expect(getChurchBySlug("nao-existe")).resolves.toBeNull();
    });
  });

  describe("erros", () => {
    it("lança o erro da consulta da igreja, sem devolver null", async () => {
      mockChurchPage({
        churches: { data: null, error: { message: "permission denied" } },
      });
      await expect(getChurchBySlug(SLUG)).rejects.toMatchObject({
        message: "permission denied",
      });
    });

    // Documenta o caso real: sem `throwOnError`, o supabase-js captura o
    // `fetch` rejeitado e devolve a falha de rede em `error`.
    it("lança a falha de rede que o supabase-js devolve como `error`", async () => {
      mockChurchPage({
        churches: {
          data: null,
          error: { message: "TypeError: fetch failed" },
        },
      });
      await expect(getChurchBySlug(SLUG)).rejects.toMatchObject({
        message: "TypeError: fetch failed",
      });
    });

    it("lança quando o fetch da consulta da igreja é rejeitado", async () => {
      mockChurchPage({
        churches: { reject: new TypeError("fetch failed") },
      });
      await expect(getChurchBySlug(SLUG)).rejects.toThrow("fetch failed");
    });

    it.each(RELATED_TABLES)(
      "lança o erro quando só a consulta de $section falha",
      async ({ table, section }) => {
        mockChurchPage({
          [table]: { data: null, error: { message: `${section} indisponível` } },
        });
        await expect(getChurchBySlug(SLUG)).rejects.toMatchObject({
          message: `${section} indisponível`,
        });
      },
    );

    it.each(RELATED_TABLES)(
      "lança quando só o fetch de $section é rejeitado",
      async ({ table }) => {
        mockChurchPage({ [table]: { reject: new TypeError("fetch failed") } });
        await expect(getChurchBySlug(SLUG)).rejects.toThrow("fetch failed");
      },
    );
  });

  describe("caminho feliz", () => {
    it("monta a igreja completa a partir das linhas do banco", async () => {
      mockChurchPage({
        churches: ok({
          ...churchRow,
          image_url: "https://img/igreja.jpg",
          type: "parish",
          phone: "+558233334444",
          whatsapp: "+5582988887777",
          email: "secretaria@paroquia.org",
          instagram: "@avozdoapostolo",
          facebook: "paroquiasaopaulo",
          website: "https://paroquia.org",
          google_maps_url: "https://maps.google.com/?q=1",
        }),
      });

      await expect(getChurchBySlug(SLUG)).resolves.toEqual({
        ...baseChurch,
        imageUrl: "https://img/igreja.jpg",
        type: "parish",
        contact: {
          phone: "+558233334444",
          whatsapp: "+5582988887777",
          email: "secretaria@paroquia.org",
          instagram: "@avozdoapostolo",
          facebook: "paroquiasaopaulo",
          website: "https://paroquia.org",
        },
        googleMapsUrl: "https://maps.google.com/?q=1",
        masses: [
          { dayOfWeek: 0, time: "07:00", notes: "Missa cantada" },
          { dayOfWeek: 6, time: "18:30" },
        ],
        adorations: [{ dayOfWeek: 4, time: "08:00", endTime: "12:00" }],
        confessions: [{ time: "15:00", recurrence: "first-friday" }],
        activities: [
          {
            id: "a1",
            name: "Terço dos Homens",
            description: "Na capela lateral",
            schedule: [
              { dayOfWeek: 1, time: "19:30" },
              {
                time: "20:00",
                endTime: "21:00",
                recurrence: "monthly",
                notes: "Última segunda",
              },
            ],
          },
          { id: "a2", name: "Catequese", schedule: [] },
        ],
        clergy: [
          {
            id: "clergy-1",
            name: "Manoel José dos Santos",
            churchId: CHURCH_ID,
            role: "parish-priest",
            title: "monsenhor",
            honors: ["canon", "vicar-general"],
            startDate: "2021",
            socialLinks: { instagram: "@padre" },
          },
          {
            id: "clergy-2",
            name: "Inácio Filho",
            churchId: CHURCH_ID,
            role: "deacon",
          },
        ],
        ministries: {
          groups: [
            {
              id: "m1",
              label: "Renovação Carismática Católica",
              acronym: "RCC",
            },
            { id: "m3", label: "Terço dos Homens" },
          ],
          pastorals: [{ id: "m2", label: "Pastoral Familiar" }],
        },
      });
    });

    it("separa os horários por categoria e omite as categorias sem horário", async () => {
      mockChurchPage({
        schedule_events: ok([
          { id: "e1", category: "confession", ...emptyScheduleColumns, time: "09:00" },
          { id: "e2", category: "confession", ...emptyScheduleColumns, time: "16:00" },
        ]),
      });

      const church = await getChurchBySlug(SLUG);

      expect(church?.confessions).toEqual([{ time: "09:00" }, { time: "16:00" }]);
      expect(church).not.toHaveProperty("masses");
      expect(church).not.toHaveProperty("adorations");
    });

    // `endDate` separa o clero anterior do atual na página
    // (`getPastClergyMembers`), e `deathDate` marca o falecido. A consulta
    // não filtra por `is_active`: o vínculo encerrado também volta.
    it("mantém o vínculo encerrado com `endDate` e os dados opcionais do clérigo", async () => {
      mockChurchPage({
        church_clergy: ok([
          {
            start_date: "2010",
            end_date: "2015",
            is_active: false,
            clergy: {
              id: "clergy-3",
              name: "Antônio Ferreira",
              role: "vicar",
              ...emptyClergyColumns,
              title: "frei",
              suffix: "OFM",
              image_url: "https://img/frei.jpg",
              birth_date: "1940-03-15",
              death_date: "2019",
              bio: "Ordenado em 1966.",
              whatsapp: "+5582977776666",
              facebook: "frei.antonio",
            },
          },
        ]),
      });

      const church = await getChurchBySlug(SLUG);

      expect(church?.clergy).toEqual([
        {
          id: "clergy-3",
          name: "Antônio Ferreira",
          churchId: CHURCH_ID,
          role: "vicar",
          title: "frei",
          suffix: "OFM",
          imageUrl: "https://img/frei.jpg",
          birthDate: "1940-03-15",
          deathDate: "2019",
          startDate: "2010",
          endDate: "2015",
          bio: "Ordenado em 1966.",
          socialLinks: {
            whatsapp: "+5582977776666",
            facebook: "frei.antonio",
          },
        },
      ]);
    });

    it("põe o id da igreja em `churchId` de cada clérigo", async () => {
      mockChurchPage();

      const church = await getChurchBySlug(SLUG);

      expect(church?.clergy?.map((c) => c.churchId)).toEqual([
        CHURCH_ID,
        CHURCH_ID,
      ]);
    });

    it("agrupa os ministérios por categoria e omite as categorias vazias", async () => {
      mockChurchPage({
        church_ministries: ok([
          {
            ministries: {
              id: "m9",
              label: "Encontro de Casais com Cristo",
              acronym: "ECC",
              category: "movement",
            },
          },
        ]),
      });

      const church = await getChurchBySlug(SLUG);

      expect(church?.ministries).toEqual({
        movements: [
          { id: "m9", label: "Encontro de Casais com Cristo", acronym: "ECC" },
        ],
      });
    });

    it("omite todas as seções quando a igreja não tem nada cadastrado", async () => {
      mockChurchPage({
        schedule_events: ok([]),
        activities: ok([]),
        church_clergy: ok([]),
        church_ministries: ok([]),
      });

      await expect(getChurchBySlug(SLUG)).resolves.toEqual(baseChurch);
    });

    it("trata `data: null` sem erro como seção vazia", async () => {
      mockChurchPage({
        schedule_events: ok(null),
        activities: ok(null),
        church_clergy: ok(null),
        church_ministries: ok(null),
      });

      await expect(getChurchBySlug(SLUG)).resolves.toEqual(baseChurch);
    });
  });
});

// Filtros da consulta. Dependem da forma das consultas de hoje (uma em
// `churches` e quatro em paralelo); revisar no VF-084, quando passarem a ser
// uma consulta aninhada.
describe("getChurchBySlug: filtros da consulta (rever no VF-084)", () => {
  beforeEach(() => {
    vi.mocked(createPublicClient).mockReset();
  });

  it("busca a igreja pelo slug recebido", async () => {
    const client = mockChurchPage();
    await getChurchBySlug(SLUG);
    expect(callsTo(client, "churches", "eq")).toEqual([["slug", SLUG]]);
  });

  it.each(RELATED_TABLES)(
    "filtra $section ($table) pelo id da igreja encontrada",
    async ({ table }) => {
      const client = mockChurchPage();
      await getChurchBySlug(SLUG);
      expect(callsTo(client, table, "eq")).toEqual([["church_id", CHURCH_ID]]);
    },
  );

  it("não consulta as seções quando a igreja não existe", async () => {
    const client = mockChurchPage({ churches: ok(null) });
    await getChurchBySlug("nao-existe");
    expect(client.tables).toEqual(["churches"]);
  });
});
