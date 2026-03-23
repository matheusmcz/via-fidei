import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EditorChurchManager } from "./editor-church-manager";
import { ToggleActiveButton } from "./toggle-active-button";

interface EditorDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditorDetailPage({
  params,
}: EditorDetailPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: editor } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", id)
    .eq("role", "editor")
    .single();

  if (!editor) {
    notFound();
  }

  const { data: editorChurches } = await supabase
    .from("editor_churches")
    .select("church_id, churches(id, name)")
    .eq("editor_id", id);

  const { data: allChurches } = await supabase
    .from("churches")
    .select("id, name")
    .order("name");

  const linkedChurchIds = (editorChurches ?? []).map(
    (ec: { church_id: string }) => ec.church_id
  );

  return (
    <div className="max-w-2xl space-y-6">
      <Link
        href="/admin/usuarios"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar para editores
      </Link>

      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            {editor.name || editor.email}
          </h2>
          <p className="text-muted-foreground mt-1">{editor.email}</p>
        </div>
        <ToggleActiveButton editorId={editor.id} isActive={editor.is_active} />
      </div>

      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Status</p>
              <p className="font-medium">
                {editor.is_active ? "Ativo" : "Inativo"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Criado em</p>
              <p className="font-medium">
                {new Date(editor.created_at).toLocaleDateString("pt-BR")}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold mb-4">Igrejas vinculadas</h3>
          <EditorChurchManager
            editorId={id}
            allChurches={allChurches ?? []}
            linkedChurchIds={linkedChurchIds}
          />
        </CardContent>
      </Card>
    </div>
  );
}
