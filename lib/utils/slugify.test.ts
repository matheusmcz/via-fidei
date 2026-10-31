import { describe, expect, it } from "vitest";
import { slugify } from "./slugify";

describe("slugify", () => {
  it("remove acentos, usa minúsculas e troca espaços por hífen", () => {
    expect(slugify("São José Operário")).toBe("sao-jose-operario");
  });

  it("trata ç e til", () => {
    expect(slugify("Nossa Senhora da Conceição")).toBe(
      "nossa-senhora-da-conceicao",
    );
  });

  it("remove pontuação e junta hífens repetidos", () => {
    expect(slugify("Santo Antônio -- (Centro)!")).toBe("santo-antonio-centro");
  });

  it("apara espaços e hífens nas pontas", () => {
    expect(slugify("  -Fátima-  ")).toBe("fatima");
  });

  it("normaliza a busca da home: 'SAO' e 'são' casam com 'São Paulo'", () => {
    const name = slugify("São Paulo Apóstolo");
    expect(name.includes(slugify("SAO"))).toBe(true);
    expect(name.includes(slugify("são"))).toBe(true);
  });

  it("devolve vazio para texto sem letras ou números", () => {
    expect(slugify("!!!")).toBe("");
  });
});
