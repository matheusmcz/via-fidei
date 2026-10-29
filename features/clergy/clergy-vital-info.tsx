import { getClergyAge, getClergyYear } from "@/lib/utils";
import type { Clergy } from "@/types";
import { Star } from "lucide-react";

interface ClergyVitalInfoProps {
  clergy: Clergy;
}

function LatinCross({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      className={className}
      aria-hidden
    >
      <path d="M12 3v18" />
      <path d="M7 8h10" />
    </svg>
  );
}

export function ClergyVitalInfo({ clergy }: ClergyVitalInfoProps) {
  const birthYear = clergy.birthDate ? getClergyYear(clergy.birthDate) : null;
  const deathYear = clergy.deathDate ? getClergyYear(clergy.deathDate) : null;
  const age = getClergyAge(clergy.birthDate, clergy.deathDate);

  if (!birthYear && !deathYear) {
    return null;
  }

  const ageLabel = age === null ? null : age === 1 ? "1 ano" : `${age} anos`;

  return (
    <p className="mt-4 flex flex-wrap items-center justify-center gap-x-1.5 text-sm text-muted-foreground">
      <span className="sr-only">
        {birthYear && `Nascimento ${birthYear}. `}
        {deathYear && `Falecimento ${deathYear}. `}
        {ageLabel && `${ageLabel}.`}
      </span>
      {birthYear && (
        <span className="inline-flex items-center gap-1.5" aria-hidden>
          <Star className="h-4 w-4" />
          <span>- {birthYear}</span>
        </span>
      )}
      {deathYear && (
        <span className="inline-flex items-center gap-1.5" aria-hidden>
          {birthYear && <span>-</span>}
          <LatinCross className="h-4 w-4" />
          <span>- {deathYear}</span>
        </span>
      )}
      {ageLabel && (
        <span className="inline-flex items-center gap-1.5" aria-hidden>
          <span>|</span>
          <span>{ageLabel}</span>
        </span>
      )}
    </p>
  );
}
