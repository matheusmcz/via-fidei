"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createEditor } from "@/features/auth/admin-actions";
import { createClient } from "@/lib/supabase/client";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";

type CreateEditorState = { error?: string; success?: boolean; userId?: string } | null;

function createEditorAction(_prevState: CreateEditorState, formData: FormData) {
  return createEditor(formData);
}

export default function NewEditorPage() {
  const [state, formAction, isPending] = useActionState(createEditorAction, null);
  const [churches, setChurches] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedChurches, setSelectedChurches] = useState<Set<string>>(new Set());
  const router = useRouter();

  useEffect(() => {
    async function loadChurches() {
      const supabase = createClient();
      const { data } = await supabase
        .from("churches")
        .select("id, name")
        .order("name");
      setChurches(data ?? []);
    }
    loadChurches();
  }, []);

  useEffect(() => {
    if (state?.success) {
      router.push("/admin/usuarios");
    }
  }, [state, router]);

  function toggleChurch(churchId: string) {
    setSelectedChurches((prev) => {
      const next = new Set(prev);
      if (next.has(churchId)) {
        next.delete(churchId);
      } else {
        next.add(churchId);
      }
      return next;
    });
  }

  return (
    <div className="max-w-2xl space-y-6">
      <Link
        href="/admin/usuarios"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar para editores
      </Link>

      <div>
        <h2 className="text-2xl font-bold tracking-tight">Novo editor</h2>
        <p className="text-muted-foreground mt-1">
          Crie uma conta de editor e vincule a igrejas
        </p>
      </div>

      <Card>
        <CardContent className="p-6">
          <form action={formAction} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Nome</Label>
              <Input id="name" name="name" required placeholder="Nome do editor" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                required
                placeholder="editor@email.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha temporária</Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                placeholder="Mínimo 6 caracteres"
                minLength={6}
              />
            </div>

            <div className="space-y-2">
              <Label>Igrejas vinculadas</Label>
              <p className="text-sm text-muted-foreground">
                Selecione as igrejas que este editor poderá gerenciar
              </p>
              <div className="max-h-60 overflow-y-auto border rounded-md p-2 space-y-1">
                {churches.map((church) => (
                  <label
                    key={church.id}
                    className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-accent/50 cursor-pointer text-sm"
                  >
                    <input
                      type="checkbox"
                      name="churchIds"
                      value={church.id}
                      checked={selectedChurches.has(church.id)}
                      onChange={() => toggleChurch(church.id)}
                      className="rounded"
                    />
                    {church.name}
                  </label>
                ))}
              </div>
              {selectedChurches.size > 0 && (
                <p className="text-xs text-muted-foreground">
                  {selectedChurches.size} igreja(s) selecionada(s)
                </p>
              )}
            </div>

            {state?.error && (
              <p className="text-sm text-destructive">{state.error}</p>
            )}

            <Button type="submit" disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Criando...
                </>
              ) : (
                "Criar editor"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
