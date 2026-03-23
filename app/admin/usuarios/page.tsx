import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { Plus, UserCircle } from "lucide-react";
import Link from "next/link";

export default async function EditorsPage() {
  const supabase = await createClient();

  const { data: editors } = await supabase
    .from("profiles")
    .select("*, editor_churches(church_id, churches(name))")
    .eq("role", "editor")
    .order("name");

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Editores</h2>
          <p className="text-muted-foreground mt-1">
            Gerencie os editores e seus vínculos com igrejas
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/usuarios/novo">
            <Plus className="mr-2 h-4 w-4" />
            Novo editor
          </Link>
        </Button>
      </div>

      {!editors || editors.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <UserCircle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold">Nenhum editor cadastrado</h3>
            <p className="text-muted-foreground mt-1">
              Crie um editor para que ele possa gerenciar dados de igrejas
              vinculadas.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {editors.map((editor) => {
            const churches = (
              editor.editor_churches as Array<{
                church_id: string;
                churches: { name: string };
              }>
            ).map((ec) => ec.churches.name);

            return (
              <Link key={editor.id} href={`/admin/usuarios/${editor.id}`}>
                <Card className="hover:bg-accent/50 transition-colors">
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{editor.name || editor.email}</p>
                          {!editor.is_active && (
                            <span className="text-xs bg-destructive/10 text-destructive px-2 py-0.5 rounded-full">
                              Inativo
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {editor.email}
                        </p>
                        {churches.length > 0 && (
                          <p className="text-sm text-muted-foreground">
                            {churches.length === 1
                              ? `1 igreja vinculada: ${churches[0]}`
                              : `${churches.length} igrejas vinculadas`}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
