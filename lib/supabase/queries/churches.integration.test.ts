// @vitest-environment node
import { createPublicClient } from "@/lib/supabase/public";
import {
  callsTo,
  mockPublicClient,
  ok,
  type FakeQueryResponse,
  type FakeQueryResult,
} from "@/tests/fixtures/supabase";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getChurchBySlug,
  getChurches,
  getChurchSlugs,
  toChurch,
  type DbChurch,
} from "./churches";

vi.mock("@/lib/supabase/public", () => ({ createPublicClient: vi.fn() }));

// Registra as funções que passam pelo `cache()` do React, mantendo o `cache`
// real, para conferir que `getChurchBySlug` sai dele.
const cachedFunctions = vi.hoisted(() => new Set<unknown>());
vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  return {
    ...actual,
    cache: <T extends (...args: never[]) => unknown>(fn: T): T => {
      const cached = actual.cache(fn);
      cachedFunctions.add(cached);
      return cached;
    },
  };
});

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
// `Church`, o `null` e os erros). A forma da consulta (uma só, em `churches`,
// com as relações embutidas, VF-084) fica no `describe` próprio, mais abaixo.

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

type EmbeddedRelation =
  | "schedule_events"
  | "activities"
  | "church_clergy"
  | "church_ministries";

type ChurchPageOverrides = Partial<Record<EmbeddedRelation, unknown>> &
  Record<string, unknown>;

/**
 * Linha de `churches` como o PostgREST devolve a consulta aninhada: a igreja
 * com as relações embutidas, todas preenchidas. Sobrescreva coluna ou relação.
 */
function churchPageRow(overrides: ChurchPageOverrides = {}) {
  return {
    ...churchRow,
    schedule_events: scheduleEventRows,
    activities: activityRows,
    church_clergy: churchClergyRows,
    church_ministries: churchMinistryRows,
    ...overrides,
  };
}

/** Igreja encontrada com todas as seções preenchidas. */
function mockChurchPage(overrides: ChurchPageOverrides = {}) {
  return mockPublicClient({ churches: ok(churchPageRow(overrides)) });
}

/** Resposta crua da consulta da página (erro, rejeição, nenhuma linha). */
function mockChurchPageResponse(response: FakeQueryResponse) {
  return mockPublicClient({ churches: response });
}

const EMBEDDED_RELATIONS = [
  { relation: "schedule_events", section: "horários" },
  { relation: "activities", section: "atividades" },
  { relation: "church_clergy", section: "clero" },
  { relation: "church_ministries", section: "ministérios" },
] as const;

describe("getChurchBySlug (query)", () => {
  beforeEach(() => {
    vi.mocked(createPublicClient).mockReset();
  });

  describe("igreja inexistente", () => {
    it("devolve null quando nenhuma igreja tem o slug", async () => {
      mockChurchPageResponse(ok(null));
      await expect(getChurchBySlug("nao-existe")).resolves.toBeNull();
    });
  });

  describe("erros", () => {
    it("lança o erro da consulta da igreja, sem devolver null", async () => {
      mockChurchPageResponse({
        data: null,
        error: { message: "permission denied" },
      });
      await expect(getChurchBySlug(SLUG)).rejects.toMatchObject({
        message: "permission denied",
      });
    });

    // Documenta o caso real: sem `throwOnError`, o supabase-js captura o
    // `fetch` rejeitado e devolve a falha de rede em `error`.
    it("lança a falha de rede que o supabase-js devolve como `error`", async () => {
      mockChurchPageResponse({
        data: null,
        error: { message: "TypeError: fetch failed" },
      });
      await expect(getChurchBySlug(SLUG)).rejects.toMatchObject({
        message: "TypeError: fetch failed",
      });
    });

    it("lança quando o fetch da consulta da igreja é rejeitado", async () => {
      mockChurchPageResponse({ reject: new TypeError("fetch failed") });
      await expect(getChurchBySlug(SLUG)).rejects.toThrow("fetch failed");
    });

    // Com a consulta aninhada, a falta de permissão (GRANT) em uma tabela
    // embutida é erro da consulta inteira, nunca seção vazia.
    it("lança o erro de permissão de uma tabela embutida", async () => {
      mockChurchPageResponse({
        data: null,
        error: { message: "permission denied for table church_clergy" },
      });
      await expect(getChurchBySlug(SLUG)).rejects.toMatchObject({
        message: "permission denied for table church_clergy",
      });
    });
  });

  describe("caminho feliz", () => {
    it("monta a igreja completa a partir das linhas do banco", async () => {
      mockChurchPage({
        image_url: "https://img/igreja.jpg",
        type: "parish",
        phone: "+558233334444",
        whatsapp: "+5582988887777",
        email: "secretaria@paroquia.org",
        instagram: "@avozdoapostolo",
        facebook: "paroquiasaopaulo",
        website: "https://paroquia.org",
        google_maps_url: "https://maps.google.com/?q=1",
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
        schedule_events: [
          { id: "e1", category: "confession", ...emptyScheduleColumns, time: "09:00" },
          { id: "e2", category: "confession", ...emptyScheduleColumns, time: "16:00" },
        ],
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
        church_clergy: [
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
        ],
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
        church_ministries: [
          {
            ministries: {
              id: "m9",
              label: "Encontro de Casais com Cristo",
              acronym: "ECC",
              category: "movement",
            },
          },
        ],
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
        schedule_events: [],
        activities: [],
        church_clergy: [],
        church_ministries: [],
      });

      await expect(getChurchBySlug(SLUG)).resolves.toEqual(baseChurch);
    });

    it("trata relação embutida `null` como seção vazia", async () => {
      mockChurchPage({
        schedule_events: null,
        activities: null,
        church_clergy: null,
        church_ministries: null,
      });

      await expect(getChurchBySlug(SLUG)).resolves.toEqual(baseChurch);
    });
  });
});

// Forma da consulta (VF-084): uma ida ao banco, em `churches`, com as seções
// embutidas pelo PostgREST e a ordem das relações explícita.
describe("getChurchBySlug: forma da consulta", () => {
  beforeEach(() => {
    vi.mocked(createPublicClient).mockReset();
  });

  // Sem filtro de `is_active` no clero: o vínculo encerrado alimenta o
  // histórico da página.
  it("filtra só pelo slug recebido", async () => {
    const client = mockChurchPage();
    await getChurchBySlug(SLUG);
    expect(callsTo(client, "churches", "eq")).toEqual([["slug", SLUG]]);
  });

  it("faz uma consulta só, em `churches`, e pede no máximo uma linha", async () => {
    const client = mockChurchPage();
    await getChurchBySlug(SLUG);
    expect(client.tables).toEqual(["churches"]);
    expect(callsTo(client, "churches", "maybeSingle")).toEqual([[]]);
  });

  it("faz uma consulta só também quando a igreja não existe", async () => {
    const client = mockChurchPageResponse(ok(null));
    await getChurchBySlug("nao-existe");
    expect(client.tables).toEqual(["churches"]);
  });

  it.each(EMBEDDED_RELATIONS)(
    "embute $section ($relation) na consulta da igreja",
    async ({ relation }) => {
      const client = mockChurchPage();
      await getChurchBySlug(SLUG);
      const [[columns]] = callsTo(client, "churches", "select");
      expect(columns).toEqual(expect.stringContaining(`${relation}(`));
    },
  );

  it("embute os horários das atividades e os dados do clérigo e do ministério", async () => {
    const client = mockChurchPage();
    await getChurchBySlug(SLUG);
    const [[columns]] = callsTo(client, "churches", "select");
    expect(columns).toEqual(
      expect.stringContaining("activities(*, activity_schedules(*))"),
    );
    expect(columns).toEqual(expect.stringContaining("church_clergy(*, clergy(*))"));
    expect(columns).toEqual(
      expect.stringContaining("church_ministries(*, ministries(*))"),
    );
  });

  // Atividades e ministérios aparecem na ordem recebida; horários e clero são
  // reordenados em `lib/utils`, mas os empates seguem a ordem recebida.
  // O `id` desempata linhas do mesmo insert (mesmo `created_at`).
  it("ordena as relações embutidas: horários por hora, o resto por cadastro e id", async () => {
    const client = mockChurchPage();
    await getChurchBySlug(SLUG);
    expect(callsTo(client, "churches", "order")).toEqual([
      ["time", { referencedTable: "schedule_events" }],
      ["created_at", { referencedTable: "activities" }],
      ["id", { referencedTable: "activities" }],
      ["time", { referencedTable: "activities.activity_schedules" }],
      ["created_at", { referencedTable: "church_clergy" }],
      ["id", { referencedTable: "church_clergy" }],
      ["created_at", { referencedTable: "church_ministries" }],
      ["id", { referencedTable: "church_ministries" }],
    ]);
  });

  it("mantém a ordem recebida das atividades, dos ministérios e do clero", async () => {
    mockChurchPage({
      activities: [
        { id: "a2", name: "Catequese", description: null, activity_schedules: [] },
        { id: "a1", name: "Adoração", description: null, activity_schedules: [] },
      ],
      church_ministries: [
        {
          ministries: {
            id: "m2",
            label: "Pastoral da Criança",
            acronym: null,
            category: "pastoral",
          },
        },
        {
          ministries: {
            id: "m1",
            label: "Pastoral Familiar",
            acronym: null,
            category: "pastoral",
          },
        },
      ],
      church_clergy: [
        {
          start_date: null,
          end_date: null,
          is_active: true,
          clergy: { id: "v2", name: "Zacarias", role: "vicar", ...emptyClergyColumns },
        },
        {
          start_date: null,
          end_date: null,
          is_active: true,
          clergy: { id: "v1", name: "Abel", role: "vicar", ...emptyClergyColumns },
        },
      ],
    });

    const church = await getChurchBySlug(SLUG);

    expect(church?.activities?.map((a) => a.id)).toEqual(["a2", "a1"]);
    expect(church?.ministries?.pastorals?.map((m) => m.id)).toEqual(["m2", "m1"]);
    expect(church?.clergy?.map((c) => c.id)).toEqual(["v2", "v1"]);
  });

  // A memoização em si é do React e só vale dentro de uma requisição (RSC);
  // aqui fica garantido que a query passa por ela.
  it("passa pelo `cache()` do React, para rodar uma vez por requisição", () => {
    expect(cachedFunctions.has(getChurchBySlug)).toBe(true);
  });

  // `cache()` do React só memoiza dentro de uma requisição do React (RSC).
  // Fora dela, cada chamada consulta de novo: um teste não reaproveita o
  // resultado do cliente simulado de outro.
  it("não guarda o resultado entre chamadas fora de uma requisição do React", async () => {
    mockChurchPage({ name: "Primeira" });
    const first = await getChurchBySlug(SLUG);

    const secondClient = mockChurchPage({ name: "Segunda" });
    const second = await getChurchBySlug(SLUG);

    expect(first?.name).toBe("Primeira");
    expect(second?.name).toBe("Segunda");
    expect(secondClient.tables).toEqual(["churches"]);
    expect(createPublicClient).toHaveBeenCalledTimes(2);
  });
});

describe("toChurch", () => {
  const row: DbChurch = { ...churchRow };

  it("converte as colunas obrigatórias e omite as nulas", () => {
    expect(toChurch(row)).toEqual(baseChurch);
  });

  it("omite `contact` quando nenhum contato está preenchido", () => {
    expect(
      toChurch({ ...row, image_url: "https://img/a.jpg" }),
    ).not.toHaveProperty("contact");
  });

  it.each([
    ["phone", "phone", "+558233334444"],
    ["whatsapp", "whatsapp", "+5582988887777"],
    ["email", "email", "secretaria@paroquia.org"],
    ["instagram", "instagram", "@paroquia"],
    ["facebook", "facebook", "paroquia"],
    ["website", "website", "https://paroquia.org"],
  ] as const)(
    "cria `contact` só com `%s` quando é o único contato",
    (column, field, value) => {
      expect(toChurch({ ...row, [column]: value }).contact).toEqual({
        [field]: value,
      });
    },
  );

  it("trata string vazia como ausente", () => {
    expect(toChurch({ ...row, phone: "", image_url: "", type: "" })).toEqual(
      baseChurch,
    );
  });

  it("converte imagem, tipo e mapa para camelCase", () => {
    expect(
      toChurch({
        ...row,
        image_url: "https://img/a.jpg",
        type: "chapel",
        google_maps_url: "https://maps.google.com/?q=2",
      }),
    ).toEqual({
      ...baseChurch,
      imageUrl: "https://img/a.jpg",
      type: "chapel",
      googleMapsUrl: "https://maps.google.com/?q=2",
    });
  });

  it("ignora as relações embutidas: as seções são da página da igreja", () => {
    const church = toChurch(churchPageRow() as DbChurch);
    for (const section of [
      "masses",
      "adorations",
      "confessions",
      "activities",
      "clergy",
      "ministries",
    ]) {
      expect(church).not.toHaveProperty(section);
    }
  });
});
