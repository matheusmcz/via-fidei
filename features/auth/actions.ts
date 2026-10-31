"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import {
  getLoginOutcome,
  isDeactivated,
  SIGN_OUT_FAILED_HINT,
  type ProfileAccess,
} from "./access";

export async function login(formData: FormData) {
  const supabase = await createClient();

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: "Email ou senha inválidos" };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Erro ao obter dados do usuário" };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, is_active")
    .eq("id", user.id)
    .maybeSingle<ProfileAccess>();

  const outcome = getLoginOutcome(profile);

  if ("error" in outcome) {
    // O signInWithPassword já gravou os cookies da sessão: encerrá-la para que
    // o perfil recusado não continue logado. Perfil desativado derruba as
    // sessões de todos os dispositivos; falha ao ler o perfil (provavelmente
    // passageira, de um usuário ativo) encerra só esta.
    const scope = isDeactivated(profile) ? "global" : "local";
    const { error: signOutError } = await supabase.auth.signOut({ scope });
    if (signOutError) {
      return { error: `${outcome.error} ${SIGN_OUT_FAILED_HINT}` };
    }
    return { error: outcome.error };
  }

  redirect(outcome.redirectTo);
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

export async function getSession() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return profile;
}
