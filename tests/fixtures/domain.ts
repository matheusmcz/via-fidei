import type { Church, Clergy, ClergyWithChurch } from "@/types";

/** Igreja mínima válida; sobrescreva só o que importa para o teste. */
export function makeChurch(overrides: Partial<Church> = {}): Church {
  return {
    id: "church-1",
    name: "Paróquia São Paulo Apóstolo",
    slug: "sao-paulo-apostolo",
    address: "Rua Exemplo, 100",
    district: "Farol",
    ...overrides,
  };
}

/** Clérigo mínimo válido (ativo, sem `endDate`). */
export function makeClergy(overrides: Partial<Clergy> = {}): Clergy {
  return {
    id: "clergy-1",
    name: "José da Silva",
    role: "parish-priest",
    title: "padre",
    ...overrides,
  };
}

/** Clérigo da listagem geral, com a igreja do vínculo ativo. */
export function makeClergyWithChurch(
  overrides: Partial<ClergyWithChurch> = {},
): ClergyWithChurch {
  return {
    ...makeClergy(),
    churchId: "church-1",
    churchName: "Paróquia São Paulo Apóstolo",
    churchSlug: "sao-paulo-apostolo",
    ...overrides,
  };
}
