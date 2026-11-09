import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/**
 * Três projetos Vitest:
 * - `unit`: regras puras (`*.test.ts`), ambiente node. Unitário é sempre `.ts`;
 *   o que renderiza componente é integração.
 * - `integration`: componentes e queries com dependências simuladas
 *   (`*.integration.test.ts(x)`), ambiente jsdom. Não acessa o Supabase real.
 * - `db`: testes contra o Postgres do **Supabase local** (`tests/db/*.db.test.ts`,
 *   VF-098, D10). **Opt-in:** só existe com `VITEST_DB=1`, que o script
 *   `npm run test:db` define. Sem isso, `npm test`, `npm run test:unit`,
 *   `npm run test:integration` e `npm run test:watch` nem enxergam o projeto —
 *   é o que mantém o CI atual (sem Docker) passando.
 *
 * Os specs do Playwright ficam em `tests/e2e/` e não passam pelo Vitest.
 */

/** O projeto `db` precisa de Docker + `supabase start`, então é opt-in. */
const dbProjectEnabled = process.env.VITEST_DB === "1";

/**
 * Projeto `db`. Mantém o `setupFiles` da raiz de propósito: `tests/setup/env.ts`
 * apaga as variáveis do Supabase, e os clientes de `tests/db/client.ts` leem o
 * `.env.test` do disco. Assim nenhum teste do projeto `db` alcança produção,
 * nem indiretamente por `lib/supabase/*`.
 *
 * `fileParallelism: false`: os arquivos compartilham um banco só, então rodam
 * em série. O cenário é montado uma vez pelo `globalSetup`.
 */
const dbProject = {
  extends: true as const,
  test: {
    name: "db",
    environment: "node",
    include: ["tests/db/**/*.db.test.ts"],
    globalSetup: ["./tests/db/global-setup.ts"],
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
};

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./", import.meta.url)),
    },
  },
  test: {
    // Comum aos dois projetos: garante que nenhum teste alcance o Supabase real.
    setupFiles: ["./tests/setup/env.ts"],
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          environment: "node",
          include: ["{app,lib,features,components,types}/**/*.test.ts"],
          exclude: ["**/*.integration.test.*"],
        },
      },
      {
        extends: true,
        test: {
          name: "integration",
          environment: "jsdom",
          include: ["{app,lib,features,components}/**/*.integration.test.{ts,tsx}"],
          setupFiles: ["./tests/setup/env.ts", "./tests/setup/dom.ts"],
        },
      },
      ...(dbProjectEnabled ? [dbProject] : []),
    ],
  },
});
