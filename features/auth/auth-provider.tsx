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
import { hasAuthTokenCookie } from "./session-cookie";
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
 * Eventos de sessão que o provider escuta (VF-085).
 *
 * `INITIAL_SESSION` é a sessão que o `auth-js` entrega a todo ouvinte novo:
 * é ele quem faz o carregamento da montagem, no lugar de uma chamada direta —
 * **uma** fonte de verdade, em vez das duas que carregavam o perfil em dobro.
 * `TOKEN_REFRESHED` fica de fora: renovar o token não muda quem está logado.
 *
 * Nome de evento não basta para decidir recarga: o `auth-js` emite `SIGNED_IN`
 * também ao recuperar a sessão do storage (`_recoverAndRefresh`) e **a cada
 * vez que a aba volta a ficar visível** (`_onVisibilityChanged`), além de
 * replicar o evento para as outras abas. Daí a deduplicação por identidade da
 * sessão abaixo: só recarrega quando o usuário é outro.
 */
const SESSION_EVENTS: ReadonlySet<string> = new Set([
  "INITIAL_SESSION",
  "SIGNED_IN",
  "SIGNED_OUT",
  "USER_UPDATED",
]);

/**
 * Prazo para o primeiro evento chegar, antes de a UI desistir e seguir como
 * visitante. Existe porque a entrega do `INITIAL_SESSION` não é garantida: ela
 * roda em uma IIFE sem `catch` dentro do `auth-js`, que espera a inicialização
 * e depois um Web Lock com prazo de 5 s (`lockAcquireTimeout`) — abas
 * disputando o lock, ou uma inicialização que rejeite, deixariam o provider
 * preso em "carregando" para sempre. A margem é maior que esses 5 s para não
 * atropelar uma inicialização lenta mas bem-sucedida; se o evento chegar
 * depois do prazo, o carregamento acontece normalmente.
 */
const SESSION_EVENT_TIMEOUT_MS = 8_000;

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
    setHasSessionCookie((found) => found || hasAuthTokenCookie(document.cookie));
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
    // Usuário já carregado ou em carregamento; `undefined` = ainda não sabemos.
    let knownUserId: string | null | undefined;

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
        // escrita, e esquecer o usuário deixa o próximo evento tentar de novo.
        reportAuthError(error);
        knownUserId = undefined;
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
          if (!SESSION_EVENTS.has(event)) return;

          if (!session) {
            knownUserId = null;
            apply(++lastLoad, SIGNED_OUT);
            return;
          }

          // `USER_UPDATED` altera o próprio usuário: recarrega mesmo sendo ele.
          const isSameSession =
            event !== "USER_UPDATED" && session.user.id === knownUserId;
          if (isSameSession) return;

          knownUserId = session.user.id;
          void loadUser(supabase);
        });

        unsubscribe = () => subscription.unsubscribe();
        if (!active) unsubscribe();
      } catch (error) {
        // Inclui a falha ao baixar o chunk do supabase-js.
        reportAuthError(error);
        apply(++lastLoad, SIGNED_OUT);
      }
    }

    // Nenhum evento chegou no prazo: sai de "carregando" como visitante, com o
    // motivo no console. `knownUserId` segue `undefined`, então um evento
    // atrasado ainda carrega a sessão e corrige a tela.
    const giveUp = setTimeout(() => {
      if (knownUserId !== undefined) return;
      reportAuthProblem(
        `nenhum evento de sessão em ${SESSION_EVENT_TIMEOUT_MS} ms; seguindo como visitante.`,
      );
      apply(++lastLoad, SIGNED_OUT);
    }, SESSION_EVENT_TIMEOUT_MS);

    void start();

    return () => {
      active = false;
      clearTimeout(giveUp);
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

/** Deixa o problema visível no console do navegador, sem detalhe na tela. */
function reportAuthProblem(message: string) {
  console.error(`Via Fidei: ${message}`);
}

function reportAuthError(error: unknown) {
  reportAuthProblem(
    `falha ao carregar a sessão do usuário. ${describeError(error)}`,
  );
}

/**
 * Mensagem de um `Error` (`AuthError`), de um erro do PostgREST (objeto com
 * `message`, que não herda de `Error`) ou de um valor qualquer.
 */
function describeError(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error !== null && "message" in error) {
    return String((error as { message: unknown }).message);
  }
  return String(error);
}
