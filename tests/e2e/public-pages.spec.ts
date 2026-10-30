import { expect, test } from "@playwright/test";

/**
 * Smoke das páginas públicas, somente leitura.
 * Os dados vêm do Supabase configurado no ambiente, por isso as asserções
 * usam textos estáveis (títulos, cargos) e não contagens exatas.
 */

test.describe("home (CT-001, CT-006, CT-007)", () => {
  test("lista igrejas e a busca filtra ignorando acentos", async ({ page }) => {
    await page.goto("/");

    const cards = page.locator("[data-church-grid] a");
    await expect(cards.first()).toBeVisible();
    const initialCount = await cards.count();
    expect(initialCount).toBeGreaterThan(1);

    const search = page.getByPlaceholder("Buscar igreja...");
    const target = cards.filter({ hasText: "São Paulo Apóstolo" });

    // A busca é client-side: repete o preenchimento até a hidratação terminar.
    await expect(async () => {
      await search.fill("sao paulo apostolo");
      await expect(target).toHaveCount(1, { timeout: 1_000 });
      expect(await cards.count()).toBeLessThan(initialCount);
    }).toPass();

    await expect(target).toHaveAttribute("href", "/igreja/sao-paulo-apostolo");
  });

  test("mostra o estado vazio quando a busca não encontra nada", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.locator("[data-church-grid] a").first()).toBeVisible();

    const search = page.getByPlaceholder("Buscar igreja...");
    await expect(async () => {
      await search.fill("zzz-igreja-inexistente");
      await expect(page.getByText("Nenhuma igreja encontrada")).toBeVisible({
        timeout: 1_000,
      });
    }).toPass();
  });
});

test("página da igreja mostra o clero (CT-002, CT-004)", async ({ page }) => {
  const response = await page.goto("/igreja/sao-paulo-apostolo");
  expect(response?.status()).toBe(200);

  await expect(
    page.getByRole("heading", { level: 1, name: /São Paulo Apóstolo/ }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Clero" })).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Pároco/ }).first(),
  ).toBeVisible();
});

test("/clero carrega a listagem", async ({ page }) => {
  const response = await page.goto("/clero");
  expect(response?.status()).toBe(200);

  await expect(
    page.getByRole("heading", { level: 1, name: "Clero" }),
  ).toBeVisible();
  await expect(page.getByText(/^\d+ clérigos?$/)).toBeVisible();
});

test("igreja inexistente responde 404", async ({ page }) => {
  const response = await page.goto("/igreja/nao-existe");
  expect(response?.status()).toBe(404);

  await expect(page.getByText("Igreja não encontrada")).toBeVisible();
});

test("/login renderiza o formulário sem indexação (CT-011)", async ({
  page,
}) => {
  await page.goto("/login");

  await expect(page.getByLabel("Email")).toBeVisible();
  await expect(page.getByLabel("Senha")).toBeVisible();
  await expect(page.getByRole("button", { name: "Entrar" })).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    /noindex/,
  );
});

test("/admin sem sessão redireciona para /login (CT-011)", async ({ page }) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/login$/);
});
