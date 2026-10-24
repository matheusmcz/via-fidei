export type UserRole = "admin" | "editor";

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
  canEditChurch: (churchId: string) => boolean;
  linkedChurchIds: string[];
}
