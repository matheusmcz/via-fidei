import { describe, expect, it } from "vitest";
import {
  buildContentSecurityPolicy,
  buildSecurityHeaders,
  type SecurityHeadersOptions,
} from "./headers";

const SUPABASE_URL = "https://projeto-teste.supabase.co";

const production: SecurityHeadersOptions = {
  supabaseUrl: SUPABASE_URL,
  isDevelopment: false,
  allowVercelToolbar: false,
};

/** Converte a CSP em mapa diretiva → fontes, para asserções independentes da ordem. */
function parseCsp(policy: string): Map<string, string[]> {
  const directives = new Map<string, string[]>();
  for (const part of policy.split(";")) {
    const [name, ...sources] = part.trim().split(/\s+/);
    if (name) directives.set(name, sources);
  }
  return directives;
}

function headerValue(
  headers: ReturnType<typeof buildSecurityHeaders>,
  key: string,
): string | undefined {
  return headers.find((header) => header.key === key)?.value;
}

describe("buildContentSecurityPolicy", () => {
  it("bloqueia frames, plugins, troca de base e envio de formulário para fora", () => {
    const csp = parseCsp(buildContentSecurityPolicy(production));

    expect(csp.get("default-src")).toEqual(["'self'"]);
    expect(csp.get("frame-ancestors")).toEqual(["'none'"]);
    expect(csp.get("object-src")).toEqual(["'none'"]);
    expect(csp.get("base-uri")).toEqual(["'self'"]);
    expect(csp.get("form-action")).toEqual(["'self'"]);
  });

  it("libera scripts inline sem hash nem nonce, porque as páginas são estáticas (ISR)", () => {
    const scriptSrc = parseCsp(buildContentSecurityPolicy(production)).get(
      "script-src",
    );

    // Hash ou nonce desligariam o 'unsafe-inline' e bloqueariam os scripts
    // inline do RSC (`self.__next_f.push`), que mudam a cada build.
    expect(scriptSrc).toEqual(["'self'", "'unsafe-inline'"]);
    expect(scriptSrc?.some((source) => source.startsWith("'sha256-"))).toBe(
      false,
    );
    expect(scriptSrc?.some((source) => source.startsWith("'nonce-"))).toBe(
      false,
    );
  });

  it("não libera eval nem o script de debug do Analytics em produção", () => {
    const scriptSrc = parseCsp(buildContentSecurityPolicy(production)).get(
      "script-src",
    );

    expect(scriptSrc).not.toContain("'unsafe-eval'");
    expect(scriptSrc).not.toContain("https://va.vercel-scripts.com");
  });

  it("restringe imagens, fontes e estilos à mesma origem (next/image e next/font são locais)", () => {
    const csp = parseCsp(buildContentSecurityPolicy(production));

    expect(csp.get("img-src")).toEqual(["'self'"]);
    expect(csp.get("font-src")).toEqual(["'self'"]);
    expect(csp.get("style-src")).toEqual(["'self'", "'unsafe-inline'"]);
  });

  it("libera em connect-src só a origem do Supabase, sem caminho nem websocket", () => {
    const connectSrc = parseCsp(
      buildContentSecurityPolicy({
        ...production,
        supabaseUrl: `${SUPABASE_URL}/rest/v1/`,
      }),
    ).get("connect-src");

    expect(connectSrc).toEqual(["'self'", SUPABASE_URL]);
  });

  it("aceita o Supabase local em http", () => {
    const connectSrc = parseCsp(
      buildContentSecurityPolicy({
        ...production,
        supabaseUrl: "http://127.0.0.1:54321",
      }),
    ).get("connect-src");

    expect(connectSrc).toEqual(["'self'", "http://127.0.0.1:54321"]);
  });

  it.each([undefined, "", "   "])(
    "sem URL do Supabase (%j), connect-src fica só com a mesma origem",
    (supabaseUrl) => {
      const connectSrc = parseCsp(
        buildContentSecurityPolicy({ ...production, supabaseUrl }),
      ).get("connect-src");

      expect(connectSrc).toEqual(["'self'"]);
    },
  );

  it.each(["projeto.supabase.co", "ftp://projeto.supabase.co", "javascript:alert(1)"])(
    "recusa URL do Supabase inválida (%s) sem expor o valor na mensagem",
    (supabaseUrl) => {
      expect(() =>
        buildContentSecurityPolicy({ ...production, supabaseUrl }),
      ).toThrowError(/URL do Supabase inválida/);

      try {
        buildContentSecurityPolicy({ ...production, supabaseUrl });
      } catch (error) {
        expect((error as Error).message).not.toContain(supabaseUrl);
      }
    },
  );

  it("em desenvolvimento libera eval (React) e o script de debug do Analytics", () => {
    const scriptSrc = parseCsp(
      buildContentSecurityPolicy({ ...production, isDevelopment: true }),
    ).get("script-src");

    expect(scriptSrc).toEqual([
      "'self'",
      "'unsafe-inline'",
      "'unsafe-eval'",
      "https://va.vercel-scripts.com",
    ]);
  });

  it("no Preview da Vercel libera a barra de ferramentas (vercel.live)", () => {
    const csp = parseCsp(
      buildContentSecurityPolicy({ ...production, allowVercelToolbar: true }),
    );

    expect(csp.get("script-src")).toContain("https://vercel.live");
    expect(csp.get("connect-src")).toEqual([
      "'self'",
      SUPABASE_URL,
      "https://vercel.live",
      "wss://ws-us3.pusher.com",
    ]);
    expect(csp.get("img-src")).toEqual([
      "'self'",
      "https://vercel.live",
      "https://vercel.com",
      "data:",
      "blob:",
    ]);
    expect(csp.get("frame-src")).toEqual(["'self'", "https://vercel.live"]);
    expect(csp.get("style-src")).toContain("https://vercel.live");
    expect(csp.get("font-src")).toEqual([
      "'self'",
      "https://vercel.live",
      "https://assets.vercel.com",
    ]);
    // A barra não afrouxa as diretivas de proteção.
    expect(csp.get("frame-ancestors")).toEqual(["'none'"]);
    expect(csp.get("object-src")).toEqual(["'none'"]);
  });

  it("fora do Preview não define frame-src (vale o default-src 'self')", () => {
    const csp = parseCsp(buildContentSecurityPolicy(production));

    expect(csp.has("frame-src")).toBe(false);
  });

  it("não repete fontes nem diretivas", () => {
    const policy = buildContentSecurityPolicy({
      supabaseUrl: SUPABASE_URL,
      isDevelopment: true,
      allowVercelToolbar: true,
    });
    const parts = policy.split(";").map((part) => part.trim());
    const names = parts.map((part) => part.split(/\s+/)[0]);

    expect(new Set(names).size).toBe(names.length);
    for (const part of parts) {
      const sources = part.split(/\s+/).slice(1);
      expect(new Set(sources).size).toBe(sources.length);
    }
  });
});

describe("buildSecurityHeaders", () => {
  it("envia a CSP aplicada (não report-only)", () => {
    const headers = buildSecurityHeaders(production);

    expect(headerValue(headers, "Content-Security-Policy")).toBe(
      buildContentSecurityPolicy(production),
    );
    expect(
      headerValue(headers, "Content-Security-Policy-Report-Only"),
    ).toBeUndefined();
  });

  it("envia os cabeçalhos de proteção contra clickjacking, sniffing e vazamento de referer", () => {
    const headers = buildSecurityHeaders(production);

    expect(headerValue(headers, "X-Frame-Options")).toBe("DENY");
    expect(headerValue(headers, "X-Content-Type-Options")).toBe("nosniff");
    expect(headerValue(headers, "Referrer-Policy")).toBe(
      "strict-origin-when-cross-origin",
    );
  });

  it("desliga no Permissions-Policy os recursos que o site não usa", () => {
    const value = headerValue(buildSecurityHeaders(production), "Permissions-Policy");

    expect(value?.split(", ")).toEqual([
      "accelerometer=()",
      "browsing-topics=()",
      "camera=()",
      "geolocation=()",
      "gyroscope=()",
      "magnetometer=()",
      "microphone=()",
      "payment=()",
      "usb=()",
    ]);
  });

  it("não envia HSTS, que a Vercel já envia em todos os domínios", () => {
    const headers = buildSecurityHeaders(production);

    expect(headerValue(headers, "Strict-Transport-Security")).toBeUndefined();
  });

  it("não repete cabeçalhos", () => {
    const keys = buildSecurityHeaders(production).map((header) =>
      header.key.toLowerCase(),
    );

    expect(new Set(keys).size).toBe(keys.length);
  });
});
