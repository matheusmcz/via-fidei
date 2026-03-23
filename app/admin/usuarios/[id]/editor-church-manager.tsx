"use client";

import { Button } from "@/components/ui/button";
import { updateEditorChurches } from "@/features/auth/admin-actions";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface EditorChurchManagerProps {
  editorId: string;
  allChurches: Array<{ id: string; name: string }>;
  linkedChurchIds: string[];
}

export function EditorChurchManager({
  editorId,
  allChurches,
  linkedChurchIds,
}: EditorChurchManagerProps) {
  const [selected, setSelected] = useState<Set<string>>(
    new Set(linkedChurchIds)
  );
  const [isPending, setIsPending] = useState(false);
  const router = useRouter();

  const hasChanges =
    selected.size !== linkedChurchIds.length ||
    linkedChurchIds.some((id) => !selected.has(id));

  function toggle(churchId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(churchId)) {
        next.delete(churchId);
      } else {
        next.add(churchId);
      }
      return next;
    });
  }

  async function handleSave() {
    setIsPending(true);
    const result = await updateEditorChurches(editorId, Array.from(selected));
    if (result.error) {
      alert(result.error);
    }
    router.refresh();
    setIsPending(false);
  }

  return (
    <div className="space-y-4">
      <div className="max-h-60 overflow-y-auto border rounded-md p-2 space-y-1">
        {allChurches.map((church) => (
          <label
            key={church.id}
            className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-accent/50 cursor-pointer text-sm"
          >
            <input
              type="checkbox"
              checked={selected.has(church.id)}
              onChange={() => toggle(church.id)}
              className="rounded"
            />
            {church.name}
          </label>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {selected.size} igreja(s) selecionada(s)
        </p>
        {hasChanges && (
          <Button onClick={handleSave} size="sm" disabled={isPending}>
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              "Salvar vínculos"
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
