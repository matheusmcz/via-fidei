"use client";

import { cn, getPastClergyMembers, sortClergyByStartDate } from "@/lib/utils";
import type { Clergy } from "@/types";
import { ChevronDown, History } from "lucide-react";
import { useState } from "react";
import { ClergyCardWithModal } from "./clergy-card-with-modal";

interface ClergyHistoryProps {
  clergy?: Clergy[];
}

export function ClergyHistory({ clergy }: ClergyHistoryProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!clergy || clergy.length === 0) {
    return null;
  }

  const pastClergy = getPastClergyMembers(clergy);

  if (pastClergy.length === 0) {
    return null;
  }

  const sortedPastClergy = sortClergyByStartDate(pastClergy);

  return (
    <div className="mt-6">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        aria-expanded={isExpanded}
        className="flex items-center gap-2 w-full text-left text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        <History className="h-4 w-4" />
        <span>Histórico ({pastClergy.length})</span>
        <ChevronDown
          className={cn(
            "h-4 w-4 ml-auto transition-transform",
            isExpanded && "rotate-180",
          )}
        />
      </button>

      {isExpanded && (
        <div className="mt-4 space-y-3">
          {sortedPastClergy.map((member) => (
            <ClergyCardWithModal key={member.id} clergy={member} />
          ))}
        </div>
      )}
    </div>
  );
}
