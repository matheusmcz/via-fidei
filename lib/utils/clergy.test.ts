import {
  makeChurch,
  makeClergy,
  makeClergyWithChurch,
} from "@/tests/fixtures/domain";
import type { ClergyRole } from "@/types";
import { describe, expect, it } from "vitest";
import {
  filterClergyByInitial,
  formatClergyName,
  formatClergyTenure,
  getActiveClergyMembers,
  getAllClergyWithChurch,
  getClergyAge,
  getClergyForChurch,
  getClergyHonorLabel,
  getClergyHonors,
  getClergyInitials,
  getClergyTitle,
  getClergyYear,
  getPastClergyMembers,
  getRoleLabel,
  isActiveClergyMember,
  isFullClergyDate,
  isValidClergyDate,
  sortClergyByName,
  sortClergyByRole,
  sortClergyByStartDate,
} from "./clergy";

describe("getRoleLabel", () => {
  it.each<[ClergyRole, string]>([
    ["parish-priest", "Pároco"],
    ["rector", "Reitor"],
    ["administrator", "Administrador Paroquial"],
    ["vicar", "Vigário"],
    ["deacon", "Diácono"],
  ])("%s → %s", (role, label) => {
    expect(getRoleLabel(role)).toBe(label);
  });
});

describe("getClergyTitle", () => {
  it("abrevia os títulos", () => {
    expect(getClergyTitle("padre")).toBe("Pe.");
    expect(getClergyTitle("monsenhor")).toBe("Mons.");
    expect(getClergyTitle("frei")).toBe("Fr.");
    expect(getClergyTitle("dom")).toBe("Dom");
  });

  it("devolve vazio sem título", () => {
    expect(getClergyTitle()).toBe("");
  });
});

describe("formatClergyName", () => {
  it("prefixa o título abreviado", () => {
    expect(formatClergyName(makeClergy({ name: "Fulano", title: "padre" }))).toBe(
      "Pe. Fulano",
    );
    expect(
      formatClergyName(makeClergy({ name: "Fulano", title: "monsenhor" })),
    ).toBe("Mons. Fulano");
  });

  it("acrescenta o sufixo da ordem depois de vírgula", () => {
    expect(
      formatClergyName(makeClergy({ name: "Fulano", suffix: "OFM" })),
    ).toBe("Pe. Fulano, OFM");
  });

  it("usa só o nome quando não há título", () => {
    expect(
      formatClergyName(
        makeClergy({ name: "Inácio Filho", role: "deacon", title: undefined }),
      ),
    ).toBe("Inácio Filho");
  });
});

describe("getClergyHonors / getClergyHonorLabel", () => {
  it("mantém só as honrarias conhecidas, na ordem de exibição", () => {
    expect(
      getClergyHonors(["prefect-of-studies", "bispo", "canon", "vicar-general"]),
    ).toEqual(["canon", "vicar-general", "prefect-of-studies"]);
  });

  it("devolve lista vazia sem honrarias", () => {
    expect(getClergyHonors()).toEqual([]);
    expect(getClergyHonors([])).toEqual([]);
  });

  it("traduz os rótulos", () => {
    expect(getClergyHonorLabel("canon")).toBe("Cônego");
    expect(getClergyHonorLabel("vicar-general")).toBe("Vigário Geral");
    expect(getClergyHonorLabel("prefect-of-studies")).toBe(
      "Prefeito de Estudos",
    );
  });
});

describe("sortClergyByRole", () => {
  it("ordena pároco, reitor, administrador, vigário e diácono", () => {
    const clergy = (
      ["deacon", "vicar", "administrator", "parish-priest", "rector"] as const
    ).map((role) => makeClergy({ id: role, role }));

    expect(sortClergyByRole(clergy).map((c) => c.role)).toEqual([
      "parish-priest",
      "rector",
      "administrator",
      "vicar",
      "deacon",
    ]);
  });

  it("preserva a ordem entre clérigos do mesmo cargo", () => {
    const clergy = [
      makeClergy({ id: "b", role: "vicar" }),
      makeClergy({ id: "a", role: "vicar" }),
    ];
    expect(sortClergyByRole(clergy).map((c) => c.id)).toEqual(["b", "a"]);
  });

  it("não altera a lista recebida", () => {
    const clergy = [
      makeClergy({ id: "d", role: "deacon" }),
      makeClergy({ id: "p", role: "parish-priest" }),
    ];
    sortClergyByRole(clergy);
    expect(clergy.map((c) => c.id)).toEqual(["d", "p"]);
  });
});

describe("clérigos ativos e anteriores", () => {
  const active = makeClergy({ id: "ativo" });
  const past = makeClergy({ id: "anterior", endDate: "2020" });

  it("ativo é quem não tem data de término", () => {
    expect(isActiveClergyMember(active)).toBe(true);
    expect(isActiveClergyMember(past)).toBe(false);
  });

  it("separa ativos e anteriores", () => {
    expect(getActiveClergyMembers([active, past])).toEqual([active]);
    expect(getPastClergyMembers([active, past])).toEqual([past]);
  });

  it("filtra os clérigos de uma igreja", () => {
    const other = makeClergy({ id: "outro", churchId: "church-2" });
    const own = makeClergy({ id: "proprio", churchId: "church-1" });
    expect(getClergyForChurch("church-1", [other, own])).toEqual([own]);
  });
});

describe("isFullClergyDate", () => {
  it("aceita data real em YYYY-MM-DD", () => {
    expect(isFullClergyDate("1970-05-20")).toBe(true);
    expect(isFullClergyDate("2024-02-29")).toBe(true);
  });

  it("aceita anos com zeros à esquerda, sem o desvio do Date para anos < 100", () => {
    expect(isFullClergyDate("0001-01-01")).toBe(true);
    expect(isFullClergyDate("0050-06-15")).toBe(true);
  });

  it.each([
    "1970",
    "1970-05",
    "2023-02-29",
    "1900-02-29",
    "2024-02-30",
    "2024-04-31",
    "1970-13-01",
    "1970-00-10",
    "1970-01-00",
    "0000-01-01",
    "20/05/1970",
    "",
  ])("rejeita %j", (value) => {
    expect(isFullClergyDate(value)).toBe(false);
  });
});

// Mesma regra do CHECK `is_valid_clergy_date()` da migration 016. Os casos de
// borda abaixo se repetem em `supabase/tests/016_integridade_formatos_verificacao.sql`.
describe("isValidClergyDate", () => {
  it.each([
    "1970",
    "2026",
    "0001",
    "9999",
    "1970-05-20",
    "2000-02-29",
    "2024-02-29",
    "2024-12-31",
    "0001-01-01",
  ])("aceita %s", (value) => {
    expect(isValidClergyDate(value)).toBe(true);
  });

  it.each([
    "",
    " ",
    "0000",
    "0000-01-01",
    "197",
    "19700",
    "1970-05",
    "1970-5-20",
    "1970-05-2",
    "2024-02-30",
    "2023-02-29",
    "1900-02-29",
    "2024-04-31",
    "2024-13-01",
    "2024-00-10",
    "2024-01-00",
    "20/05/1970",
    "1970/05/20",
    "19700520",
    " 1970",
    "1970 ",
    "1970\n",
    "1970-05-20T00:00",
    "abcd",
    "١٩٧٠",
  ])("rejeita %j", (value) => {
    expect(isValidClergyDate(value)).toBe(false);
  });
});

describe("getClergyYear", () => {
  it("extrai o ano de YYYY e de YYYY-MM-DD", () => {
    expect(getClergyYear("1970")).toBe("1970");
    expect(getClergyYear("1970-05-20")).toBe("1970");
  });

  it("devolve o valor quando não começa com ano", () => {
    expect(getClergyYear("desconhecido")).toBe("desconhecido");
  });
});

describe("getClergyAge", () => {
  const today = new Date(2026, 9, 30); // 30/10/2026

  it("calcula anos completos até hoje", () => {
    expect(getClergyAge("1970-05-20", undefined, today)).toBe(56);
  });

  it("ainda não fez aniversário no ano", () => {
    expect(getClergyAge("1970-12-01", undefined, today)).toBe(55);
  });

  it("faz aniversário no próprio dia", () => {
    expect(getClergyAge("1970-10-30", undefined, today)).toBe(56);
    expect(getClergyAge("1970-10-31", undefined, today)).toBe(55);
  });

  it("usa a data de falecimento completa no lugar de hoje", () => {
    expect(getClergyAge("1920-03-10", "2000-03-09", today)).toBe(79);
  });

  it("ignora falecimento só com ano e calcula até hoje", () => {
    expect(getClergyAge("1970-05-20", "2000", today)).toBe(56);
  });

  it("devolve null sem nascimento completo", () => {
    expect(getClergyAge(undefined, undefined, today)).toBeNull();
    expect(getClergyAge("1970", undefined, today)).toBeNull();
    expect(getClergyAge("1970-02-30", undefined, today)).toBeNull();
  });

  it("devolve null quando o nascimento é posterior à data final", () => {
    expect(getClergyAge("2030-01-01", undefined, today)).toBeNull();
  });
});

describe("formatClergyTenure", () => {
  it("mostra 'Atual' para quem está ativo", () => {
    expect(formatClergyTenure(makeClergy({ startDate: "2021" }))).toBe(
      "2021 - Atual",
    );
  });

  it("mostra só os anos de um período encerrado", () => {
    expect(
      formatClergyTenure(
        makeClergy({ startDate: "2015-02-01", endDate: "2020-12-31" }),
      ),
    ).toBe("2015 - 2020");
  });

  it("devolve null sem data de início", () => {
    expect(formatClergyTenure(makeClergy({ endDate: "2020" }))).toBeNull();
  });
});

describe("sortClergyByStartDate", () => {
  it("ordena do mais recente para o mais antigo, sem início por último", () => {
    const clergy = [
      makeClergy({ id: "sem-data" }),
      makeClergy({ id: "2010", startDate: "2010" }),
      makeClergy({ id: "2021-03", startDate: "2021-03-01" }),
      makeClergy({ id: "2015", startDate: "2015" }),
    ];
    expect(sortClergyByStartDate(clergy).map((c) => c.id)).toEqual([
      "2021-03",
      "2015",
      "2010",
      "sem-data",
    ]);
  });
});

describe("getAllClergyWithChurch", () => {
  it("junta a igreja aos clérigos ativos e descarta os anteriores", () => {
    const church = makeChurch({ id: "c1", name: "Matriz", slug: "matriz" });
    const result = getAllClergyWithChurch(
      [
        makeClergy({ id: "ativo", churchId: "c1" }),
        makeClergy({ id: "anterior", churchId: "c1", endDate: "2020" }),
        makeClergy({ id: "sem-igreja", churchId: undefined }),
      ],
      [church],
    );

    expect(result.map((c) => c.id)).toEqual(["ativo", "sem-igreja"]);
    expect(result[0]).toMatchObject({ churchName: "Matriz", churchSlug: "matriz" });
    expect(result[1]).not.toHaveProperty("churchName");
  });
});

describe("listagem do clero por nome e inicial", () => {
  const clergy = [
    makeClergyWithChurch({ id: "1", name: "Zacarias" }),
    makeClergyWithChurch({ id: "2", name: "Ângelo" }),
    makeClergyWithChurch({ id: "3", name: "Antônio" }),
    makeClergyWithChurch({ id: "4", name: "Élcio" }),
  ];

  it("ordena por nome em português, com acentos no lugar certo", () => {
    expect(sortClergyByName(clergy).map((c) => c.name)).toEqual([
      "Ângelo",
      "Antônio",
      "Élcio",
      "Zacarias",
    ]);
  });

  it("lista as iniciais sem acento e sem repetição", () => {
    expect(getClergyInitials(clergy)).toEqual(["A", "E", "Z"]);
  });

  it("filtra pela inicial ignorando acento e caixa", () => {
    expect(filterClergyByInitial(clergy, "a").map((c) => c.id)).toEqual([
      "2",
      "3",
    ]);
    expect(filterClergyByInitial(clergy, "E").map((c) => c.id)).toEqual(["4"]);
  });

  it("devolve todos sem inicial selecionada", () => {
    expect(filterClergyByInitial(clergy, "")).toHaveLength(4);
  });
});
