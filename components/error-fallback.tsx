"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { House, RotateCw, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useTransition } from "react";

interface ErrorFallbackProps {
  /** Erro recebido pelo `error.tsx`; só o `digest` é usado (registro). */
  error: Error & { digest?: string };
  /** `reset` do error boundary do Next. */
  reset: () => void;
}

/**
 * Tela de erro para o fiel, usada pelo `app/error.tsx` e pelo
 * `app/global-error.tsx` (VF-092). Não mostra `error.message`: em produção o
 * Next já o troca por um texto genérico nos erros do servidor, e nos erros do
 * cliente ele pode trazer detalhes internos.
 */
export function ErrorFallback({ error, reset }: ErrorFallbackProps) {
  const router = useRouter();
  const [isRetrying, startTransition] = useTransition();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const { digest } = error;

  useEffect(() => {
    // A tela de erro troca o conteúdo sem mudar a URL nem o título: o foco
    // no título faz o leitor de tela anunciar o erro (WCAG 4.1.3).
    headingRef.current?.focus();
  }, []);

  useEffect(() => {
    // O digest liga este erro ao registro do servidor (logs da Vercel).
    console.error(
      `Via Fidei: erro ao exibir a página (digest: ${digest ?? "sem digest"}).`,
    );
  }, [digest]);

  function retry() {
    // `reset` sozinho só renderiza de novo no cliente; o `refresh` busca de
    // novo os Server Components, onde estão as consultas ao Supabase.
    startTransition(() => {
      router.refresh();
      reset();
    });
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-md">
          <Card>
            <CardContent className="p-8 text-center sm:p-12">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                <TriangleAlert
                  className="h-8 w-8 text-muted-foreground"
                  aria-hidden="true"
                />
              </div>
              <h1
                ref={headingRef}
                tabIndex={-1}
                className="mb-3 text-xl font-semibold outline-none"
              >
                Não foi possível carregar esta página
              </h1>
              <p className="mb-6 text-sm text-muted-foreground">
                Algo deu errado do nosso lado. Tente novamente em instantes; se
                o problema continuar, volte mais tarde.
              </p>

              <div className="flex flex-col justify-center gap-2 sm:flex-row">
                <Button onClick={retry} disabled={isRetrying}>
                  <RotateCw
                    className={cn(isRetrying && "animate-spin")}
                    aria-hidden="true"
                  />
                  {isRetrying ? "Tentando…" : "Tentar novamente"}
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/">
                    <House aria-hidden="true" />
                    Voltar para o início
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
