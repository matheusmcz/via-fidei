"use client";

import { usePathname } from "next/navigation";
import {
  createContext,
  useCallback,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  canEditChurchData as canProfileEditChurchData,
  isActiveAdmin,
  isActiveEditor,
  isDeactivated,
} from "./access";
import type { AuthContextValue, ChurchDataKind, UserProfile } from "./types";

/** Só o tipo: o supabase-js entra por `import()`, não no bundle de todos. */
import type { createClient } from "@/lib/supabase/client";

type BrowserClient = ReturnType<typeof createClient>;

/** Quem está logado e o que ele pode editar; um estado só, sem corrida. */
interface AuthState {
  user: UserProfile | null;
  linkedChurchIds: string[];
}

const SIGNED_OUT: AuthState = { user: null, linkedChurchIds: [] };

/**
 * Eventos que mudam quem está logado e pedem um novo carregamento (VF-085).
 * Ficam de fora de propósito: `INITIAL_SESSION`, que repetiria o carregamento
 * da montagem, e `TOKEN_REFRESHED`, que recarregaria perfil e vínculos a cada
 * renovação de token sem que nada tenha mudado.
 */
const RELOAD_EVENTS: ReadonlySet<string> = new Set([
  "SIGNED_IN",
  "SIGNED_OUT",
  "USER_UPDATED",
]);

/**
 * Cookie de sessão do `@supabase/ssr` (`sb-<ref>-auth-token`, que vem fatiado
 * em `.0`, `.1`… quando é grande). É só um sinal de que vale a pena baixar o
 * supabase-js: a permissão continua vindo do perfil e, no servidor, do RLS.
 */
const AUTH_COOKIE = /(?:^|;\s*)sb-[^=;]+-auth-token(?:\.\d+)?=/;

export const AuthContext = createContext<AuthContextValue>({
  user: null,
  isLoading: true,
  isAdmin: false,
  isEditor: false,
  isAuthenticated: false,
  canEditChurchData: () => false,
  linkedChurchIds: [],
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [{ user, linkedChurchIds }, setState] = useState<AuthState>(SIGNED_OUT);
  const [isLoading, setIsLoading] = useState(true);
  const [hasSessionCookie, setHasSessionCookie] = useState(false);
  const pathname = usePathname();

  // Visitante anônimo não baixa o supabase-js (VF-085). A sondagem repete a
  // cada navegação porque o login acontece em outra rota e o layout raiz não
  // remonta; uma vez encontrada a sessão, quem manda é o `onAuthStateChange`.
  useEffect(() => {
    setHasSessionCookie((found) => found || AUTH_COOKIE.test(document.cookie));
  }, [pathname]);

  useEffect(() => {
    if (!hasSessionCookie) {
      setState(SIGNED_OUT);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    let active = true;
    let unsubscribe = () => {};
    // Cada carregamento recebe um número; só o mais recente escreve o estado,
    // para que uma resposta atrasada não desfaça um logout posterior.
    let lastLoad = 0;

    function apply(load: number, next: AuthState) {
      if (!active || load !== lastLoad) return;
      setState(next);
      setIsLoading(false);
    }

    async function loadUser(supabase: BrowserClient) {
      const load = ++lastLoad;
      try {
        apply(load, await readAuthState(supabase));
      } catch (error) {
        // Falha de rede ou do Supabase: a UI volta ao estado de visitante, que
        // é o seguro (nenhum controle de edição). O RLS continua barrando a
        // escrita, e o próximo evento de sessão tenta de novo.
        reportAuthError(error);
        apply(load, SIGNED_OUT);
      }
    }

    async function start() {
      try {
        const { createClient } = await import("@/lib/supabase/client");
        if (!active) return;

        const supabase = createClient();
        const {
          data: { subscription },
        } = supabase.auth.onAuthStateChange((event, session) => {
          if (!RELOAD_EVENTS.has(event)) return;
          if (!session) {
            apply(++lastLoad, SIGNED_OUT);
            return;
          }
          void loadUser(supabase);
        });
        unsubscribe = () => subscription.unsubscribe();
        if (!active) {
          unsubscribe();
          return;
        }

        await loadUser(supabase);
      } catch (error) {
        // Inclui a falha ao baixar o chunk do supabase-js.
        reportAuthError(error);
        apply(++lastLoad, SIGNED_OUT);
      }
    }

    void start();

    return () => {
      active = false;
      unsubscribe();
    };
  }, [hasSessionCookie]);

  const canEditChurchData = useCallback(
    (churchId: string, kind: ChurchDataKind) =>
      canProfileEditChurchData(user, linkedChurchIds, churchId, kind),
    [user, linkedChurchIds],
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAdmin: isActiveAdmin(user),
        isEditor: isActiveEditor(user),
        isAuthenticated: !!user,
        canEditChurchData,
        linkedChurchIds,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Lê a sessão, o perfil e, para editor, as igrejas vinculadas. Erro lança
 * (quem chama trata); ausência de usuário ou de perfil é "sem sessão".
 */
async function readAuthState(supabase: BrowserClient): Promise<AuthState> {
  const {
    data: { user: authUser },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) throw userError;
  if (!authUser) return SIGNED_OUT;

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", authUser.id)
    .maybeSingle<UserProfile>();

  if (profileError) throw profileError;
  if (!profile) return SIGNED_OUT;

  if (isDeactivated(profile)) {
    // Perfil desativado não fica logado (VF-013): encerra a sessão aberta
    // antes da desativação. Uma falha do signOut é ignorada de propósito:
    // o estado devolvido já tira toda permissão da UI, o RLS barra a escrita
    // e o próximo carregamento tenta encerrar a sessão de novo.
    await supabase.auth.signOut();
    return SIGNED_OUT;
  }

  if (profile.role !== "editor") return { user: profile, linkedChurchIds: [] };

  const { data: links, error: linksError } = await supabase
    .from("editor_churches")
    .select("church_id")
    .eq("editor_id", authUser.id)
    .returns<{ church_id: string }[]>();

  if (linksError) throw linksError;

  return {
    user: profile,
    linkedChurchIds: links?.map((link) => link.church_id) ?? [],
  };
}

/** Deixa o erro visível no console do navegador, sem detalhe na tela. */
function reportAuthError(error: unknown) {
  const detail = error instanceof Error ? error.message : String(error);
  console.error(`Via Fidei: falha ao carregar a sessão do usuário. ${detail}`);
}
