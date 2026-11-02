import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import GlobalError from "./global-error";

const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
}));

const TECHNICAL_MESSAGE = "Falha no layout raiz: ENOTFOUND inexistente.invalid";

function rootLayoutError(): Error & { digest?: string } {
  return Object.assign(new Error(TECHNICAL_MESSAGE), { digest: "987" });
}

/**
 * O `global-error.tsx` desenha o próprio `<html>` e `<body>`. O React 19 os
 * trata como singletons e usa os do `document`, então a página é conferida
 * pelo `document.body`, e não pelo `container` do Testing Library.
 */
function renderGlobalError(reset = vi.fn()) {
  render(<GlobalError error={rootLayoutError()} reset={reset} />, {
    container: document,
  });
  return reset;
}

describe("app/global-error.tsx", () => {
  beforeEach(() => {
    refresh.mockClear();
    localStorage.clear();
    document.documentElement.classList.remove("dark");
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal(
      "matchMedia",
      vi.fn(() => ({ matches: false })),
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("mostra a mensagem para o fiel, sem a mensagem técnica", () => {
    renderGlobalError();

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Não foi possível carregar esta página",
      }),
    ).toBeInTheDocument();
    expect(document.body).not.toHaveTextContent(TECHNICAL_MESSAGE);
    expect(document.documentElement).toHaveAttribute("lang", "pt-BR");
  });

  it("“Tentar novamente” atualiza os dados do servidor e chama reset", async () => {
    const reset = renderGlobalError();

    await userEvent.click(
      screen.getByRole("button", { name: /Tentar novamente/ }),
    );

    expect(refresh).toHaveBeenCalledOnce();
    expect(reset).toHaveBeenCalledOnce();
  });

  it("aplica o tema escuro salvo, já que não há o layout raiz", () => {
    localStorage.setItem("via-fidei-theme", "dark");

    renderGlobalError();

    expect(document.documentElement).toHaveClass("dark");
  });

  it("o tema claro salvo vence o sistema escuro", () => {
    localStorage.setItem("via-fidei-theme", "light");
    vi.stubGlobal(
      "matchMedia",
      vi.fn(() => ({ matches: true })),
    );

    renderGlobalError();

    expect(document.documentElement).not.toHaveClass("dark");
  });

  it("inclui o script de tema no <head> para o HTML vindo do servidor", () => {
    renderGlobalError();

    const scripts = Array.from(document.head.querySelectorAll("script"));
    expect(
      scripts.some((script) => script.textContent?.includes("via-fidei-theme")),
    ).toBe(true);
  });
});
