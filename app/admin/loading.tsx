import { LoaderCircle } from "lucide-react";

/**
 * Carregamento das páginas do admin (VF-092). Aparece dentro do
 * `app/admin/layout.tsx`, com o cabeçalho já visível, na navegação entre
 * `/admin`, `/admin/usuarios` e subrotas, que são dinâmicas.
 */
export default function AdminLoading() {
  return (
    <div
      role="status"
      className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-muted-foreground"
    >
      <LoaderCircle className="h-8 w-8 animate-spin" aria-hidden="true" />
      <p className="text-sm">Carregando…</p>
    </div>
  );
}
