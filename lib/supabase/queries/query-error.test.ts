import { describe, expect, it } from "vitest";
import { findQueryError } from "./query-error";

const ok = { error: null };

describe("findQueryError", () => {
  it("devolve null para lista vazia", () => {
    expect(findQueryError([])).toBeNull();
  });

  it("devolve null quando nenhuma consulta falhou", () => {
    expect(findQueryError([ok, ok, ok, ok])).toBeNull();
  });

  it("devolve o erro de uma consulta no meio da lista", () => {
    const error = new Error("clero indisponível");
    expect(findQueryError([ok, { error }, ok])).toBe(error);
  });

  it("com dois erros, devolve o primeiro", () => {
    const first = new Error("horários indisponíveis");
    const second = new Error("ministérios indisponíveis");
    expect(findQueryError([ok, { error: first }, ok, { error: second }])).toBe(
      first,
    );
  });

  it("devolve o erro que está só no último elemento", () => {
    const error = new Error("ministérios indisponíveis");
    expect(findQueryError([ok, ok, ok, { error }])).toBe(error);
  });
});
