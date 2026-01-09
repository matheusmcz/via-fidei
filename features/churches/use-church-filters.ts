"use client";

import { slugify } from "@/lib/utils";
import type { Church } from "@/types";
import { useMemo, useState } from "react";

interface UseChurchFiltersProps {
  churches: Church[];
}

interface UseChurchFiltersReturn {
  filteredChurches: Church[];
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedDistrict: string;
  setSelectedDistrict: (district: string) => void;
  districts: string[];
}

/**
 * Hook para busca e filtro de igrejas
 * - Busca ignora acentos
 * - Ordenação alfabética por nome
 */
export function useChurchFilters({
  churches,
}: UseChurchFiltersProps): UseChurchFiltersReturn {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDistrict, setSelectedDistrict] = useState("all");

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

  return {
    filteredChurches,
    searchQuery,
    setSearchQuery,
    selectedDistrict,
    setSelectedDistrict,
    districts,
  };
}
