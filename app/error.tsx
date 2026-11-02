"use client";

import { ErrorFallback } from "@/components/error-fallback";

interface RouteErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * Erro de renderização de qualquer rota (ex.: Supabase fora do ar sem versão
 * em cache da página). Fica dentro do layout raiz, então tema e fontes
 * continuam valendo. Erro no próprio layout raiz cai no `global-error.tsx`.
 */
export default function RouteError({ error, reset }: RouteErrorProps) {
  return <ErrorFallback error={error} reset={reset} />;
}
