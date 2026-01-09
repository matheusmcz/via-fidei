"use client";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Church } from "@/types";
import { Search } from "lucide-react";
import { ChurchCard } from "./church-card";
import { PaginationControls } from "./pagination-controls";
import { useChurchFilters } from "./use-church-filters";

interface ChurchListProps {
  churches: Church[];
}

export function ChurchList({ churches }: ChurchListProps) {
  const {
    filteredChurches,
    paginatedChurches,
    searchQuery,
    setSearchQuery,
    selectedDistrict,
    setSelectedDistrict,
    districts,
    currentPage,
    setCurrentPage,
    itemsPerPage,
    setItemsPerPage,
    totalPages,
  } = useChurchFilters({ churches });

  return (
    <div className="space-y-6">
      {/* Filtros de Busca */}
      <div className="flex flex-col gap-4 sm:flex-row">
        <SearchInput value={searchQuery} onChange={setSearchQuery} />
        <DistrictFilter
          value={selectedDistrict}
          onChange={setSelectedDistrict}
          districts={districts}
        />
      </div>

      {/* Controles de Paginação - Topo */}
      {filteredChurches.length > 0 && (
        <PaginationControls
          position="top"
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={filteredChurches.length}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={setItemsPerPage}
        />
      )}

      {/* Grid de Igrejas */}
      {paginatedChurches.length > 0 ? (
        <div
          data-church-grid
          className="grid gap-6 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
        >
          {paginatedChurches.map((church) => (
            <ChurchCard key={church.id} church={church} />
          ))}
        </div>
      ) : (
        <EmptyState searchQuery={searchQuery} />
      )}

      {/* Controles de Paginação - Rodapé */}
      {paginatedChurches.length > 0 && (
        <PaginationControls
          position="bottom"
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={filteredChurches.length}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={setItemsPerPage}
        />
      )}
    </div>
  );
}

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
}

function SearchInput({ value, onChange }: SearchInputProps) {
  return (
    <div className="relative flex-1">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="search"
        placeholder="Buscar igreja..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="pl-9"
      />
    </div>
  );
}

interface DistrictFilterProps {
  value: string;
  onChange: (value: string) => void;
  districts: string[];
}

function DistrictFilter({ value, onChange, districts }: DistrictFilterProps) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-full sm:w-[200px]">
        <SelectValue placeholder="Todos os bairros" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">Todos os bairros</SelectItem>
        {districts.map((district) => (
          <SelectItem key={district} value={district}>
            {district}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

interface EmptyStateProps {
  searchQuery: string;
}

function EmptyState({ searchQuery }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="rounded-full bg-muted p-6 mb-4">
        <Search className="h-12 w-12 text-muted-foreground" />
      </div>
      <h3 className="text-xl font-semibold mb-2">Nenhuma igreja encontrada</h3>
      <p className="text-muted-foreground max-w-md">
        {searchQuery
          ? `Não encontramos resultados para "${searchQuery}". Tente buscar por outro termo.`
          : "Nenhuma igreja corresponde aos filtros selecionados."}
      </p>
    </div>
  );
}
