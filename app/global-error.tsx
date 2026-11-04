"use client";

import { ErrorFallback } from "@/components/error-fallback";
import { applyStoredTheme, THEME_INIT_SCRIPT } from "@/features/theme";
import { useEffect } from "react";
import "./globals.css";

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * Erro no layout raiz (VF-092). Substitui o `app/layout.tsx` inteiro, por
 * isso desenha o próprio `<html>`/`<body>`, importa o CSS global e aplica o
 * tema salvo de duas formas:
 * - o script inline no `<head>` cobre o HTML vindo do servidor (sem "flash"
 *   do tema claro);
 * - o efeito cobre a renderização no cliente, em que o React não executa
 *   `<script>` inline e limpa os atributos do `<html>` do layout.
 */
export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    applyStoredTheme();
  }, []);

  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <title>Erro | Via Fidei</title>
        <meta name="robots" content="noindex, nofollow" />
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="antialiased">
        <ErrorFallback error={error} reset={reset} />
      </body>
    </html>
  );
}
