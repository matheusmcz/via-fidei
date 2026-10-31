import type { UserRole } from "./types";

/**
 * Regras de acesso derivadas do perfil (`profiles.role` e `profiles.is_active`).
 * Funções puras: valem no servidor (login, Server Actions) e no cliente
 * (`AuthProvider`). A permissão real continua no RLS e nas Server Actions.
 */

/** Campos do perfil que decidem o acesso. */
export interface ProfileAccess {
  role: UserRole;
  is_active: boolean;
}

export const INACTIVE_PROFILE_MESSAGE =
  "Esta conta está desativada. Fale com o administrador do Via Fidei para reativá-la.";

export const PROFILE_UNAVAILABLE_MESSAGE =
  "Não foi possível carregar o seu perfil. Tente novamente.";

export const EDITOR_NOT_FOUND_MESSAGE = "Editor não encontrado";

/** Complemento da mensagem quando o login recusou, mas não conseguiu encerrar a sessão. */
export const SIGN_OUT_FAILED_HINT =
  "Não foi possível encerrar a sessão; feche o navegador ou limpe os cookies do site.";

/** Resultado do login: para onde ir ou por que a entrada foi recusada. */
export type LoginOutcome = { redirectTo: "/admin" | "/" } | { error: string };

export function isActiveAdmin(profile: ProfileAccess | null): boolean {
  return profile?.is_active === true && profile.role === "admin";
}

export function isActiveEditor(profile: ProfileAccess | null): boolean {
  return profile?.is_active === true && profile.role === "editor";
}

/** Perfil carregado e desativado: a sessão dele deve ser encerrada. */
export function isDeactivated(profile: ProfileAccess | null): boolean {
  return profile !== null && !profile.is_active;
}

/** Perfil inativo ou ausente não entra; admin vai para o painel, editor para a home. */
export function getLoginOutcome(profile: ProfileAccess | null): LoginOutcome {
  if (!profile) return { error: PROFILE_UNAVAILABLE_MESSAGE };
  if (!profile.is_active) return { error: INACTIVE_PROFILE_MESSAGE };
  return { redirectTo: profile.role === "admin" ? "/admin" : "/" };
}

/** Admin ativo edita qualquer igreja; editor ativo, só as vinculadas. */
export function canEditChurch(
  profile: ProfileAccess | null,
  linkedChurchIds: readonly string[],
  churchId: string,
): boolean {
  if (isActiveAdmin(profile)) return true;
  if (isActiveEditor(profile)) return linkedChurchIds.includes(churchId);
  return false;
}

/**
 * As ações de gestão de editores só aceitam como alvo um perfil `editor`.
 * Um admin (inclusive o próprio) é tratado como não encontrado, para que
 * ninguém se tranque fora do painel nem altere outro admin por essa via.
 */
export function isEditorTarget(
  target: ProfileAccess | null,
): target is ProfileAccess {
  return target?.role === "editor";
}
