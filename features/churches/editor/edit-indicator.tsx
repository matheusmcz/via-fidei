"use client";

import { useAuth, type ChurchDataKind } from "@/features/auth";
import { Pencil } from "lucide-react";

interface EditIndicatorProps {
  churchId: string;
  /** Tipo de dado que o lápis edita: decide quem vê o controle (D3). */
  kind: ChurchDataKind;
}

export function EditIndicator({ churchId, kind }: EditIndicatorProps) {
  const { canEditChurchData, isLoading } = useAuth();

  if (isLoading || !canEditChurchData(churchId, kind)) {
    return null;
  }

  return (
    <button
      className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors ml-2"
      title="Editar"
    >
      <Pencil className="h-3 w-3" />
    </button>
  );
}
