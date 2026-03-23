import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Church } from "lucide-react";
import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-screen bg-background">
      {/* Header com botão voltar */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar para listagem
          </Link>
        </div>
      </header>

      {/* Conteúdo */}
      <div className="container mx-auto px-4 py-16 sm:px-6 lg:px-8">
        <div className="max-w-md mx-auto">
          <Card>
            <CardContent className="p-8 sm:p-12 text-center">
              <div className="mb-6">
                <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                  <Church className="h-8 w-8 text-muted-foreground" />
                </div>
                <h1 className="text-5xl font-bold text-muted-foreground mb-2">
                  404
                </h1>
                <h2 className="text-xl font-semibold mb-3">
                  Igreja não encontrada
                </h2>
                <p className="text-sm text-muted-foreground">
                  A igreja que você está procurando não existe ou foi removida.
                </p>
              </div>

              <Link
                href="/"
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors text-sm font-medium"
              >
                <ArrowLeft className="h-4 w-4" />
                Ver todas as igrejas
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
