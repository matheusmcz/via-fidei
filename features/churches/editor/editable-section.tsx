"use client";

import { Button } from "@/components/ui/button";
import { useAuth, type ChurchDataKind } from "@/features/auth";
import { Plus } from "lucide-react";
import type { ReactNode } from "react";

interface EditableSectionProps {
  churchId: string;
  /** Tipo de dado da seção: decide quem vê o "Adicionar" (D3). */
  kind: ChurchDataKind;
  hasContent: boolean;
  emptyMessage: string;
  addLabel: string;
  onAdd?: () => void;
  children: ReactNode;
}

export function EditableSection({
  churchId,
  kind,
  hasContent,
  emptyMessage,
  addLabel,
  onAdd,
  children,
}: EditableSectionProps) {
  const { canEditChurchData, isLoading } = useAuth();

  const canEdit = !isLoading && canEditChurchData(churchId, kind);

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
