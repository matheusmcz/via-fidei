import { createPublicClient } from "@/lib/supabase/public";
import { vi } from "vitest";

/**
 * Cliente Supabase simulado para testes de integração sem banco.
 *
 * Cada `from(tabela)` devolve um query builder que aceita qualquer cadeia de
 * filtros (`select`, `eq`, `order`, `single`…) e, ao ser aguardado, resolve
 * com o resultado configurado para a tabela. Assim os testes verificam o
 * mapeamento das linhas para o domínio sem depender da forma exata da consulta.
 */

export interface FakeQueryResult {
  data: unknown;
  error: { message: string } | null;
}

export interface FakeSupabaseClient {
  from: (table: string) => PromiseLike<FakeQueryResult>;
  /** Tabelas consultadas, na ordem das chamadas. */
  readonly calls: string[];
}

const EMPTY_RESULT: FakeQueryResult = { data: [], error: null };

function createQueryBuilder(
  result: FakeQueryResult,
): PromiseLike<FakeQueryResult> {
  const handler: ProxyHandler<object> = {
    get(_target, property) {
      if (property === "then") {
        const promise = Promise.resolve(result);
        return promise.then.bind(promise);
      }
      // Qualquer método encadeado devolve o próprio builder.
      return () => builder;
    },
  };
  const builder = new Proxy({}, handler) as PromiseLike<FakeQueryResult>;
  return builder;
}

export function createFakeSupabaseClient(
  resultsByTable: Record<string, FakeQueryResult>,
): FakeSupabaseClient {
  const calls: string[] = [];

  return {
    calls,
    from(table: string) {
      calls.push(table);
      return createQueryBuilder(resultsByTable[table] ?? EMPTY_RESULT);
    },
  };
}

/**
 * Faz o `createPublicClient` devolver o cliente simulado. O arquivo de teste
 * precisa declarar `vi.mock("@/lib/supabase/public", () => ({ createPublicClient: vi.fn() }))`.
 */
export function mockPublicClient(
  resultsByTable: Record<string, FakeQueryResult>,
): FakeSupabaseClient {
  const client = createFakeSupabaseClient(resultsByTable);
  vi.mocked(createPublicClient).mockReturnValue(
    client as unknown as ReturnType<typeof createPublicClient>,
  );
  return client;
}
