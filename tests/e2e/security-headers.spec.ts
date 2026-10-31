import { expect, test, type Page } from "@playwright/test";

/**
 * Cabeçalhos de segurança (VF-081): cada rota responde com a CSP e os demais
 * cabeçalhos, e o navegador não registra violação de CSP nem erro de
 * hidratação. Somente leitura (sem login nem escrita).
 */

const PUBLIC_ROUTES = [
  "/",
  "/igreja/sao-paulo-apostolo",
  "/clero",
  "/login",
] as const;

const REQUIRED_CSP_DIRECTIVES = [
  "default-src 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "img-src 'self'",
] as const;

/**
 * Mensagens do console que indicam problema: violação de CSP, recurso do
 * Permissions-Policy desconhecido e erros de hidratação do React (em
 * produção, minificados como #418, #423 e #425).
 */
const CONSOLE_PROBLEM =
  /Content Security Policy|Refused to (load|execute|apply|connect|frame)|Unrecognized feature|Permissions-Policy|hydrat|Minified React error #(418|423|425)/i;

declare global {
  interface Window {
    __cspViolations?: string[];
  }
}

/** Fontes que só existem em `next dev` ou no Preview da Vercel. */
const NON_PRODUCTION_SOURCES = [
  "'unsafe-eval'",
  "va.vercel-scripts.com",
  "vercel.live",
] as const;

type ResponseHeaders = Record<string, string>;

function expectSecurityHeaders(headers: ResponseHeaders) {
  const csp = headers["content-security-policy"];
  expect(csp, "Content-Security-Policy ausente").toBeTruthy();
  for (const directive of REQUIRED_CSP_DIRECTIVES) {
    expect(csp).toContain(directive);
  }
  // O `next.config.ts` liga o Supabase ao `connect-src`; sem ele, quem está
  // logado teria o Auth e as consultas bloqueados. O valor não é lido aqui:
  // basta haver uma origem http(s) além da própria.
  expect(csp).toMatch(/(^|;\s*)connect-src 'self' https?:\/\/[^\s;/]+(;|$)/);
  for (const source of NON_PRODUCTION_SOURCES) {
    expect(csp).not.toContain(source);
  }
  expect(headers["content-security-policy-report-only"]).toBeUndefined();
  expect(headers["x-frame-options"]).toBe("DENY");
  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  expect(headers["permissions-policy"]).toContain("camera=()");
}

/**
 * Registra violações de CSP (evento do DOM, antes de qualquer script da
 * página), erros do console e exceções não tratadas.
 */
async function watchBrowserProblems(
  page: Page,
): Promise<() => Promise<string[]>> {
  const problems: string[] = [];

  // O script do Vercel Analytics só existe na Vercel; em `next start` a rota
  // responde HTML 404, que o `nosniff` (corretamente) recusa executar. Aqui
  // ele é simulado como JS da mesma origem, e continua sujeito à CSP.
  await page.route("**/_vercel/insights/**", (route) =>
    route.fulfill({ contentType: "application/javascript", body: "" }),
  );

  page.on("console", (message) => {
    if (CONSOLE_PROBLEM.test(message.text())) {
      problems.push(`console.${message.type()}: ${message.text()}`);
    }
  });
  page.on("pageerror", (error) => {
    problems.push(`pageerror: ${error.message}`);
  });

  await page.addInitScript(() => {
    window.__cspViolations = [];
    document.addEventListener("securitypolicyviolation", (event) => {
      window.__cspViolations?.push(
        `${event.violatedDirective} bloqueou ${event.blockedURI || "inline"}`,
      );
    });
  });

  return async () => {
    const violations = await page.evaluate(() => window.__cspViolations ?? []);
    return [...problems, ...violations.map((v) => `CSP: ${v}`)];
  };
}

/** Espera a página assentar (hidratação, imagens e o script do Analytics). */
async function settle(page: Page) {
  await page.waitForLoadState("networkidle");
}

test.describe("cabeçalhos de segurança (VF-081)", () => {
  for (const route of PUBLIC_ROUTES) {
    test(`${route} responde com os cabeçalhos e sem violação no console`, async ({
      page,
    }) => {
      const collectProblems = await watchBrowserProblems(page);

      const response = await page.goto(route);
      expect(response?.status()).toBe(200);
      expectSecurityHeaders(response?.headers() ?? {});

      await settle(page);
      expect(await collectProblems()).toEqual([]);
    });
  }

  test("/admin sem sessão: o redirecionamento e o /login têm os cabeçalhos", async ({
    page,
    request,
  }) => {
    const redirect = await request.get("/admin", { maxRedirects: 0 });
    expect([302, 303, 307, 308]).toContain(redirect.status());
    expect(redirect.headers()["location"]).toMatch(/\/login$/);
    expectSecurityHeaders(redirect.headers());

    const collectProblems = await watchBrowserProblems(page);
    const response = await page.goto("/admin");
    await expect(page).toHaveURL(/\/login$/);
    expectSecurityHeaders(response?.headers() ?? {});

    await settle(page);
    expect(await collectProblems()).toEqual([]);
  });

  test("assets estáticos também recebem nosniff", async ({ request }) => {
    const response = await request.get("/images/via-fidei-logo.png");
    expect(response.status()).toBe(200);
    expect(response.headers()["x-content-type-options"]).toBe("nosniff");
  });
});

test.describe("script inline de tema sob a CSP", () => {
  /**
   * Os chunks JS do Next são bloqueados para que só os scripts inline rodem:
   * se a classe `dark` aparecer, foi o script de tema do `<head>` que rodou,
   * e não o ThemeProvider depois da hidratação.
   */
  async function loadWithInlineScriptsOnly(page: Page) {
    await page.route("**/_next/static/chunks/**", (route) => route.abort());
    await page.goto("/");
  }

  test("tema escuro do sistema aplica a classe dark antes da hidratação", async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    const collectProblems = await watchBrowserProblems(page);

    await loadWithInlineScriptsOnly(page);

    await expect(page.locator("html")).toHaveClass(/\bdark\b/);
    expect(await collectProblems()).toEqual([]);
  });

  test("tema escuro salvo vence o sistema claro", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "light" });
    await page.addInitScript(() => {
      localStorage.setItem("via-fidei-theme", "dark");
    });
    const collectProblems = await watchBrowserProblems(page);

    await loadWithInlineScriptsOnly(page);

    await expect(page.locator("html")).toHaveClass(/\bdark\b/);
    expect(await collectProblems()).toEqual([]);
  });

  test("tema claro não aplica a classe dark", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "light" });
    const collectProblems = await watchBrowserProblems(page);

    await loadWithInlineScriptsOnly(page);

    await expect(page.locator("html")).not.toHaveClass(/\bdark\b/);
    expect(await collectProblems()).toEqual([]);
  });

  for (const colorScheme of ["light", "dark"] as const) {
    test(`tema ${colorScheme === "dark" ? "escuro" : "claro"} com a página completa, sem violação nem erro de hidratação`, async ({
      page,
    }) => {
      await page.emulateMedia({ colorScheme });
      const collectProblems = await watchBrowserProblems(page);

      await page.goto("/igreja/sao-paulo-apostolo");
      await settle(page);

      const html = page.locator("html");
      if (colorScheme === "dark") {
        await expect(html).toHaveClass(/\bdark\b/);
      } else {
        await expect(html).not.toHaveClass(/\bdark\b/);
      }
      expect(await collectProblems()).toEqual([]);
    });
  }
});

test.describe("imagens do next/image sob a CSP", () => {
  for (const route of ["/", "/igreja/sao-paulo-apostolo"] as const) {
    test(`${route} carrega as imagens do otimizador`, async ({ page }) => {
      const collectProblems = await watchBrowserProblems(page);
      await page.goto(route);

      const optimized = page.locator('img[src*="/_next/image"]');
      await expect(optimized.first()).toBeVisible();

      const count = await optimized.count();
      for (let index = 0; index < Math.min(count, 4); index += 1) {
        const image = optimized.nth(index);
        await image.scrollIntoViewIfNeeded();
        await expect
          .poll(() =>
            image.evaluate(
              (element) =>
                (element as HTMLImageElement).complete &&
                (element as HTMLImageElement).naturalWidth > 0,
            ),
          )
          .toBe(true);
      }

      expect(await collectProblems()).toEqual([]);
    });
  }
});
