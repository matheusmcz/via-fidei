"use client";

import { Pagination } from "./pagination";
import { PerPageFilter } from "./per-page-filter";

interface PaginationControlsProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange: (items: number) => void;
  position?: "top" | "bottom";
}

export function PaginationControls({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
  onItemsPerPageChange,
  position = "top",
}: PaginationControlsProps) {
  const handlePageChange = (page: number) => {
    onPageChange(page);

    if (position === "bottom") {
      // Rolar para o início do grid
      const gridElement = document.querySelector("[data-church-grid]");
      if (gridElement) {
        gridElement.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    } else {
      // Rolar para o topo
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border rounded-lg bg-card">
      {/* Lado esquerdo: Filtro de itens por página */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Mostrar:</span>
        <PerPageFilter value={itemsPerPage} onChange={onItemsPerPageChange} />
        <span className="text-sm text-muted-foreground">por página</span>
      </div>

      {/* Lado direito: Navegação de páginas */}
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={handlePageChange}
        totalItems={totalItems}
        itemsPerPage={itemsPerPage}
      />
    </div>
  );
}
