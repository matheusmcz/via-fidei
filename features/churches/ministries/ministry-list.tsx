import type { ChurchMinistry } from "@/types";

interface MinistryListProps {
  title: string;
  items: ChurchMinistry[];
}

export function MinistryList({ title, items }: MinistryListProps) {
  if (items.length === 0) return null;

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <span
            key={item.id}
            className="inline-flex items-center gap-1.5 rounded-md border bg-muted/50 px-3 py-1.5 text-sm transition-colors hover:bg-muted cursor-default"
          >
            <span>{item.label}</span>
            {item.acronym && (
              <span className="font-semibold text-muted-foreground">
                ({item.acronym})
              </span>
            )}
          </span>
        ))}
      </div>
    </div>
  );
}
