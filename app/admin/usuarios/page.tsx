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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Editores
          </h1>
          <p className="mt-2 text-muted-foreground">
            Gerencie os editores e seus vínculos com igrejas
          </p>
        </div>
        <Button asChild className="w-full sm:w-auto">
          <Link href="/admin/usuarios/novo">
            <Plus className="mr-2 h-4 w-4" />
            Novo editor
          </Link>
        </Button>
      </div>

      {!editors || editors.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center sm:p-12">
            <UserCircle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold">Nenhum editor cadastrado</h3>
            <p className="text-muted-foreground mt-1">
              Crie um editor para que ele possa gerenciar dados de igrejas
              vinculadas.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {editors.map((editor) => {
            const churches = (
              editor.editor_churches as Array<{
                church_id: string;
                churches: { name: string };
              }>
            ).map((ec) => ec.churches.name);

            return (
              <Link
                key={editor.id}
                href={`/admin/usuarios/${editor.id}`}
                className="block min-w-0 rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <Card className="h-full transition-all hover:shadow-md hover:border-foreground/20">
                  <CardContent className="space-y-1 p-4 sm:p-6">
                    <div className="flex items-center gap-2">
                      <p className="min-w-0 truncate font-medium">
                        {editor.name || editor.email}
                      </p>
                      {!editor.is_active && (
                        <span className="shrink-0 rounded-full bg-destructive/10 px-2 py-0.5 text-xs text-destructive">
                          Inativo
                        </span>
                      )}
                    </div>
                    <p className="truncate text-sm text-muted-foreground">
                      {editor.email}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {churches.length === 0
                        ? "Nenhuma igreja vinculada"
                        : churches.length === 1
                          ? `1 igreja vinculada: ${churches[0]}`
                          : `${churches.length} igrejas vinculadas`}
                    </p>
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
