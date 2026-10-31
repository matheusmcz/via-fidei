import { describe, expect, it } from "vitest";
import {
  EDITOR_NAME_MAX_LENGTH,
  MAX_CHURCHES_PER_EDITOR,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  parseCreateEditorInput,
  parseEditorChurchesInput,
  parseEditorId,
} from "./admin-validation";

const CHURCH_A = "3f1c2b7e-8d4a-4f6b-9a2c-1e5d7f8a9b0c";
const CHURCH_B = "a7e9d1c3-5b2f-4e8a-b6d4-0c9f8e7d6a5b";
const EDITOR_ID = "5d2e8f1a-3c4b-4a6d-8e9f-7b1c2d3e4f5a";

const validEditor = {
  name: "Maria das Graças",
  email: "maria@example.com",
  password: "senha-segura",
  churchIds: [CHURCH_A],
};

function expectError(result: { success: boolean }, message: string) {
  expect(result).toEqual({ success: false, error: message });
}

describe("parseCreateEditorInput", () => {
  it("aceita dados válidos", () => {
    expect(parseCreateEditorInput(validEditor)).toEqual({
      success: true,
      data: validEditor,
    });
  });

  it("remove espaços do nome e do email e normaliza o email em minúsculas", () => {
    const result = parseCreateEditorInput({
      ...validEditor,
      name: "  Maria das Graças  ",
      email: "  Maria@Example.COM ",
    });
    expect(result).toEqual({
      success: true,
      data: { ...validEditor, email: "maria@example.com" },
    });
  });

  it("não altera a senha (espaços contam)", () => {
    const result = parseCreateEditorInput({
      ...validEditor,
      password: " senha com espaço ",
    });
    expect(result.success && result.data.password).toBe(" senha com espaço ");
  });

  it("aceita editor sem igreja vinculada", () => {
    const result = parseCreateEditorInput({ ...validEditor, churchIds: [] });
    expect(result.success && result.data.churchIds).toEqual([]);
  });

  it("remove igrejas repetidas", () => {
    const result = parseCreateEditorInput({
      ...validEditor,
      churchIds: [CHURCH_A, CHURCH_B, CHURCH_A],
    });
    expect(result.success && result.data.churchIds).toEqual([CHURCH_A, CHURCH_B]);
  });

  it("exige o nome", () => {
    expectError(
      parseCreateEditorInput({ ...validEditor, name: "   " }),
      "Informe o nome do editor",
    );
    expectError(
      parseCreateEditorInput({ ...validEditor, name: null }),
      "Informe o nome do editor",
    );
  });

  it("limita o tamanho do nome", () => {
    expectError(
      parseCreateEditorInput({
        ...validEditor,
        name: "a".repeat(EDITOR_NAME_MAX_LENGTH + 1),
      }),
      `O nome deve ter no máximo ${EDITOR_NAME_MAX_LENGTH} caracteres`,
    );
  });

  it("exige email em formato válido", () => {
    expectError(
      parseCreateEditorInput({ ...validEditor, email: "maria@" }),
      "Informe um email válido",
    );
    expectError(
      parseCreateEditorInput({ ...validEditor, email: null }),
      "Informe um email válido",
    );
  });

  it("exige a senha com tamanho mínimo e máximo", () => {
    expectError(
      parseCreateEditorInput({
        ...validEditor,
        password: "a".repeat(PASSWORD_MIN_LENGTH - 1),
      }),
      `A senha deve ter pelo menos ${PASSWORD_MIN_LENGTH} caracteres`,
    );
    expectError(
      parseCreateEditorInput({
        ...validEditor,
        password: "a".repeat(PASSWORD_MAX_LENGTH + 1),
      }),
      `A senha deve ter no máximo ${PASSWORD_MAX_LENGTH} caracteres`,
    );
    expectError(
      parseCreateEditorInput({ ...validEditor, password: null }),
      `A senha deve ter pelo menos ${PASSWORD_MIN_LENGTH} caracteres`,
    );
  });

  it("normaliza os UUIDs em minúsculas antes de remover repetidos", () => {
    const result = parseCreateEditorInput({
      ...validEditor,
      churchIds: [CHURCH_A.toUpperCase(), CHURCH_A],
    });
    expect(result.success && result.data.churchIds).toEqual([CHURCH_A]);
  });

  it("recusa igreja com ID que não é UUID", () => {
    expectError(
      parseCreateEditorInput({ ...validEditor, churchIds: [CHURCH_A, "abc"] }),
      "Igreja inválida",
    );
  });

  it("limita a quantidade de igrejas", () => {
    const churchIds = Array.from(
      { length: MAX_CHURCHES_PER_EDITOR + 1 },
      (_, i) => `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`,
    );
    expectError(
      parseCreateEditorInput({ ...validEditor, churchIds }),
      `Selecione no máximo ${MAX_CHURCHES_PER_EDITOR} igrejas`,
    );
  });
});

describe("parseEditorId", () => {
  it("aceita um UUID, em minúsculas", () => {
    expect(parseEditorId(EDITOR_ID)).toEqual({ success: true, data: EDITOR_ID });
    expect(parseEditorId(EDITOR_ID.toUpperCase())).toEqual({
      success: true,
      data: EDITOR_ID,
    });
  });

  it.each([["abc"], [""], [null], [undefined], [123]])(
    "recusa %s",
    (value) => {
      expectError(parseEditorId(value), "Editor inválido");
    },
  );
});

describe("parseEditorChurchesInput", () => {
  it("aceita editor e lista de igrejas, sem repetições", () => {
    expect(
      parseEditorChurchesInput({
        editorId: EDITOR_ID,
        churchIds: [CHURCH_A, CHURCH_A, CHURCH_B],
      }),
    ).toEqual({
      success: true,
      data: { editorId: EDITOR_ID, churchIds: [CHURCH_A, CHURCH_B] },
    });
  });

  it("aceita lista vazia (desvincular tudo)", () => {
    expect(
      parseEditorChurchesInput({ editorId: EDITOR_ID, churchIds: [] }),
    ).toEqual({ success: true, data: { editorId: EDITOR_ID, churchIds: [] } });
  });

  it("recusa editor inválido", () => {
    expectError(
      parseEditorChurchesInput({ editorId: "abc", churchIds: [] }),
      "Editor inválido",
    );
  });

  it("recusa igreja inválida ou lista ausente", () => {
    expectError(
      parseEditorChurchesInput({ editorId: EDITOR_ID, churchIds: ["abc"] }),
      "Igreja inválida",
    );
    expectError(
      parseEditorChurchesInput({ editorId: EDITOR_ID, churchIds: null }),
      "Igreja inválida",
    );
  });
});
