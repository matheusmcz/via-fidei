import { createPublicClient } from "@/lib/supabase/public";
import { vi } from "vitest";

/**
 * Cliente Supabase simulado para testes de integração sem banco.
 *
 * ## Como montar o cenário
 *
 * `createFakeSupabaseClient({ responses, user, signInError, signOutError })`:
 *
 * - `responses` mapeia tabela → resposta. Uma resposta só vale para todo
 *   `from(tabela)`; um **array** é uma fila, e cada `from(tabela)` consome a
 *   próxima (útil quando a action consulta `profiles` mais de uma vez).
 *   Consultar tabela sem resposta, ou esgotar a fila, **lança**: o cenário
 *   incompleto aparece como erro, em vez de virar um "sucesso vazio". Em
 *   componente de cliente (ex.: `AuthProvider`), o efeito não trata esse erro:
 *   ele vira rejeição não tratada, e a mensagem aparece na seção de
 *   "unhandled errors" do Vitest, não na asserção que falhou.
 * - A resposta é `{ data, error }` — `ok(data)` é o atalho para `error: null` —
 *   ou `{ reject: Error }`, que simula a promessa da consulta sendo rejeitada
 *   (ex.: `fetch` falhou sem que o supabase-js convertesse a falha em `error`).
 * - `user`, `signInError` e `signOutError` configuram o `auth` simulado
 *   (`getUser`, `signInWithPassword`, `signOut`, `onAuthStateChange`).
 *
 * Cada `from(tabela)` devolve um query builder que aceita qualquer cadeia de
 * filtros (`select`, `eq`, `order`, `update`, `maybeSingle`…) e, ao ser
 * aguardado, resolve com a resposta configurada. Assim os testes verificam o
 * mapeamento das linhas e o que seria gravado sem depender da forma exata da
 * consulta. Consulta aninhada responde pela tabela raiz, com as relações
 * embutidas na própria linha.
 *
 * ## Como conferir o que foi consultado
 *
 * - `client.tables`: tabelas consultadas (`from`), na ordem das chamadas.
 * - `client.queries`: uma entrada por `from`, com a cadeia de chamadas.
 * - `callsTo(client, tabela, método)`: argumentos de cada chamada do método na
 *   tabela, em todas as consultas (ex.: os `eq` de `churches`).
 * - `findQueries(client, tabela, método)` + `argsOf(query, método)`: a consulta
 *   que chamou o método e seus argumentos (ex.: o `update` em `profiles`).
 *
 * ## Exemplos
 *
 * ```ts
 * // Server Action: duas leituras em `profiles`, uma escrita, e o que seria gravado.
 * vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
 *
 * const client = createFakeSupabaseClient({
 *   user: { id: ADMIN_ID },
 *   responses: {
 *     profiles: [
 *       ok({ role: "admin", is_active: true }), // requireAdmin
 *       ok({ role: "editor", is_active: true }), // findEditorTarget
 *       ok({ id: EDITOR_ID }), // update(...).select("id").single()
 *     ],
 *   },
 * });
 * vi.mocked(createClient).mockResolvedValue(
 *   client as unknown as Awaited<ReturnType<typeof createClient>>,
 * );
 *
 * await toggleEditorActive(EDITOR_ID);
 *
 * expect(client.tables).toEqual(["profiles", "profiles", "profiles"]);
 * const [update] = findQueries(client, "profiles", "update");
 * expect(argsOf(update, "update")).toEqual([{ is_active: false }]);
 * ```
 *
 * ```ts
 * // Leitura pública: `mockPublicClient` já devolve o simulado em `createPublicClient()`.
 * vi.mock("@/lib/supabase/public", () => ({ createPublicClient: vi.fn() }));
 *
 * const client = mockPublicClient({ churches: ok(row) });
 * await getChurchBySlug(SLUG);
 * expect(callsTo(client, "churches", "eq")).toEqual([["slug", SLUG]]);
 * ```
 */

export interface FakeQueryResult {
  data: unknown;
  error: { message: string } | null;
}

/**
 * Simula a promessa da consulta sendo rejeitada (ex.: `fetch` falhou sem que
 * o supabase-js convertesse a falha em `error`).
 */
export interface FakeQueryRejection {
  reject: Error;
}

export type FakeQueryResponse = FakeQueryResult | FakeQueryRejection;

/** Resposta única para toda consulta à tabela, ou fila consumida por `from`. */
export type FakeTableResponses = Record<
  string,
  FakeQueryResponse | FakeQueryResponse[]
>;

/** Resposta de sucesso: os dados recebidos, sem erro. */
export function ok(data: unknown): FakeQueryResult {
  return { data, error: null };
}

/** Uma chamada encadeada no builder de uma consulta. */
export interface FakeQueryCall {
  method: string;
  args: unknown[];
}

/** Uma consulta: o `from(tabela)` e a cadeia de chamadas que veio depois. */
export interface FakeQuery {
  table: string;
  calls: FakeQueryCall[];
}

export interface FakeSupabaseOptions {
  /** Respostas por tabela; array é fila. Tabela consultada sem resposta lança. */
  responses?: FakeTableResponses;
  /** Usuário devolvido por `auth.getUser()`; ausente ou `null` = sem sessão. */
  user?: { id: string } | null;
  /** Erro devolvido por `auth.signInWithPassword()`. */
  signInError?: { message: string } | null;
  /** Erro devolvido por `auth.signOut()`. */
  signOutError?: { message: string } | null;
}

function isRejection(response: FakeQueryResponse): response is FakeQueryRejection {
  return "reject" in response;
}

function settle(response: FakeQueryResponse): Promise<FakeQueryResult> {
  return isRejection(response)
    ? Promise.reject(response.reject)
    : Promise.resolve(response);
}

function createQueryBuilder(
  query: FakeQuery,
  response: FakeQueryResponse,
): PromiseLike<FakeQueryResult> {
  const handler: ProxyHandler<object> = {
    get(_target, property) {
      if (property === "then") {
        // A promessa nasce só quando a consulta é aguardada: uma rejeição
        // configurada não vira "unhandled rejection" em builders não usados.
        return (
          onFulfilled?: (value: FakeQueryResult) => unknown,
          onRejected?: (reason: unknown) => unknown,
        ) => settle(response).then(onFulfilled, onRejected);
      }
      // Qualquer método encadeado é registrado e devolve o próprio builder.
      return (...args: unknown[]) => {
        query.calls.push({ method: String(property), args });
        return builder;
      };
    },
  };
  const builder = new Proxy({}, handler) as PromiseLike<FakeQueryResult>;
  return builder;
}

function createFakeAuth(options: FakeSupabaseOptions) {
  return {
    getUser: vi.fn(async () => ({
      data: { user: options.user ?? null },
      error: null,
    })),
    signInWithPassword: vi.fn(async () => ({
      data: {},
      error: options.signInError ?? null,
    })),
    signOut: vi.fn(async (_options?: { scope?: string }) => ({
      error: options.signOutError ?? null,
    })),
    onAuthStateChange: vi.fn(() => ({
      data: { subscription: { unsubscribe: vi.fn() } },
    })),
  };
}

export type FakeSupabaseAuth = ReturnType<typeof createFakeAuth>;

export interface FakeSupabaseClient {
  auth: FakeSupabaseAuth;
  /** Uma entrada por `from`, na ordem das consultas. */
  readonly queries: FakeQuery[];
  /** Tabelas consultadas (`from`), na ordem das consultas. */
  readonly tables: string[];
  from(table: string): PromiseLike<FakeQueryResult>;
}

export function createFakeSupabaseClient(
  options: FakeSupabaseOptions = {},
): FakeSupabaseClient {
  const queries: FakeQuery[] = [];
  const queues = new Map<string, FakeQueryResponse | FakeQueryResponse[]>(
    Object.entries(options.responses ?? {}).map(([table, response]) => [
      table,
      Array.isArray(response) ? [...response] : response,
    ]),
  );

  // Cenário incompleto é erro de teste, não "nenhuma linha": sem isso, uma
  // tabela esquecida em `responses` passaria por consulta vazia bem-sucedida.
  function nextResponse(table: string): FakeQueryResponse {
    const entry = queues.get(table);
    if (!entry) {
      throw new Error(
        `Cliente Supabase simulado: falta a resposta da tabela "${table}" em \`responses\`.`,
      );
    }
    if (!Array.isArray(entry)) return entry;
    const next = entry.shift();
    if (!next) {
      throw new Error(
        `Cliente Supabase simulado: a fila de respostas da tabela "${table}" acabou; configure uma resposta por \`from("${table}")\`.`,
      );
    }
    return next;
  }

  return {
    auth: createFakeAuth(options),
    queries,
    get tables(): string[] {
      return queries.map((query) => query.table);
    },
    from(table: string): PromiseLike<FakeQueryResult> {
      const query: FakeQuery = { table, calls: [] };
      queries.push(query);
      return createQueryBuilder(query, nextResponse(table));
    },
  };
}

/** Argumentos de cada chamada do método na tabela (ex.: os `eq` de `churches`). */
export function callsTo(
  client: FakeSupabaseClient,
  table: string,
  method: string,
): unknown[][] {
  return client.queries
    .filter((query) => query.table === table)
    .flatMap((query) =>
      query.calls.filter((call) => call.method === method).map((call) => call.args),
    );
}

/** Consultas à tabela que chamaram o método (ex.: `update`, `insert`). */
export function findQueries(
  client: FakeSupabaseClient,
  table: string,
  method: string,
): FakeQuery[] {
  return client.queries.filter(
    (query) =>
      query.table === table && query.calls.some((call) => call.method === method),
  );
}

/** Argumentos da primeira chamada do método na consulta. */
export function argsOf(query: FakeQuery, method: string): unknown[] {
  return query.calls.find((call) => call.method === method)?.args ?? [];
}

/**
 * Faz o `createPublicClient` devolver o cliente simulado. O arquivo de teste
 * precisa declarar `vi.mock("@/lib/supabase/public", () => ({ createPublicClient: vi.fn() }))`.
 */
export function mockPublicClient(
  responses: FakeTableResponses,
): FakeSupabaseClient {
  const client = createFakeSupabaseClient({ responses });
  vi.mocked(createPublicClient).mockReturnValue(
    client as unknown as ReturnType<typeof createPublicClient>,
  );
  return client;
}
