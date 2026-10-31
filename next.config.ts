import type { NextConfig } from "next";
import { buildSecurityHeaders } from "./lib/security/headers";

/**
 * Integração Vercel ↔ Supabase injeta `SUPABASE_URL`, `SUPABASE_ANON_KEY`, etc.
 * sem o prefixo `NEXT_PUBLIC_`. O Next só expõe ao bundle do browser variáveis
 * `NEXT_PUBLIC_*`; aqui espelhamos os valores para o cliente poder usar
 * `createBrowserClient` (auth, admin).
 */
const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
  process.env.SUPABASE_URL?.trim() ||
  "";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  env: {
    NEXT_PUBLIC_SUPABASE_URL: supabaseUrl,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
      process.env.SUPABASE_PUBLISHABLE_KEY?.trim() ||
      "",
    NEXT_PUBLIC_SUPABASE_ANON_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
      process.env.SUPABASE_ANON_KEY?.trim() ||
      "",
  },
  /** Cabeçalhos de segurança de todas as rotas (VF-081). */
  async headers() {
    return [
      {
        source: "/:path*",
        headers: buildSecurityHeaders({
          supabaseUrl,
          isDevelopment: process.env.NODE_ENV === "development",
          allowVercelToolbar: process.env.VERCEL_ENV === "preview",
        }),
      },
    ];
  },
};

export default nextConfig;
