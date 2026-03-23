import { cn, formatClergyName, getClergyTitle, getRoleLabel } from "@/lib/utils";
import type { ClergyWithChurch } from "@/types";
import { User } from "lucide-react";
import Image from "next/image";

interface ClergyListCardProps {
  clergy: ClergyWithChurch;
  onClick: () => void;
}

export function ClergyListCard({ clergy, onClick }: ClergyListCardProps) {
  const titleAbbr = getClergyTitle(clergy.title);
  const roleLabel = getRoleLabel(clergy.role);
  const formattedName = formatClergyName(clergy);

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 w-full text-left p-3 rounded-lg border bg-card",
        "transition-all hover:shadow-md hover:border-foreground/20",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        "cursor-pointer",
      )}
    >
      <div className="relative h-11 w-11 flex-shrink-0 overflow-hidden rounded-full bg-muted">
        {clergy.imageUrl ? (
          <Image
            src={clergy.imageUrl}
            alt={formattedName}
            fill
            className="object-cover"
            sizes="44px"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <User className="h-5 w-5 text-muted-foreground" />
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{formattedName}</p>
        <p className="text-xs text-muted-foreground truncate">
          {titleAbbr ? `${roleLabel}` : roleLabel} · {clergy.churchName}
        </p>
      </div>
    </button>
  );
}
