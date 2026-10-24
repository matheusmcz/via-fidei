"use client";

import { useAuth } from "@/features/auth";
import { Pencil } from "lucide-react";

interface EditIndicatorProps {
  churchId: string;
}

export function EditIndicator({ churchId }: EditIndicatorProps) {
  const { canEditChurch, isLoading } = useAuth();

  if (isLoading || !canEditChurch(churchId)) {
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
