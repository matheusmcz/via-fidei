import { createPublicClient } from "@/lib/supabase/public";
import { vi } from "vitest";

/**
 * Cliente Supabase simulado para testes de integração sem banco.
 *
 * Cada `from(tabela)` devolve um query builder que aceita qualquer cadeia de
 * filtros (`select`, `eq`, `order`, `maybeSingle`…) e, ao ser aguardado,
 * resolve com a resposta configurada para a tabela. Assim os testes verificam
 * o mapeamento das linhas para o domínio sem depender da forma exata da
 * consulta.
 *
 * Toda chamada encadeada fica registrada em `calls` (`{ table, method, args }`),
 * para os testes que precisam conferir um filtro, como `eq("slug", …)`.
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

/** Uma chamada encadeada no builder de uma tabela. */
export interface FakeQueryCall {
  table: string;
  method: string;
  args: unknown[];
}

export interface FakeSupabaseClient {
  from: (table: string) => PromiseLike<FakeQueryResult>;
  /** Tabelas consultadas (`from`), na ordem das chamadas. */
  readonly tables: string[];
  /** Métodos encadeados depois do `from`, na ordem das chamadas. */
  readonly calls: FakeQueryCall[];
}

const EMPTY_RESULT: FakeQueryResult = { data: [], error: null };

function isRejection(response: FakeQueryResponse): response is FakeQueryRejection {
  return "reject" in response;
}

function settle(response: FakeQueryResponse): Promise<FakeQueryResult> {
  return isRejection(response)
    ? Promise.reject(response.reject)
    : Promise.resolve(response);
}

function createQueryBuilder(
  table: string,
  response: FakeQueryResponse,
  calls: FakeQueryCall[],
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
        calls.push({ table, method: String(property), args });
        return builder;
      };
    },
  };
  const builder = new Proxy({}, handler) as PromiseLike<FakeQueryResult>;
  return builder;
}

/**
 * Tabela sem resposta configurada resolve com lista vazia e sem erro.
 */
export function createFakeSupabaseClient(
  responsesByTable: Record<string, FakeQueryResponse>,
): FakeSupabaseClient {
  const tables: string[] = [];
  const calls: FakeQueryCall[] = [];

  return {
    tables,
    calls,
    from(table: string) {
      tables.push(table);
      return createQueryBuilder(
        table,
        responsesByTable[table] ?? EMPTY_RESULT,
        calls,
      );
    },
  };
}

/** Chamadas de um método específico em uma tabela (ex.: os `eq` de `churches`). */
export function callsTo(
  client: FakeSupabaseClient,
  table: string,
  method: string,
): unknown[][] {
  return client.calls
    .filter((call) => call.table === table && call.method === method)
    .map((call) => call.args);
}

/**
 * Faz o `createPublicClient` devolver o cliente simulado. O arquivo de teste
 * precisa declarar `vi.mock("@/lib/supabase/public", () => ({ createPublicClient: vi.fn() }))`.
 */
export function mockPublicClient(
  responsesByTable: Record<string, FakeQueryResponse>,
): FakeSupabaseClient {
  const client = createFakeSupabaseClient(responsesByTable);
  vi.mocked(createPublicClient).mockReturnValue(
    client as unknown as ReturnType<typeof createPublicClient>,
  );
  return client;
}
