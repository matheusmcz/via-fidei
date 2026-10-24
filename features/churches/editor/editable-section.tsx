"use client";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth";
import { Plus } from "lucide-react";
import type { ReactNode } from "react";

interface EditableSectionProps {
  churchId: string;
  hasContent: boolean;
  emptyMessage: string;
  addLabel: string;
  onAdd?: () => void;
  children: ReactNode;
}

export function EditableSection({
  churchId,
  hasContent,
  emptyMessage,
  addLabel,
  onAdd,
  children,
}: EditableSectionProps) {
  const { canEditChurch, isLoading } = useAuth();

  const canEdit = !isLoading && canEditChurch(churchId);

  if (hasContent) {
    return <>{children}</>;
  }

  if (canEdit) {
    return (
      <div className="py-8 text-center">
        <p className="text-sm text-muted-foreground mb-3">{emptyMessage}</p>
        <Button variant="outline" size="sm" onClick={onAdd}>
          <Plus className="mr-2 h-4 w-4" />
          {addLabel}
        </Button>
      </div>
    );
  }

  return null;
}
