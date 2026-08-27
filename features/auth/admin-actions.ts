"use server";

import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function createEditor(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser();

  if (!currentUser) {
    return { error: "Não autenticado" };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", currentUser.id)
    .single();

  if (profile?.role !== "admin") {
    return { error: "Acesso negado" };
  }

  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const churchIds = formData.getAll("churchIds") as string[];

  if (!name || !email || !password) {
    return { error: "Nome, email e senha são obrigatórios" };
  }

  let adminAuth;
  try {
    adminAuth = createServiceRoleClient();
  } catch {
    return {
      error:
        "Servidor sem SUPABASE_SERVICE_ROLE_KEY. Defina em .env.local (Project Settings → API).",
    };
  }

  const { data: authData, error: authError } =
    await adminAuth.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name },
    });

  if (authError) {
    return { error: `Erro ao criar usuário: ${authError.message}` };
  }

  const userId = authData.user.id;

  const { error: profileError } = await supabase
    .from("profiles")
    .update({ name, role: "editor" })
    .eq("id", userId);

  if (profileError) {
    return { error: `Erro ao atualizar perfil: ${profileError.message}` };
  }

  if (churchIds.length > 0) {
    const links = churchIds.map((churchId) => ({
      editor_id: userId,
      church_id: churchId,
    }));

    const { error: linkError } = await supabase
      .from("editor_churches")
      .insert(links);

    if (linkError) {
      return { error: `Erro ao vincular igrejas: ${linkError.message}` };
    }
  }

  revalidatePath("/admin/usuarios");
  return { success: true, userId };
}

export async function toggleEditorActive(editorId: string) {
  const supabase = await createClient();

  const { data: editor } = await supabase
    .from("profiles")
    .select("is_active")
    .eq("id", editorId)
    .single();

  if (!editor) {
    return { error: "Editor não encontrado" };
  }

  const { error } = await supabase
    .from("profiles")
    .update({ is_active: !editor.is_active })
    .eq("id", editorId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin/usuarios");
  return { success: true };
}

export async function updateEditorChurches(
  editorId: string,
  churchIds: string[]
) {
  const supabase = await createClient();

  const { error: deleteError } = await supabase
    .from("editor_churches")
    .delete()
    .eq("editor_id", editorId);

  if (deleteError) {
    return { error: deleteError.message };
  }

  if (churchIds.length > 0) {
    const links = churchIds.map((churchId) => ({
      editor_id: editorId,
      church_id: churchId,
    }));

    const { error: insertError } = await supabase
      .from("editor_churches")
      .insert(links);

    if (insertError) {
      return { error: insertError.message };
    }
  }

  revalidatePath("/admin/usuarios");
  revalidatePath(`/admin/usuarios/${editorId}`);
  return { success: true };
}
