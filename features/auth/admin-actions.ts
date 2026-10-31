"use server";

import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import {
  EDITOR_NOT_FOUND_MESSAGE,
  isActiveAdmin,
  isEditorTarget,
  type ProfileAccess,
} from "./access";
import {
  parseCreateEditorInput,
  parseEditorChurchesInput,
  parseEditorId,
} from "./admin-validation";

type ServerClient = Awaited<ReturnType<typeof createClient>>;

type AdminAccess = { supabase: ServerClient } | { error: string };

type EditorTarget = { editor: ProfileAccess } | { error: string };

/** Código do PostgREST quando `.single()` não encontra a linha. */
const NO_ROWS_ERROR_CODE = "PGRST116";

function isNoRowsError(error: { code?: string }): boolean {
  return error.code === NO_ROWS_ERROR_CODE;
}

async function requireAdmin(): Promise<AdminAccess> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Não autenticado" };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, is_active")
    .eq("id", user.id)
    .maybeSingle<ProfileAccess>();

  if (!isActiveAdmin(profile)) {
    return { error: "Acesso negado" };
  }

  return { supabase };
}

/** Carrega o perfil alvo e só o aceita se for `editor` (nunca um admin). */
async function findEditorTarget(
  supabase: ServerClient,
  editorId: string,
): Promise<EditorTarget> {
  const { data: target, error } = await supabase
    .from("profiles")
    .select("role, is_active")
    .eq("id", editorId)
    .maybeSingle<ProfileAccess>();

  if (error) {
    return { error: error.message };
  }

  if (!isEditorTarget(target)) {
    return { error: EDITOR_NOT_FOUND_MESSAGE };
  }

  return { editor: target };
}

export async function createEditor(formData: FormData) {
  const access = await requireAdmin();
  if ("error" in access) {
    return { error: access.error };
  }
  const { supabase } = access;

  const input = parseCreateEditorInput({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    churchIds: formData.getAll("churchIds"),
  });

  if (!input.success) {
    return { error: input.error };
  }
  const { name, email, password, churchIds } = input.data;

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

  // O select confirma que a linha foi de fato atualizada.
  const { error: profileError } = await supabase
    .from("profiles")
    .update({ name, role: "editor" })
    .eq("id", userId)
    .select("id")
    .single();

  if (profileError) {
    await adminAuth.auth.admin.deleteUser(userId);
    const reason = isNoRowsError(profileError)
      ? "o perfil do novo editor não foi criado"
      : profileError.message;
    return { error: `Erro ao atualizar perfil: ${reason}` };
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
      await adminAuth.auth.admin.deleteUser(userId);
      return { error: `Erro ao vincular igrejas: ${linkError.message}` };
    }
  }

  revalidatePath("/admin/usuarios");
  return { success: true, userId };
}

export async function toggleEditorActive(editorId: string) {
  const access = await requireAdmin();
  if ("error" in access) {
    return { error: access.error };
  }
  const { supabase } = access;

  const parsedId = parseEditorId(editorId);
  if (!parsedId.success) {
    return { error: parsedId.error };
  }
  const id = parsedId.data;

  const target = await findEditorTarget(supabase, id);
  if ("error" in target) {
    return { error: target.error };
  }

  // O select confirma que um editor foi de fato atualizado (o papel pode ter
  // mudado entre a leitura e a escrita, ou o RLS filtrar a linha).
  const { error } = await supabase
    .from("profiles")
    .update({ is_active: !target.editor.is_active })
    .eq("id", id)
    .eq("role", "editor")
    .select("id")
    .single();

  if (error) {
    return {
      error: isNoRowsError(error) ? EDITOR_NOT_FOUND_MESSAGE : error.message,
    };
  }

  revalidatePath("/admin/usuarios");
  revalidatePath(`/admin/usuarios/${id}`);
  return { success: true };
}

export async function updateEditorChurches(
  editorId: string,
  churchIds: string[]
) {
  const access = await requireAdmin();
  if ("error" in access) {
    return { error: access.error };
  }
  const { supabase } = access;

  const input = parseEditorChurchesInput({ editorId, churchIds });
  if (!input.success) {
    return { error: input.error };
  }
  const { editorId: id, churchIds: nextChurchIds } = input.data;

  const target = await findEditorTarget(supabase, id);
  if ("error" in target) {
    return { error: target.error };
  }

  const { data: currentLinks, error: currentError } = await supabase
    .from("editor_churches")
    .select("church_id")
    .eq("editor_id", id);

  if (currentError) {
    return { error: currentError.message };
  }

  const currentIds = new Set<string>(
    (currentLinks ?? []).map((link: { church_id: string }) => link.church_id)
  );
  const nextIds = new Set(nextChurchIds);
  const toAdd = nextChurchIds.filter((churchId) => !currentIds.has(churchId));
  const toRemove = [...currentIds].filter((churchId) => !nextIds.has(churchId));

  // Inserir antes de remover: se a inserção falhar, os vínculos atuais continuam intactos.
  if (toAdd.length > 0) {
    const { error: insertError } = await supabase
      .from("editor_churches")
      .insert(toAdd.map((churchId) => ({ editor_id: id, church_id: churchId })));

    if (insertError) {
      return { error: insertError.message };
    }
  }

  if (toRemove.length > 0) {
    const { error: deleteError } = await supabase
      .from("editor_churches")
      .delete()
      .eq("editor_id", id)
      .in("church_id", toRemove);

    if (deleteError) {
      return { error: deleteError.message };
    }
  }

  revalidatePath("/admin/usuarios");
  revalidatePath(`/admin/usuarios/${id}`);
  return { success: true };
}
