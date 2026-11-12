import { describe, expect, it } from "vitest";
import {
  canEditChurch,
  canEditChurchData,
  getLoginOutcome,
  INACTIVE_PROFILE_MESSAGE,
  isActiveAdmin,
  isActiveEditor,
  isDeactivated,
  isEditorTarget,
  PROFILE_UNAVAILABLE_MESSAGE,
  type ProfileAccess,
} from "./access";

const activeAdmin: ProfileAccess = { role: "admin", is_active: true };
const inactiveAdmin: ProfileAccess = { role: "admin", is_active: false };
const activeEditor: ProfileAccess = { role: "editor", is_active: true };
const inactiveEditor: ProfileAccess = { role: "editor", is_active: false };

describe("getLoginOutcome", () => {
  it("leva o admin ativo para /admin", () => {
    expect(getLoginOutcome(activeAdmin)).toEqual({ redirectTo: "/admin" });
  });

  it("leva o editor ativo para a home", () => {
    expect(getLoginOutcome(activeEditor)).toEqual({ redirectTo: "/" });
  });

  it("recusa o editor desativado com mensagem clara", () => {
    expect(getLoginOutcome(inactiveEditor)).toEqual({
      error: INACTIVE_PROFILE_MESSAGE,
    });
  });

  it("recusa o admin desativado", () => {
    expect(getLoginOutcome(inactiveAdmin)).toEqual({
      error: INACTIVE_PROFILE_MESSAGE,
    });
  });

  it("recusa quando o perfil não foi carregado", () => {
    expect(getLoginOutcome(null)).toEqual({
      error: PROFILE_UNAVAILABLE_MESSAGE,
    });
  });
});

describe("isActiveAdmin / isActiveEditor", () => {
  it("só considera o papel quando o perfil está ativo", () => {
    expect(isActiveAdmin(activeAdmin)).toBe(true);
    expect(isActiveAdmin(inactiveAdmin)).toBe(false);
    expect(isActiveAdmin(activeEditor)).toBe(false);
    expect(isActiveAdmin(null)).toBe(false);

    expect(isActiveEditor(activeEditor)).toBe(true);
    expect(isActiveEditor(inactiveEditor)).toBe(false);
    expect(isActiveEditor(activeAdmin)).toBe(false);
    expect(isActiveEditor(null)).toBe(false);
  });
});

describe("canEditChurch", () => {
  const linked = ["igreja-vinculada"];

  it("admin ativo edita qualquer igreja", () => {
    expect(canEditChurch(activeAdmin, [], "qualquer-igreja")).toBe(true);
  });

  it("editor ativo edita só as igrejas vinculadas", () => {
    expect(canEditChurch(activeEditor, linked, "igreja-vinculada")).toBe(true);
    expect(canEditChurch(activeEditor, linked, "outra-igreja")).toBe(false);
  });

  it("editor desativado não edita nem a igreja vinculada", () => {
    expect(canEditChurch(inactiveEditor, linked, "igreja-vinculada")).toBe(
      false,
    );
  });

  it("admin desativado não edita", () => {
    expect(canEditChurch(inactiveAdmin, [], "qualquer-igreja")).toBe(false);
  });

  it("visitante não edita", () => {
    expect(canEditChurch(null, linked, "igreja-vinculada")).toBe(false);
  });
});

describe("canEditChurchData", () => {
  const CHURCH = "igreja-vinculada";
  const linked = [CHURCH];
  const editorData = ["contact", "schedule", "ministries"] as const;
  const adminOnlyData = ["identity", "clergy"] as const;

  it("admin ativo edita todo tipo de dado de qualquer igreja", () => {
    for (const kind of [...editorData, ...adminOnlyData]) {
      expect(canEditChurchData(activeAdmin, [], "qualquer-igreja", kind)).toBe(
        true,
      );
    }
  });

  it("editor vinculado edita contato, horários e ministérios (D3, D11, D14)", () => {
    for (const kind of editorData) {
      expect(canEditChurchData(activeEditor, linked, CHURCH, kind)).toBe(true);
    }
  });

  it("editor vinculado não edita identidade nem clero (D3, D15)", () => {
    for (const kind of adminOnlyData) {
      expect(canEditChurchData(activeEditor, linked, CHURCH, kind)).toBe(false);
    }
  });

  it("editor não edita nada em igreja não vinculada", () => {
    for (const kind of [...editorData, ...adminOnlyData]) {
      expect(canEditChurchData(activeEditor, linked, "outra-igreja", kind)).toBe(
        false,
      );
    }
  });

  it("editor desativado e visitante não editam nada", () => {
    for (const kind of [...editorData, ...adminOnlyData]) {
      expect(canEditChurchData(inactiveEditor, linked, CHURCH, kind)).toBe(
        false,
      );
      expect(canEditChurchData(null, linked, CHURCH, kind)).toBe(false);
    }
  });
});

describe("isDeactivated", () => {
  it("só é verdadeiro para perfil carregado e inativo", () => {
    expect(isDeactivated(inactiveEditor)).toBe(true);
    expect(isDeactivated(inactiveAdmin)).toBe(true);
    expect(isDeactivated(activeEditor)).toBe(false);
    expect(isDeactivated(null)).toBe(false);
  });
});

describe("isEditorTarget", () => {
  it("aceita um perfil de editor, ativo ou não", () => {
    expect(isEditorTarget(activeEditor)).toBe(true);
    expect(isEditorTarget(inactiveEditor)).toBe(true);
  });

  it("recusa um admin como alvo (inclusive o próprio admin)", () => {
    expect(isEditorTarget(activeAdmin)).toBe(false);
    expect(isEditorTarget(inactiveAdmin)).toBe(false);
  });

  it("recusa quando o perfil não existe", () => {
    expect(isEditorTarget(null)).toBe(false);
  });
});
