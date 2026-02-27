import {
  formatClergyName,
  formatClergyTenure,
  getRoleLabel,
} from "@/lib/utils";
import type { Clergy } from "@/types";
import { User } from "lucide-react";
import Image from "next/image";

interface ClergyCardProps {
  clergy: Clergy;
  /** Show tenure period (startDate - endDate) */
  showTenure?: boolean;
}

export function ClergyCard({ clergy, showTenure = true }: ClergyCardProps) {
  const formattedName = formatClergyName(clergy);
  const roleLabel = getRoleLabel(clergy.role);
  const tenure = showTenure ? formatClergyTenure(clergy) : null;

  return (
    <div className="flex items-center gap-4 p-4 rounded-lg border bg-card transition-shadow hover:shadow-md">
      {/* Avatar / Image */}
      <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-full bg-muted">
        {clergy.imageUrl ? (
          <Image
            src={clergy.imageUrl}
            alt={formattedName}
            fill
            className="object-cover"
            sizes="64px"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <User className="h-8 w-8 text-muted-foreground" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-base truncate">{formattedName}</p>
        <p className="text-sm text-muted-foreground">
          {roleLabel}
          {tenure && <span className="ml-1">({tenure})</span>}
        </p>
        {clergy.bio && (
          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
            {clergy.bio}
          </p>
        )}
      </div>
    </div>
  );
}
