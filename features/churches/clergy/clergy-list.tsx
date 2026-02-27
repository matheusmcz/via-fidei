import { getActiveClergyMembers, sortClergyByRole } from "@/lib/utils";
import type { Clergy } from "@/types";
import { Users } from "lucide-react";
import { ClergyCard } from "./clergy-card";

interface ClergyListProps {
  clergy?: Clergy[];
}

export function ClergyList({ clergy }: ClergyListProps) {
  if (!clergy || clergy.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
        <Users className="h-12 w-12 mb-2 opacity-50" />
        <p className="text-sm">Nenhum clérigo cadastrado</p>
      </div>
    );
  }

  const activeClergy = getActiveClergyMembers(clergy);

  if (activeClergy.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
        <Users className="h-12 w-12 mb-2 opacity-50" />
        <p className="text-sm">Nenhum clérigo ativo</p>
      </div>
    );
  }

  const sortedClergy = sortClergyByRole(activeClergy);

  return (
    <div className="space-y-3">
      {sortedClergy.map((member) => (
        <ClergyCard key={member.id} clergy={member} />
      ))}
    </div>
  );
}
