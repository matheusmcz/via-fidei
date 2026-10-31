import { describe, expect, it } from "vitest";
import {
  formatFacebookName,
  formatInstagramHandle,
  formatPhoneForDisplay,
  formatPhoneForHref,
  formatWebsiteForDisplay,
  getFacebookUrl,
  getInstagramUrl,
  getWebsiteUrl,
} from "./contact";

describe("formatPhoneForDisplay", () => {
  it("formata celular com código do país", () => {
    expect(formatPhoneForDisplay("+5582999999999")).toBe("(82) 99999-9999");
  });

  it("formata celular só com DDD", () => {
    expect(formatPhoneForDisplay("82999999999")).toBe("(82) 99999-9999");
  });

  it("ignora espaços, traços e parênteses na entrada", () => {
    expect(formatPhoneForDisplay("+55 (82) 99999-8888")).toBe(
      "(82) 99999-8888",
    );
  });

  it("devolve o original quando não reconhece o formato", () => {
    expect(formatPhoneForDisplay("123")).toBe("123");
  });
});

describe("formatPhoneForHref", () => {
  it("mantém só os dígitos", () => {
    expect(formatPhoneForHref("+55 (82) 99999-9999")).toBe("5582999999999");
  });
});

describe("formatInstagramHandle", () => {
  it("mantém o @ de um handle", () => {
    expect(formatInstagramHandle("@paroquia")).toBe("@paroquia");
  });

  it("acrescenta @ ao handle sem @", () => {
    expect(formatInstagramHandle("pe.manoeljose")).toBe("@pe.manoeljose");
  });

  // Bug conhecido, encontrado ao escrever estes testes (enviado ao board):
  // sem âncora, a regex casa "https" antes do domínio e devolve "@https".
  // Quando for corrigido, este teste passa a falhar e deve virar um `it` comum.
  it.fails("extrai o handle de uma URL do Instagram", () => {
    expect(formatInstagramHandle("https://instagram.com/paroquia")).toBe(
      "@paroquia",
    );
  });
});

describe("getInstagramUrl", () => {
  it("monta a URL a partir do handle com ou sem @", () => {
    expect(getInstagramUrl("@paroquia")).toBe("https://instagram.com/paroquia");
    expect(getInstagramUrl("paroquia")).toBe("https://instagram.com/paroquia");
  });

  it("normaliza uma URL existente", () => {
    expect(getInstagramUrl("https://www.instagram.com/paroquia")).toBe(
      "https://instagram.com/paroquia",
    );
  });
});

describe("formatFacebookName", () => {
  it("extrai o nome da página da URL, sem query string", () => {
    expect(formatFacebookName("https://facebook.com/paroquia")).toBe(
      "paroquia",
    );
    expect(formatFacebookName("https://www.facebook.com/paroquia?ref=bm")).toBe(
      "paroquia",
    );
  });

  it("devolve o valor quando não é URL", () => {
    expect(formatFacebookName("paroquia")).toBe("paroquia");
  });
});

describe("getFacebookUrl", () => {
  it("mantém URL completa", () => {
    expect(getFacebookUrl("https://facebook.com/paroquia")).toBe(
      "https://facebook.com/paroquia",
    );
  });

  it("monta a URL a partir do nome da página", () => {
    expect(getFacebookUrl("paroquia")).toBe("https://facebook.com/paroquia");
  });
});

describe("getWebsiteUrl", () => {
  it("acrescenta https:// quando falta o protocolo", () => {
    expect(getWebsiteUrl("site.com")).toBe("https://site.com");
  });

  it("mantém http e https", () => {
    expect(getWebsiteUrl("http://site.com")).toBe("http://site.com");
    expect(getWebsiteUrl("https://site.com")).toBe("https://site.com");
  });
});

describe("formatWebsiteForDisplay", () => {
  it("remove o protocolo e a barra final do domínio", () => {
    expect(formatWebsiteForDisplay("https://site.com/")).toBe("site.com");
    expect(formatWebsiteForDisplay("http://site.com")).toBe("site.com");
  });

  it("mantém a barra final quando há caminho", () => {
    expect(formatWebsiteForDisplay("https://site.com/path/")).toBe(
      "site.com/path/",
    );
  });
});
