import { expect, test } from "@playwright/test";

/**
 * Favicon, ícone Apple e logo leves (VF-090). Antes, o `<head>` apontava o
 * favicon e o ícone Apple para o logo de 1 MB. Somente leitura.
 */

const ICONS = [
  { rel: "icon", path: "/icon.png", size: "32x32", maxBytes: 5_000 },
  { rel: "apple-touch-icon", path: "/apple-icon.png", size: "180x180", maxBytes: 15_000 },
] as const;

/** Logo do cabeçalho e imagem padrão das igrejas sem foto. */
const LOGO = { path: "/images/via-fidei-logo.png", maxBytes: 50_000 } as const;

test.describe("ícones e logo (VF-090)", () => {
  test("o HTML referencia os ícones gerados, e não o logo", async ({ page }) => {
    await page.goto("/");

    for (const icon of ICONS) {
      const link = page.locator(`head link[rel="${icon.rel}"]`);
      await expect(link).toHaveCount(1);
      await expect(link).toHaveAttribute("href", new RegExp(`^${icon.path}(\\?|$)`));
      await expect(link).toHaveAttribute("sizes", icon.size);
      await expect(link).toHaveAttribute("type", "image/png");
    }

    await expect(
      page.locator(`head link[href*="via-fidei-logo"]`),
    ).toHaveCount(0);
  });

  for (const icon of ICONS) {
    test(`${icon.path} responde 200 com até ${icon.maxBytes} bytes`, async ({
      request,
    }) => {
      const response = await request.get(icon.path);
      expect(response.status()).toBe(200);
      expect(response.headers()["content-type"]).toBe("image/png");
      expect((await response.body()).byteLength).toBeLessThanOrEqual(
        icon.maxBytes,
      );
    });
  }

  test("o logo responde 200 com tamanho de imagem leve", async ({ request }) => {
    const response = await request.get(LOGO.path);
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toBe("image/png");
    expect((await response.body()).byteLength).toBeLessThanOrEqual(
      LOGO.maxBytes,
    );
  });
});
