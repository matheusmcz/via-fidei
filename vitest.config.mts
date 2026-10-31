import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/**
 * Dois projetos Vitest:
 * - `unit`: regras puras (`*.test.ts`), ambiente node. Unitário é sempre `.ts`;
 *   o que renderiza componente é integração.
 * - `integration`: componentes e queries com dependências simuladas
 *   (`*.integration.test.ts(x)`), ambiente jsdom. Nenhum teste acessa o
 *   Supabase real; a integração com o Supabase local (D10) é um item futuro.
 *
 * Os specs do Playwright ficam em `tests/e2e/` e não passam pelo Vitest.
 */
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
    ],
  },
});
