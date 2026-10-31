/**
 * Cabeçalhos de segurança HTTP (VF-081), montados por funções puras para
 * poderem ser testadas sem o Next. O `next.config.ts` chama
 * `buildSecurityHeaders()` em `headers()`.
 *
 * Por que a CSP usa `'unsafe-inline'` em `script-src` (e não hash nem nonce):
 * - as páginas públicas são estáticas com ISR; o HTML é gerado no build e na
 *   revalidação, não por requisição, então não há como injetar um nonce;
 * - o Next 15 inclui scripts inline do RSC (`self.__next_f.push(...)`) cujo
 *   conteúdo muda a cada build e a cada página; não dá para listar os hashes
 *   em um cabeçalho definido antes do build;
 * - ao encontrar um hash ou nonce, o navegador ignora o `'unsafe-inline'`.
 *   Pôr só o hash do script de tema bloquearia os scripts do RSC.
 * O ganho da CSP fica nas demais diretivas: scripts e conexões só da própria
 * origem (e do Supabase), sem frames de terceiros (`frame-ancestors 'none'`),
 * sem plugins, sem troca de `<base>` e sem envio de formulário para fora.
 */

/** Opções de ambiente que mudam a política. */
export interface SecurityHeadersOptions {
  /** URL do projeto Supabase (Auth e REST do cliente do browser). */
  supabaseUrl?: string;
  /** `next dev`: o React usa `eval` e o Analytics carrega o script de debug. */
  isDevelopment: boolean;
  /** Preview da Vercel: libera a barra de ferramentas (`vercel.live`). */
  allowVercelToolbar: boolean;
}

/** Cabeçalho no formato esperado por `headers()` do `next.config`. */
export interface HttpHeader {
  key: string;
  value: string;
}

type CspDirectives = Record<string, readonly string[]>;

const SELF = "'self'";
const NONE = "'none'";
const UNSAFE_INLINE = "'unsafe-inline'";

/** Política base, usada em produção. */
const BASE_DIRECTIVES: CspDirectives = {
  "default-src": [SELF],
  // Scripts inline do RSC e do tema: ver o comentário do início do arquivo.
  // O Vercel Analytics em produção carrega `/_vercel/insights/script.js` e
  // envia para `/_vercel/insights/*`, ambos na mesma origem.
  "script-src": [SELF, UNSAFE_INLINE],
  // `next/image` e componentes do Radix renderizam atributos `style` inline.
  "style-src": [SELF, UNSAFE_INLINE],
  // Imagens locais em `/images` e do otimizador em `/_next/image`.
  "img-src": [SELF],
  // `next/font/google` serve as fontes da própria origem.
  "font-src": [SELF],
  "connect-src": [SELF],
  "object-src": [NONE],
  "base-uri": [SELF],
  "form-action": [SELF],
  "frame-ancestors": [NONE],
};

/** Acréscimos do `next dev`. */
const DEVELOPMENT_DIRECTIVES: CspDirectives = {
  "script-src": ["'unsafe-eval'", "https://va.vercel-scripts.com"],
};

/**
 * Acréscimos para a barra de ferramentas da Vercel nos Previews.
 * @see https://vercel.com/docs/vercel-toolbar/managing-toolbar#using-a-content-security-policy
 */
const VERCEL_TOOLBAR_DIRECTIVES: CspDirectives = {
  "script-src": ["https://vercel.live"],
  "connect-src": ["https://vercel.live", "wss://ws-us3.pusher.com"],
  "img-src": ["https://vercel.live", "https://vercel.com", "data:", "blob:"],
  "frame-src": [SELF, "https://vercel.live"],
  "style-src": ["https://vercel.live"],
  "font-src": ["https://vercel.live", "https://assets.vercel.com"],
};

/** Recursos do navegador que o site não usa. */
const DISABLED_PERMISSIONS = [
  "accelerometer",
  "browsing-topics",
  "camera",
  "geolocation",
  "gyroscope",
  "magnetometer",
  "microphone",
  "payment",
  "usb",
] as const;

/**
 * Origem (`https://host[:porta]`) da URL do Supabase, para o `connect-src`.
 * Sem URL, devolve `null`. A mensagem de erro não repete o valor recebido.
 */
function resolveSupabaseOrigin(supabaseUrl: string | undefined): string | null {
  const trimmed = supabaseUrl?.trim();
  if (!trimmed) return null;

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    throw new Error(invalidSupabaseUrlMessage());
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error(invalidSupabaseUrlMessage());
  }
  return url.origin;
}

function invalidSupabaseUrlMessage(): string {
  return "URL do Supabase inválida para a CSP: use o formato https://<projeto>.supabase.co em NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_URL.";
}

/** Junta as fontes de cada diretiva, mantendo a ordem e sem repetir. */
function mergeDirectives(...layers: CspDirectives[]): CspDirectives {
  const merged: Record<string, string[]> = {};
  for (const layer of layers) {
    for (const [name, sources] of Object.entries(layer)) {
      const current = merged[name] ?? [];
      merged[name] = [...current, ...sources.filter((s) => !current.includes(s))];
    }
  }
  return merged;
}

function serializeDirectives(directives: CspDirectives): string {
  return Object.entries(directives)
    .map(([name, sources]) => [name, ...sources].join(" "))
    .join("; ");
}

/** Valor do cabeçalho `Content-Security-Policy`. */
export function buildContentSecurityPolicy(
  options: SecurityHeadersOptions,
): string {
  const supabaseOrigin = resolveSupabaseOrigin(options.supabaseUrl);

  const layers: CspDirectives[] = [BASE_DIRECTIVES];
  if (supabaseOrigin) layers.push({ "connect-src": [supabaseOrigin] });
  if (options.isDevelopment) layers.push(DEVELOPMENT_DIRECTIVES);
  if (options.allowVercelToolbar) layers.push(VERCEL_TOOLBAR_DIRECTIVES);

  return serializeDirectives(mergeDirectives(...layers));
}

/**
 * Cabeçalhos de segurança de todas as rotas.
 * HSTS fica de fora: a Vercel já envia `Strict-Transport-Security` em todos
 * os domínios, e um segundo valor poderia conflitar com o dela.
 */
export function buildSecurityHeaders(
  options: SecurityHeadersOptions,
): HttpHeader[] {
  return [
    {
      key: "Content-Security-Policy",
      value: buildContentSecurityPolicy(options),
    },
    // Redundante com `frame-ancestors 'none'`, para navegadores antigos.
    { key: "X-Frame-Options", value: "DENY" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    {
      key: "Permissions-Policy",
      value: DISABLED_PERMISSIONS.map((feature) => `${feature}=()`).join(", "),
    },
  ];
}
