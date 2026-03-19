import type { ChurchMinistries } from "@/types";
import { MinistryList } from "./ministry-list";

const EMPTY_MESSAGE = "Nenhum grupo, movimento ou pastoral cadastrado.";

interface MinistriesSectionProps {
  ministries: ChurchMinistries | undefined;
}

export function MinistriesSection({ ministries }: MinistriesSectionProps) {
  const groups = ministries?.groups;
  const movements = ministries?.movements;
  const pastorals = ministries?.pastorals;

  const hasAny =
    (groups && groups.length > 0) ||
    (movements && movements.length > 0) ||
    (pastorals && pastorals.length > 0);

  if (!hasAny) {
    return (
      <p className="text-sm text-muted-foreground">{EMPTY_MESSAGE}</p>
    );
  }

  return (
    <div className="space-y-6">
      {groups && groups.length > 0 && (
        <MinistryList title="Grupos" items={groups} />
      )}
      {movements && movements.length > 0 && (
        <MinistryList title="Movimentos" items={movements} />
      )}
      {pastorals && pastorals.length > 0 && (
        <MinistryList title="Pastorais" items={pastorals} />
      )}
    </div>
  );
}
