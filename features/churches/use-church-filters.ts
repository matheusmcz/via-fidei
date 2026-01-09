"use client";

import { slugify } from "@/lib/utils";
import type { Church } from "@/types";
import { useEffect, useMemo, useState } from "react";

interface UseChurchFiltersProps {
  churches: Church[];
}

interface UseChurchFiltersReturn {
  filteredChurches: Church[];
  paginatedChurches: Church[];
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedDistrict: string;
  setSelectedDistrict: (district: string) => void;
  districts: string[];
  currentPage: number;
  setCurrentPage: (page: number) => void;
  itemsPerPage: number;
  setItemsPerPage: (items: number) => void;
  totalPages: number;
}

/**
 * Hook para busca, filtro e paginação de igrejas
 * - Busca ignora acentos
 * - Ordenação alfabética por nome
 * - Paginação com itens configuráveis
 */
export function useChurchFilters({
  churches,
}: UseChurchFiltersProps): UseChurchFiltersReturn {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDistrict, setSelectedDistrict] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  // Lista única de bairros ordenada alfabeticamente
  const districts = useMemo(() => {
    const uniqueDistricts = [...new Set(churches.map((c) => c.district))];
    return uniqueDistricts.sort();
  }, [churches]);

  // Filtrar e ordenar igrejas
  const filteredChurches = useMemo(() => {
    let result = churches;

    // Filtrar por bairro
    if (selectedDistrict !== "all") {
      result = result.filter((church) => church.district === selectedDistrict);
    }

    // Buscar por nome (ignorando acentos)
    if (searchQuery.trim()) {
      const normalizedQuery = slugify(searchQuery);
      result = result.filter((church) => {
        const normalizedName = slugify(church.name);
        return normalizedName.includes(normalizedQuery);
      });
    }

    // Ordenar alfabeticamente por nome
    return result.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  }, [churches, searchQuery, selectedDistrict]);

  // Calcular total de páginas
  const totalPages = useMemo(() => {
    return Math.ceil(filteredChurches.length / itemsPerPage);
  }, [filteredChurches.length, itemsPerPage]);

  // Paginar resultados
  const paginatedChurches = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredChurches.slice(startIndex, endIndex);
  }, [filteredChurches, currentPage, itemsPerPage]);

  // Resetar página quando filtros mudarem
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedDistrict, itemsPerPage]);

  // Ajustar página se estiver fora do range válido
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  return {
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
  };
}
