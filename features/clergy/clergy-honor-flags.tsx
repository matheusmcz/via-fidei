import { getClergyHonorLabel, getClergyHonors } from "@/lib/utils";
import type { ClergyHonor } from "@/types";

interface ClergyHonorFlagsProps {
  honors?: readonly string[];
}

export function ClergyHonorFlags({ honors }: ClergyHonorFlagsProps) {
  const visibleHonors = getClergyHonors(honors);
  if (visibleHonors.length === 0) return null;

  return (
    <ul className="mt-3 flex flex-wrap items-center justify-center gap-2">
      {visibleHonors.map((honor) => (
        <li key={honor}>
          <ClergyHonorFlag honor={honor} />
        </li>
      ))}
    </ul>
  );
}

function ClergyHonorFlag({ honor }: { honor: ClergyHonor }) {
  return (
    <span className="inline-flex rounded-full border bg-muted px-2.5 py-0.5 text-xs font-medium text-foreground">
      {getClergyHonorLabel(honor)}
    </span>
  );
}
