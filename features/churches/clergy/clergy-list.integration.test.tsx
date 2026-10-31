import { makeClergy } from "@/tests/fixtures/domain";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { ClergyHistory } from "./clergy-history";
import { ClergyList } from "./clergy-list";

const deacon = makeClergy({
  id: "diacono",
  name: "Inácio Filho",
  role: "deacon",
  title: undefined,
  startDate: "2022",
});
const parishPriest = makeClergy({
  id: "paroco",
  name: "Manoel José dos Santos",
  role: "parish-priest",
  title: "padre",
  startDate: "2021",
});
const vicar = makeClergy({
  id: "vigario",
  name: "João Batista",
  role: "vicar",
  title: "frei",
  suffix: "OFM",
});
const formerPriest = makeClergy({
  id: "antigo",
  name: "Antônio Pereira",
  role: "parish-priest",
  title: "monsenhor",
  startDate: "2011",
  endDate: "2020",
});

describe("ClergyList (CT-004)", () => {
  it("mostra só os ativos, do pároco ao diácono, com nome e cargo formatados", () => {
    render(
      <ClergyList clergy={[deacon, formerPriest, vicar, parishPriest]} />,
    );

    const [first, second, third, ...rest] = screen.getAllByRole("button");
    expect(rest).toHaveLength(0);

    expect(first).toHaveTextContent("Pe. Manoel José dos Santos");
    expect(first).toHaveTextContent("Pároco");
    expect(first).toHaveTextContent("(2021 - Atual)");

    expect(second).toHaveTextContent("Fr. João Batista, OFM");
    expect(second).toHaveTextContent("Vigário");

    expect(third).toHaveTextContent("Inácio Filho");
    expect(third).toHaveTextContent("Diácono");
    expect(third).not.toHaveTextContent(/Pe\.|Fr\.|Mons\./);

    expect(screen.queryByText(/Antônio Pereira/)).not.toBeInTheDocument();
  });

  it("abre o detalhe do clérigo ao clicar no card", async () => {
    const user = userEvent.setup();
    render(<ClergyList clergy={[parishPriest]} />);

    await user.click(screen.getByRole("button", { name: /Manoel José/ }));

    expect(await screen.findByRole("dialog")).toHaveTextContent(
      "Pe. Manoel José dos Santos",
    );
  });

  it("avisa quando não há clérigos cadastrados", () => {
    render(<ClergyList clergy={[]} />);
    expect(screen.getByText("Nenhum clérigo cadastrado")).toBeInTheDocument();
  });

  it("avisa quando todos os clérigos são anteriores", () => {
    render(<ClergyList clergy={[formerPriest]} />);
    expect(screen.getByText("Nenhum clérigo ativo")).toBeInTheDocument();
  });
});

describe("ClergyHistory (CT-004)", () => {
  it("lista os clérigos anteriores ao expandir, com o período encerrado", async () => {
    const user = userEvent.setup();
    render(<ClergyHistory clergy={[parishPriest, formerPriest]} />);

    const toggle = screen.getByRole("button", { name: /Histórico \(1\)/ });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText(/Antônio Pereira/)).not.toBeInTheDocument();

    await user.click(toggle);

    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(
      screen.getByRole("button", { name: /Mons\. Antônio Pereira/ }),
    ).toHaveTextContent("(2011 - 2020)");
  });

  it("não aparece sem clérigos anteriores", () => {
    const { container } = render(<ClergyHistory clergy={[parishPriest]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
