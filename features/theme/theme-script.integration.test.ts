import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { applyStoredTheme, THEME_INIT_SCRIPT } from "./theme-script";

function mockSystemTheme(prefersDark: boolean) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn((query: string) => ({
      matches: prefersDark && query === "(prefers-color-scheme: dark)",
    })),
  );
}

function isDark() {
  return document.documentElement.classList.contains("dark");
}

describe("applyStoredTheme", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove("dark");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("aplica o tema escuro salvo, mesmo com o sistema claro", () => {
    mockSystemTheme(false);
    localStorage.setItem("via-fidei-theme", "dark");

    applyStoredTheme();

    expect(isDark()).toBe(true);
  });

  it("o tema claro salvo vence o sistema escuro", () => {
    mockSystemTheme(true);
    localStorage.setItem("via-fidei-theme", "light");
    document.documentElement.classList.add("dark");

    applyStoredTheme();

    expect(isDark()).toBe(false);
  });

  it("sem tema salvo, segue a preferência do sistema", () => {
    mockSystemTheme(true);

    applyStoredTheme();

    expect(isDark()).toBe(true);
  });

  it("não lança quando o localStorage está indisponível", () => {
    mockSystemTheme(true);
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("bloqueado");
    });

    expect(() => applyStoredTheme()).not.toThrow();
  });
});

describe("THEME_INIT_SCRIPT", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove("dark");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("é um script autossuficiente que aplica o tema salvo", () => {
    mockSystemTheme(false);
    localStorage.setItem("via-fidei-theme", "dark");

    // Roda como o navegador rodaria o <script> inline: sem acesso ao módulo.
    new Function(THEME_INIT_SCRIPT)();

    expect(isDark()).toBe(true);
  });
});
