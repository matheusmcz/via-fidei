"use client";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { ClergyWithChurch } from "@/types";
import { Search, Users } from "lucide-react";
import { useState } from "react";
import { ClergyListCard } from "./clergy-list-card";
import { ClergyPageModal } from "./clergy-page-modal";
import { useClergyFilters } from "./use-clergy-filters";

interface ClergyPageListProps {
  clergy: ClergyWithChurch[];
}

export function ClergyPageList({ clergy }: ClergyPageListProps) {
  const {
    filteredClergy,
    searchQuery,
    setSearchQuery,
    selectedInitial,
    setSelectedInitial,
    initials,
  } = useClergyFilters({ clergy });

  const [selectedMember, setSelectedMember] =
    useState<ClergyWithChurch | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  function handleCardClick(member: ClergyWithChurch) {
    setSelectedMember(member);
    setIsModalOpen(true);
  }

  return (
    <div className="space-y-6">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Buscar por nome..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      <AlphabetFilter
        initials={initials}
        selected={selectedInitial}
        onSelect={setSelectedInitial}
      />

      {filteredClergy.length > 0 ? (
        <>
          <p className="text-sm text-muted-foreground">
            {filteredClergy.length}{" "}
            {filteredClergy.length === 1 ? "clérigo" : "clérigos"}
            {selectedInitial && ` com a letra "${selectedInitial}"`}
          </p>
          <div className="grid gap-2 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {filteredClergy.map((member) => (
              <ClergyListCard
                key={member.id}
                clergy={member}
                onClick={() => handleCardClick(member)}
              />
            ))}
          </div>
        </>
      ) : (
        <EmptyState searchQuery={searchQuery} selectedInitial={selectedInitial} />
      )}

      <ClergyPageModal
        clergy={selectedMember}
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
      />
    </div>
  );
}

interface AlphabetFilterProps {
  initials: string[];
  selected: string;
  onSelect: (initial: string) => void;
}

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

function AlphabetFilter({ initials, selected, onSelect }: AlphabetFilterProps) {
  return (
    <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtrar por letra inicial">
      <button
        type="button"
        onClick={() => onSelect("")}
        className={cn(
          "h-8 px-3 rounded-md text-xs font-medium transition-colors",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          !selected
            ? "bg-foreground text-background"
            : "bg-muted text-muted-foreground hover:bg-muted/80",
        )}
      >
        Todos
      </button>
      {ALPHABET.map((letter) => {
        const hasClergy = initials.includes(letter);
        return (
          <button
            key={letter}
            type="button"
            onClick={() => onSelect(selected === letter ? "" : letter)}
            className={cn(
              "h-8 w-8 rounded-md text-sm font-medium transition-colors",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              selected === letter
                ? "bg-foreground text-background"
                : hasClergy
                  ? "bg-muted text-muted-foreground hover:bg-muted/80"
                  : "bg-muted/50 text-muted-foreground/40",
            )}
          >
            {letter}
          </button>
        );
      })}
    </div>
  );
}

interface EmptyStateProps {
  searchQuery: string;
  selectedInitial: string;
}

function EmptyState({ searchQuery, selectedInitial }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="rounded-full bg-muted p-6 mb-4">
        <Users className="h-12 w-12 text-muted-foreground" />
      </div>
      <h3 className="text-xl font-semibold mb-2">Nenhum clérigo encontrado</h3>
      <p className="text-muted-foreground max-w-md">
        {searchQuery
          ? `Não encontramos resultados para "${searchQuery}". Tente buscar por outro nome.`
          : selectedInitial
            ? `Nenhum clérigo com a letra "${selectedInitial}".`
            : "Nenhum clérigo cadastrado no momento."}
      </p>
    </div>
  );
}
