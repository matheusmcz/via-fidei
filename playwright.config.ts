import { defineConfig, devices } from "@playwright/test";

/**
 * Smoke e2e das páginas públicas, somente leitura (sem login nem escrita).
 *
 * O servidor é o build de produção (`next start`). Por padrão o Playwright
 * faz o build antes de subir; com `E2E_SKIP_BUILD=1` reaproveita o `.next`
 * existente (usado no CI, que recebe o build do job anterior). Com
 * `E2E_REUSE_SERVER=1` usa um servidor já aberto na porta.
 *
 * As páginas leem o Supabase configurado no ambiente (`.env.local` ou secrets
 * do CI). Testes que gravam dados só podem rodar no Supabase local (D10).
 */
const PORT = Number(process.env.E2E_PORT ?? 3203);
const BASE_URL = `http://localhost:${PORT}`;
const isCI = Boolean(process.env.CI);

const startCommand = `npm run start -- -p ${PORT}`;
const webServerCommand =
  process.env.E2E_SKIP_BUILD === "1"
    ? startCommand
    : `npm run build && ${startCommand}`;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  workers: isCI ? 2 : undefined,
  reporter: isCI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: BASE_URL,
    locale: "pt-BR",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: webServerCommand,
    url: BASE_URL,
    // Só reaproveita um servidor já aberto na porta quando pedido: com várias
    // worktrees em paralelo, ele pode ser de outra branch.
    reuseExistingServer: process.env.E2E_REUSE_SERVER === "1",
    timeout: 300_000,
  },
});
