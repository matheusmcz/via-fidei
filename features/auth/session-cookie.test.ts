import { describe, expect, it } from "vitest";
import { hasAuthTokenCookie } from "./session-cookie";

/** Nome real montado pelo supabase-js a partir do host do projeto. */
const TOKEN = "sb-abcdefghijklmnop-auth-token";

describe("hasAuthTokenCookie", () => {
  it("reconhece o cookie de sessão, sozinho ou entre outros", () => {
    expect(hasAuthTokenCookie(`${TOKEN}=base64-payload`)).toBe(true);
    expect(
      hasAuthTokenCookie(`via-fidei-theme=dark; ${TOKEN}=base64-payload`),
    ).toBe(true);
  });

  it("reconhece o cookie fatiado em várias partes", () => {
    expect(hasAuthTokenCookie(`${TOKEN}.0=parte1; ${TOKEN}.1=parte2`)).toBe(
      true,
    );
  });

  it("não confunde o verificador do PKCE com uma sessão aberta", () => {
    // Fica no navegador entre o início e o fim de um fluxo de login; não é sessão.
    expect(hasAuthTokenCookie(`${TOKEN}-code-verifier=abc`)).toBe(false);
  });

  it("não acha sessão em visitante anônimo", () => {
    expect(hasAuthTokenCookie("")).toBe(false);
    expect(hasAuthTokenCookie("via-fidei-theme=dark")).toBe(false);
    expect(hasAuthTokenCookie("sb-abc-auth=1; outro-auth-token-ish=2")).toBe(
      false,
    );
  });
});
