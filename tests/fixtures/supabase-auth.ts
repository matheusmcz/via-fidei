import { vi } from "vitest";
import type { FakeQueryResult } from "./supabase";

/**
 * Cliente Supabase simulado com Auth, para Server Actions (`lib/supabase/server`)
 * e para o `AuthProvider` (`lib/supabase/client`).
 *
 * Diferente de `createFakeSupabaseClient`, este cliente:
 * - aceita uma fila de resultados por tabela (cada `from(tabela)` consome o
 *   próximo; esgotada, resolve com `{ data: null, error: null }`), porque uma
 *   action costuma consultar `profiles` mais de uma vez;
 * - registra cada cadeia de chamadas (`update`, `eq`, `in`…) com os
 *   argumentos, para o teste conferir o que seria gravado.
 */

export interface RecordedCall {
  method: string;
  args: unknown[];
}

export interface RecordedQuery {
  table: string;
  calls: RecordedCall[];
}

export interface FakeAuthClientOptions {
  /** Usuário devolvido por `auth.getUser()`; `null` = sem sessão. */
  user?: { id: string } | null;
  /** Erro devolvido por `auth.signInWithPassword()`. */
  signInError?: { message: string } | null;
  /** Erro devolvido por `auth.signOut()`. */
  signOutError?: { message: string } | null;
  tables?: Record<string, FakeQueryResult | FakeQueryResult[]>;
}

const NULL_RESULT: FakeQueryResult = { data: null, error: null };

function createRecordingBuilder(
  record: RecordedQuery,
  result: FakeQueryResult,
): PromiseLike<FakeQueryResult> {
  const handler: ProxyHandler<object> = {
    get(_target, property) {
      if (property === "then") {
        const promise = Promise.resolve(result);
        return promise.then.bind(promise);
      }
      return (...args: unknown[]) => {
        record.calls.push({ method: String(property), args });
        return builder;
      };
    },
  };
  const builder = new Proxy({}, handler) as PromiseLike<FakeQueryResult>;
  return builder;
}

export function createFakeAuthClient(options: FakeAuthClientOptions = {}) {
  const queries: RecordedQuery[] = [];
  const queues = new Map<string, FakeQueryResult | FakeQueryResult[]>(
    Object.entries(options.tables ?? {}).map(([table, result]) => [
      table,
      Array.isArray(result) ? [...result] : result,
    ]),
  );

  function nextResult(table: string): FakeQueryResult {
    const entry = queues.get(table);
    if (!entry) return NULL_RESULT;
    if (Array.isArray(entry)) return entry.shift() ?? NULL_RESULT;
    return entry;
  }

  const auth = {
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

  return {
    auth,
    queries,
    from(table: string) {
      const record: RecordedQuery = { table, calls: [] };
      queries.push(record);
      return createRecordingBuilder(record, nextResult(table));
    },
  };
}

export type FakeAuthClient = ReturnType<typeof createFakeAuthClient>;

/** Consultas à tabela que chamaram o método (ex.: `update`, `insert`). */
export function findQueries(
  client: FakeAuthClient,
  table: string,
  method: string,
): RecordedQuery[] {
  return client.queries.filter(
    (query) =>
      query.table === table && query.calls.some((call) => call.method === method),
  );
}

/** Argumentos da primeira chamada do método na consulta. */
export function argsOf(query: RecordedQuery, method: string): unknown[] {
  return query.calls.find((call) => call.method === method)?.args ?? [];
}
