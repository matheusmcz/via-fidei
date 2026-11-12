/**
 * Sinal de que existe sessão aberta, lido do `document.cookie` (VF-085).
 *
 * Serve só para decidir se vale a pena baixar o supabase-js: sem esse cookie o
 * visitante é anônimo e o `AuthProvider` não importa nada. A permissão continua
 * vindo do perfil e, na gravação, do RLS — um falso negativo aqui só esconde os
 * controles de edição até a próxima navegação (falha para o lado seguro).
 *
 * Suposições sobre o `@supabase/ssr` (conferidas na versão instalada, 0.9.x):
 * - o nome do cookie é `sb-<ref>-auth-token`, montado em
 *   `SupabaseClient` como `sb-${hostname.split(".")[0]}-auth-token`;
 * - cookie grande é fatiado em `...-auth-token.0`, `.1`…;
 * - os cookies **não** são `httpOnly` (`utils/constants.js`), porque o cliente
 *   do navegador precisa lê-los — é o que torna esta sondagem possível.
 *
 * Se o editor logado parar de ver os lápis, é aqui que se olha primeiro: basta
 * a biblioteca mudar o nome do cookie para a sondagem passar a não achar nada.
 */
const AUTH_TOKEN_COOKIE = /(?:^|;\s*)sb-[^=;]+-auth-token(?:\.\d+)?=/;

/** `true` quando os cookies contêm o token de sessão do Supabase. */
export function hasAuthTokenCookie(cookies: string): boolean {
  return AUTH_TOKEN_COOKIE.test(cookies);
}
