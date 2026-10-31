"use client";

import { Button } from "@/components/ui/button";
import { toggleEditorActive } from "@/features/auth/admin-actions";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface ToggleActiveButtonProps {
  editorId: string;
  isActive: boolean;
}

export function ToggleActiveButton({
  editorId,
  isActive,
}: ToggleActiveButtonProps) {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleToggle() {
    setIsPending(true);
    setError(null);
    const result = await toggleEditorActive(editorId);
    if (result.error) {
      setError(result.error);
    }
    router.refresh();
    setIsPending(false);
  }

  return (
    <div className="flex flex-col items-start gap-2 sm:items-end">
      <Button
        variant={isActive ? "destructive" : "default"}
        size="sm"
        onClick={handleToggle}
        disabled={isPending}
      >
        {isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : isActive ? (
          "Desativar"
        ) : (
          "Ativar"
        )}
      </Button>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
