"use client";

import { createClient } from "@/lib/supabase/client";
import {
  createContext,
  useCallback,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { AuthContextValue, UserProfile } from "./types";

export const AuthContext = createContext<AuthContextValue>({
  user: null,
  isLoading: true,
  isAdmin: false,
  isEditor: false,
  isAuthenticated: false,
  canEditChurch: () => false,
  linkedChurchIds: [],
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [linkedChurchIds, setLinkedChurchIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    async function loadUser() {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();

      if (!authUser) {
        setUser(null);
        setLinkedChurchIds([]);
        setIsLoading(false);
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", authUser.id)
        .single();

      if (profile) {
        setUser(profile as UserProfile);

        if (profile.role === "editor") {
          const { data: links } = await supabase
            .from("editor_churches")
            .select("church_id")
            .eq("editor_id", authUser.id);

          setLinkedChurchIds(
            links?.map((l: { church_id: string }) => l.church_id) ?? []
          );
        }
      }

      setIsLoading(false);
    }

    loadUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        setUser(null);
        setLinkedChurchIds([]);
        setIsLoading(false);
      } else {
        loadUser();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const isAdmin = user?.role === "admin";
  const isEditor = user?.role === "editor";

  const canEditChurch = useCallback(
    (churchId: string) => {
      if (isAdmin) return true;
      if (isEditor) return linkedChurchIds.includes(churchId);
      return false;
    },
    [isAdmin, isEditor, linkedChurchIds]
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAdmin,
        isEditor,
        isAuthenticated: !!user,
        canEditChurch,
        linkedChurchIds,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
