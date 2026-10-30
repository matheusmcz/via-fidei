import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ChurchContactSection } from "./church-contact-section";

describe("ChurchContactSection (CT-003)", () => {
  it("formata cada contato e monta o link correspondente", () => {
    render(
      <ChurchContactSection
        contact={{
          phone: "+5582999999999",
          whatsapp: "+5582988887777",
          email: "secretaria@paroquia.org",
          instagram: "@paroquia",
          facebook: "https://facebook.com/paroquia",
          website: "https://paroquia.org/",
        }}
      />,
    );

    const expected: Array<[string, string, string]> = [
      ["Telefone", "(82) 99999-9999", "tel:5582999999999"],
      ["WhatsApp", "(82) 98888-7777", "https://wa.me/5582988887777"],
      ["E-mail", "secretaria@paroquia.org", "mailto:secretaria@paroquia.org"],
      ["Instagram", "@paroquia", "https://instagram.com/paroquia"],
      ["Facebook", "paroquia", "https://facebook.com/paroquia"],
      ["Website", "paroquia.org", "https://paroquia.org/"],
    ];

    for (const [label, text, href] of expected) {
      const link = screen.getByRole("link", { name: label });
      expect(link).toHaveTextContent(text);
      expect(link).toHaveAttribute("href", href);
    }
  });

  it("abre os links externos em nova aba com rel seguro (CT-010)", () => {
    render(<ChurchContactSection contact={{ website: "paroquia.org" }} />);

    const link = screen.getByRole("link", { name: "Website" });
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("mostra só os contatos preenchidos", () => {
    render(<ChurchContactSection contact={{ email: "a@b.org" }} />);
    expect(screen.getAllByRole("link")).toHaveLength(1);
  });

  it.each([
    ["sem contato", undefined],
    ["com contato vazio", {}],
  ])("avisa quando está %s (CT-007)", (_caso, contact) => {
    render(<ChurchContactSection contact={contact} />);
    expect(
      screen.getByText("Nenhuma informação de contato disponível."),
    ).toBeInTheDocument();
  });
});
