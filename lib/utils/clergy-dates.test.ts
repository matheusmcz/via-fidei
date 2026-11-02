import { describe, expect, it } from "vitest";
import {
  CLERGY_DATE_MESSAGES,
  compareClergyDates,
  getTodayInMaceio,
  isClergyDateNotFuture,
  isClergyDateOrderValid,
  validateClergyTenureDates,
  validateClergyVitalDates,
} from "./clergy-dates";

// Os mesmos pares estão no roteiro supabase/tests/018_ordem_e_datas_futuras_verificacao.sql.

describe("compareClergyDates", () => {
  it.each<[string, string, number]>([
    // Mesma precisão: data completa compara dia a dia, ano compara ano.
    ["2020-05-01", "2020-05-02", -1],
    ["2020-05-02", "2020-05-01", 1],
    ["2020-05-01", "2020-05-01", 0],
    ["2019", "2020", -1],
    ["2021", "2020", 1],
    ["2020", "2020", 0],
    // Precisões diferentes: compara só o ano (a menor precisão comum).
    ["2020", "2020-05-01", 0],
    ["2020-12-31", "2020", 0],
    ["2021", "2020-12-31", 1],
    ["2020-01-01", "2021", -1],
    ["0001", "9999-12-31", -1],
  ])("%s × %s → %i", (a, b, expected) => {
    expect(compareClergyDates(a, b)).toBe(expected);
  });

  it("lança erro com data fora do formato", () => {
    expect(() => compareClergyDates("2020-02-30", "2020")).toThrow();
    expect(() => compareClergyDates("2020", "")).toThrow();
  });
});

describe("isClergyDateOrderValid", () => {
  it.each<[string, string]>([
    ["2020", "2020-05-01"],
    ["2020-05-01", "2020"],
    ["2020", "2020"],
    ["2020-05-01", "2020-05-01"],
    ["2020-05-01", "2020-05-02"],
    ["2011", "2026"],
    ["1970-05-20", "2026"],
    ["2000-02-29", "2000-03-01"],
  ])("aceita %s → %s", (earlier, later) => {
    expect(isClergyDateOrderValid(earlier, later)).toBe(true);
  });

  it.each<[string, string]>([
    ["2021", "2020-12-31"],
    ["2021-01-01", "2020"],
    ["2021", "2020"],
    ["2020-05-02", "2020-05-01"],
    ["2020-01-01", "2019-12-31"],
  ])("recusa %s → %s", (earlier, later) => {
    expect(isClergyDateOrderValid(earlier, later)).toBe(false);
  });

  it("não opina quando falta um dos lados", () => {
    expect(isClergyDateOrderValid(null, "2020")).toBe(true);
    expect(isClergyDateOrderValid("2020", null)).toBe(true);
    expect(isClergyDateOrderValid(undefined, undefined)).toBe(true);
  });

  it("não opina com formato inválido (o formato tem regra própria)", () => {
    expect(isClergyDateOrderValid("2021", "2020-02-30")).toBe(true);
    expect(isClergyDateOrderValid("", "2020")).toBe(true);
    expect(isClergyDateOrderValid("2021 ", "2020")).toBe(true);
  });
});

describe("isClergyDateNotFuture", () => {
  const today = "2026-10-31";

  it.each(["2026-10-31", "2026-10-30", "2026", "2025-12-31", "1970", "0001-01-01"])(
    `aceita %s (hoje ${today})`,
    (value) => {
      expect(isClergyDateNotFuture(value, today)).toBe(true);
    },
  );

  it.each(["2026-11-01", "2027", "2027-01-01", "9999"])("recusa %s", (value) => {
    expect(isClergyDateNotFuture(value, today)).toBe(false);
  });

  it("ano sozinho vale até o último dia do ano atual", () => {
    expect(isClergyDateNotFuture("2026", "2026-01-01")).toBe(true);
    expect(isClergyDateNotFuture("2027", "2026-12-31")).toBe(false);
  });

  it("não opina com valor nulo ou fora do formato", () => {
    expect(isClergyDateNotFuture(null, today)).toBe(true);
    expect(isClergyDateNotFuture(undefined, today)).toBe(true);
    expect(isClergyDateNotFuture("2099-02-30", today)).toBe(true);
  });

  it("lança erro quando hoje não é uma data completa", () => {
    expect(() => isClergyDateNotFuture("2020", "2026")).toThrow();
    expect(() => isClergyDateNotFuture("2020", "")).toThrow();
  });
});

describe("getTodayInMaceio", () => {
  it("usa o dia de Maceió (UTC-3), não o de UTC", () => {
    // 01/11 às 02:59 em UTC ainda é 31/10 em Maceió.
    expect(getTodayInMaceio(new Date("2026-11-01T02:59:59Z"))).toBe("2026-10-31");
    expect(getTodayInMaceio(new Date("2026-11-01T03:00:00Z"))).toBe("2026-11-01");
  });

  it("vira o ano à meia-noite de Maceió", () => {
    expect(getTodayInMaceio(new Date("2027-01-01T02:00:00Z"))).toBe("2026-12-31");
    expect(getTodayInMaceio(new Date("2027-01-01T03:00:00Z"))).toBe("2027-01-01");
  });
});

describe("validateClergyVitalDates", () => {
  const today = "2026-10-31";

  it("sem problemas com datas válidas ou ausentes", () => {
    expect(validateClergyVitalDates({}, today)).toEqual([]);
    expect(
      validateClergyVitalDates({ birthDate: "1970-05-20", deathDate: "2026" }, today),
    ).toEqual([]);
    expect(validateClergyVitalDates({ birthDate: "1952", deathDate: null }, today)).toEqual([]);
  });

  it("aponta formato inválido no campo", () => {
    expect(validateClergyVitalDates({ birthDate: "20/05/1970" }, today)).toEqual([
      { field: "birthDate", reason: "format" },
    ]);
    expect(validateClergyVitalDates({ deathDate: "" }, today)).toEqual([
      { field: "deathDate", reason: "format" },
    ]);
  });

  it("aponta data futura em cada campo", () => {
    expect(
      validateClergyVitalDates({ birthDate: "2026-11-01", deathDate: "2027" }, today),
    ).toEqual([
      { field: "birthDate", reason: "future" },
      { field: "deathDate", reason: "future" },
    ]);
  });

  it("datas futuras e fora de ordem: aponta os três problemas", () => {
    expect(
      validateClergyVitalDates({ birthDate: "2028", deathDate: "2027" }, today),
    ).toEqual([
      { field: "birthDate", reason: "future" },
      { field: "deathDate", reason: "future" },
      { field: "deathDate", reason: "death-before-birth" },
    ]);
  });

  it("aponta falecimento antes do nascimento no campo de falecimento", () => {
    expect(
      validateClergyVitalDates({ birthDate: "1970-05-20", deathDate: "1969" }, today),
    ).toEqual([{ field: "deathDate", reason: "death-before-birth" }]);
  });

  it("não compara a ordem quando um dos lados tem erro de formato", () => {
    expect(
      validateClergyVitalDates({ birthDate: "1970-02-30", deathDate: "1969" }, today),
    ).toEqual([{ field: "birthDate", reason: "format" }]);
  });
});

describe("validateClergyTenureDates", () => {
  const today = "2026-10-31";

  it("sem problemas com período válido, aberto ou ausente", () => {
    expect(validateClergyTenureDates({}, today)).toEqual([]);
    expect(validateClergyTenureDates({ startDate: "2011", endDate: "2020-12-31" }, today)).toEqual(
      [],
    );
    expect(validateClergyTenureDates({ startDate: "2021-01-15" }, today)).toEqual([]);
    expect(validateClergyTenureDates({ startDate: "2020", endDate: "2020-05-01" }, today)).toEqual(
      [],
    );
  });

  it("aponta fim antes do início no campo de fim", () => {
    expect(
      validateClergyTenureDates({ startDate: "2021", endDate: "2020-12-31" }, today),
    ).toEqual([{ field: "endDate", reason: "end-before-start" }]);
  });

  it("aponta datas futuras e formato inválido", () => {
    expect(
      validateClergyTenureDates({ startDate: "2027-01-01", endDate: "2026-02-30" }, today),
    ).toEqual([
      { field: "startDate", reason: "future" },
      { field: "endDate", reason: "format" },
    ]);
  });

  it("início e fim no futuro em ordem: só os dois erros de data futura", () => {
    expect(
      validateClergyTenureDates({ startDate: "2027", endDate: "2028" }, today),
    ).toEqual([
      { field: "startDate", reason: "future" },
      { field: "endDate", reason: "future" },
    ]);
  });
});

describe("CLERGY_DATE_MESSAGES", () => {
  it("tem mensagem em português para cada motivo", () => {
    expect(Object.keys(CLERGY_DATE_MESSAGES).sort()).toEqual(
      ["death-before-birth", "end-before-start", "format", "future"].sort(),
    );
    for (const message of Object.values(CLERGY_DATE_MESSAGES)) {
      expect(message.length).toBeGreaterThan(0);
    }
  });
});
