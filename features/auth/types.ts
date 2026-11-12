export type UserRole = "admin" | "editor";

/**
 * Tipos de dado da igreja que a UI deixa editar, na granularidade das
 * permissões da D3 (com os complementos D11, D14 e D15):
 *
 * - `identity`: nome, slug, endereço, bairro e tipo — só admin;
 * - `contact`: contato, foto da igreja e link do Google Maps (D11);
 * - `schedule`: horários e atividades;
 * - `ministries`: vínculo da igreja com grupos, movimentos e pastorais (D14);
 * - `clergy`: cadastro de clérigos e vínculos com a igreja — só admin (D15).
 */
export type ChurchDataKind =
  | "identity"
  | "contact"
  | "schedule"
  | "ministries"
  | "clergy";

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AuthContextValue {
  user: UserProfile | null;
  isLoading: boolean;
  isAdmin: boolean;
  isEditor: boolean;
  isAuthenticated: boolean;
  canEditChurchData: (churchId: string, kind: ChurchDataKind) => boolean;
  linkedChurchIds: string[];
}
