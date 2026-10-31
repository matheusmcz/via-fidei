import { makeChurch } from "@/tests/fixtures/domain";
import type { Church } from "@/types";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { ChurchList } from "./church-list";

function churchLinks(): string[] {
  return screen
    .getAllByRole("link")
    .map((link) => within(link).getByRole("heading").textContent ?? "");
}

const churches: Church[] = [
  makeChurch({
    id: "1",
    name: "Paróquia São Paulo Apóstolo",
    slug: "sao-paulo-apostolo",
    district: "Farol",
  }),
  makeChurch({
    id: "2",
    name: "Nossa Senhora de Fátima",
    slug: "nossa-senhora-de-fatima-pajucara",
    district: "Pajuçara",
  }),
  makeChurch({
    id: "3",
    name: "Catedral Nossa Senhora dos Prazeres",
    slug: "catedral-nossa-senhora-dos-prazeres",
    district: "Centro",
  }),
];

function renderList(list: Church[] = churches) {
  const user = userEvent.setup();
  render(<ChurchList churches={list} />);
  return { user, search: screen.getByPlaceholderText("Buscar igreja...") };
}

describe("ChurchList", () => {
  it("lista as igrejas em ordem alfabética com link para a página de cada uma", () => {
    renderList();

    expect(churchLinks()).toEqual([
      "Catedral Nossa Senhora dos Prazeres",
      "Nossa Senhora de Fátima",
      "Paróquia São Paulo Apóstolo",
    ]);
    expect(
      screen.getByRole("link", { name: /São Paulo Apóstolo/ }),
    ).toHaveAttribute("href", "/igreja/sao-paulo-apostolo");
  });

  it.each(["Sao", "são", "SAO"])(
    "a busca por %j ignora acentos e caixa (CT-006)",
    async (query) => {
      const { user, search } = renderList();

      await user.type(search, query);

      expect(churchLinks()).toEqual(["Paróquia São Paulo Apóstolo"]);
    },
  );

  it("a busca 'Fatima' encontra 'Fátima'", async () => {
    const { user, search } = renderList();

    await user.type(search, "Fatima");

    expect(churchLinks()).toEqual(["Nossa Senhora de Fátima"]);
  });

  it("mostra o estado vazio quando a busca não encontra nada (CT-007)", async () => {
    const { user, search } = renderList();

    await user.type(search, "inexistente");

    expect(screen.queryAllByRole("link")).toHaveLength(0);
    expect(screen.getByText("Nenhuma igreja encontrada")).toBeInTheDocument();
    expect(
      screen.getByText(/Não encontramos resultados para "inexistente"/),
    ).toBeInTheDocument();
  });

  it("limpar a busca volta a mostrar todas as igrejas", async () => {
    const { user, search } = renderList();

    await user.type(search, "Fatima");
    await user.clear(search);

    expect(churchLinks()).toHaveLength(3);
  });

  it("filtra por bairro", async () => {
    const { user } = renderList();

    // O filtro de bairro não tem rótulo acessível; é o primeiro combobox da
    // tela (os seguintes são o "por página" da paginação).
    const [districtFilter] = screen.getAllByRole("combobox");
    await user.click(districtFilter);
    await user.click(await screen.findByRole("option", { name: "Pajuçara" }));

    expect(churchLinks()).toEqual(["Nossa Senhora de Fátima"]);
  });

  it("pagina com 20 igrejas por página", () => {
    const many = Array.from({ length: 25 }, (_, i) =>
      makeChurch({
        id: String(i),
        name: `Igreja ${String(i).padStart(2, "0")}`,
        slug: `igreja-${i}`,
      }),
    );

    renderList(many);

    expect(screen.getAllByRole("link")).toHaveLength(20);
  });
});
