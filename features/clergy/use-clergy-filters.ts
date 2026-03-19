"use client";

import {
  filterClergyByInitial,
  getClergyInitials,
  slugify,
  sortClergyByName,
} from "@/lib/utils";
import type { ClergyWithChurch } from "@/types";
import { useEffect, useMemo, useState } from "react";

interface UseClergyFiltersProps {
  clergy: ClergyWithChurch[];
}

interface UseClergyFiltersReturn {
  filteredClergy: ClergyWithChurch[];
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedInitial: string;
  setSelectedInitial: (initial: string) => void;
  initials: string[];
}

export function useClergyFilters({
  clergy,
}: UseClergyFiltersProps): UseClergyFiltersReturn {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedInitial, setSelectedInitial] = useState("");

  const sortedClergy = useMemo(() => sortClergyByName(clergy), [clergy]);

  const initials = useMemo(
    () => getClergyInitials(sortedClergy),
    [sortedClergy],
  );

  const filteredClergy = useMemo(() => {
    let result = sortedClergy;

    if (selectedInitial) {
      result = filterClergyByInitial(result, selectedInitial);
    }

    if (searchQuery.trim()) {
      const normalizedQuery = slugify(searchQuery);
      result = result.filter((c) => {
        const normalizedName = slugify(c.name);
        return normalizedName.includes(normalizedQuery);
      });
    }

    return result;
  }, [sortedClergy, searchQuery, selectedInitial]);

  useEffect(() => {
    if (searchQuery.trim()) {
      setSelectedInitial("");
    }
  }, [searchQuery]);

  return {
    filteredClergy,
    searchQuery,
    setSearchQuery,
    selectedInitial,
    setSelectedInitial,
    initials,
  };
}
