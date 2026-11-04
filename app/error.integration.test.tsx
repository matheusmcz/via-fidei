import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import RouteError from "./error";

const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
}));

const TECHNICAL_MESSAGE =
  "Falha ao consultar igrejas: TypeError: fetch failed (inexistente.invalid)";

function serverError(digest?: string): Error & { digest?: string } {
  return Object.assign(new Error(TECHNICAL_MESSAGE), { digest });
}

describe("app/error.tsx", () => {
  beforeEach(() => {
    refresh.mockClear();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("mostra a mensagem para o fiel e o link para o início", () => {
    render(<RouteError error={serverError("123")} reset={vi.fn()} />);

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Não foi possível carregar esta página",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Voltar para o início/ }),
    ).toHaveAttribute("href", "/");
  });

  it("leva o foco ao título, para o leitor de tela anunciar o erro", () => {
    render(<RouteError error={serverError("123")} reset={vi.fn()} />);

    expect(screen.getByRole("heading", { level: 1 })).toHaveFocus();
  });

  it("não exibe a mensagem técnica do erro", () => {
    const { container } = render(
      <RouteError error={serverError("123")} reset={vi.fn()} />,
    );

    expect(container).not.toHaveTextContent(TECHNICAL_MESSAGE);
    expect(container).not.toHaveTextContent("inexistente.invalid");
  });

  it("“Tentar novamente” atualiza os dados do servidor e chama reset", async () => {
    const reset = vi.fn();
    render(<RouteError error={serverError("123")} reset={reset} />);

    await userEvent.click(
      screen.getByRole("button", { name: /Tentar novamente/ }),
    );

    expect(refresh).toHaveBeenCalledOnce();
    expect(reset).toHaveBeenCalledOnce();
  });

  it("registra só o digest no console, sem a mensagem técnica", () => {
    render(<RouteError error={serverError("abc-123")} reset={vi.fn()} />);

    const logged = vi.mocked(console.error).mock.calls.flat().join(" ");
    expect(logged).toContain("abc-123");
    expect(logged).not.toContain(TECHNICAL_MESSAGE);
  });
});
