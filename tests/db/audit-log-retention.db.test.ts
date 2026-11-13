/**
 * Retenção e anonimização do `audit_log` (VF-108, D22), migration `019`,
 * contra o Postgres local (VF-098, D10).
 *
 * Dois assuntos:
 *
 * 1. **Anonimização.** Excluir um editor tem de apagar nome e e-mail de todo o
 *    registro dele no log, inclusive do registro do próprio `DELETE`, que o
 *    trigger `audit_log_changes` da `017` grava com a linha inteira em
 *    `old_data`. `actor_id` e `record_pk` continuam (decisão do usuário,
 *    07/11/2026). Como não existe tela de exclusão de editor — as chamadas a
 *    `deleteUser` em `features/auth/admin-actions.ts` só desfazem a criação —,
 *    quem anonimiza é o banco, e o caminho exercido aqui é o real: apagar o
 *    `auth.users` (o que o painel do Supabase faz) e deixar o perfil sair em
 *    cascata.
 * 2. **Limpeza.** `purge_audit_log()` apaga o que passou dos 2 anos. O
 *    agendamento fica fora da migration (pg_cron ou job externo), então o que
 *    se verifica aqui é quem pode executar a função e que ela não encosta no
 *    que está dentro do prazo.
 *
 * O que **não** dá para verificar por aqui, por exigir privilégio que nenhuma
 * role da API tem — e é bom que não tenha: apagar de fato um registro fora do
 * prazo (precisa gravar um `occurred_at` antigo, e ninguém tem `INSERT` em
 * `audit_log`) e o backfill de perfis já excluídos (precisa desabilitar o
 * trigger para produzir um órfão). Essas duas são do roteiro
 * `supabase/tests/019_retencao_anonimizacao_auditoria_verificacao.sql`
 * (seção 4 o backfill, seções 5 e 6 a limpeza), que roda com a role do SQL
 * Editor dentro de `begin … rollback`.
 *
 * Recusa silenciosa: toda asserção de "foi anonimizado", "não foi apagado" ou
 * "não pode" prova antes que o dado estava lá — as fotos `registrosAntes` e
 * `registrosDepois` são tiradas no `beforeAll`, uma antes e outra depois da
 * exclusão, para que a ordem dos testes não decida o resultado.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { beforeAll, describe, expect, it } from "vitest";
import {
  createAnonTestClient,
  createServiceRoleTestClient,
  signInAsTestUser,
} from "./client";
import { TEST_CHURCHES, TEST_DATA_PREFIX, TEST_USERS } from "./seed";

/** Marcador da `019` (`public.audit_log_pii_mask()`). */
const MASK = "[anonimizado]";

/** Perfil descartável deste teste. O domínio é o que o seed limpa. */
const DISPOSABLE = {
  email: "anonimizacao.vf108@viafidei.test",
  emailAlterado: "anonimizacao.vf108.novo@viafidei.test",
  password: "senha-de-teste-vf108",
  name: `${TEST_DATA_PREFIX} Editor a Excluir`,
  nameAlterado: `${TEST_DATA_PREFIX} Editor a Excluir (renomeado)`,
} as const;

/** Dica para quando o banco local estiver numa versão anterior à `019`. */
const MISSING_MIGRATION_HINT =
  "esperava o comportamento da migration 019; banco local desatualizado? rode `npx supabase db reset`";

/** Colunas de `profiles` que a `019` anonimiza. */
const PII_KEYS = ["name", "email"] as const;

/** `permission denied` do Postgres, como o PostgREST o devolve. */
const PERMISSION_DENIED = "42501";

const PERMISSION_DENIED_HINT =
  "esperava recusa por falta de permissão (42501); PGRST202 aqui significa que a função sumiu do banco";

/** Linha de `audit_log` do jeito que o PostgREST devolve. */
interface AuditRow {
  id: number;
  operation: "INSERT" | "UPDATE" | "DELETE";
  table_name: string;
  actor_id: string | null;
  record_pk: Record<string, string>;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
}

let adminClient: SupabaseClient;
let service: SupabaseClient;
let disposableId: string;
let registrosAntes: AuditRow[];
let registrosDepois: AuditRow[];
let edicoesDeIgrejaAntes: AuditRow[];
let edicoesDeIgrejaDepois: AuditRow[];

/** Registros de `profiles` de um perfil, na ordem em que foram gravados. */
async function lerRegistrosDoPerfil(profileId: string): Promise<AuditRow[]> {
  const { data, error } = await adminClient
    .from("audit_log")
    .select("id, operation, table_name, actor_id, record_pk, old_data, new_data")
    .eq("table_name", "profiles")
    .eq("record_pk->>id", profileId)
    .order("id");

  if (error) {
    throw new Error(
      `Não foi possível ler o audit_log como admin: ${error.message}. ` +
        "A política audit_log_select_admin da 017 está aplicada?"
    );
  }

  return (data ?? []) as AuditRow[];
}

/** Registros de `churches` que um autor gravou, na ordem em que foram gravados. */
async function lerEdicoesDeIgrejaDoAutor(actorId: string): Promise<AuditRow[]> {
  const { data, error } = await adminClient
    .from("audit_log")
    .select("id, operation, table_name, actor_id, record_pk, old_data, new_data")
    .eq("table_name", "churches")
    .eq("actor_id", actorId)
    .order("id");

  if (error) {
    throw new Error(
      `Não foi possível ler as edições de igreja no audit_log: ${error.message}`
    );
  }

  return (data ?? []) as AuditRow[];
}

/** Valores de nome/e-mail à vista em `old_data` e `new_data` de uma linha. */
function valoresDePii(row: AuditRow): string[] {
  return [row.old_data, row.new_data].flatMap((data) =>
    data === null
      ? []
      : PII_KEYS.flatMap((key) =>
          typeof data[key] === "string" ? [data[key] as string] : []
        )
  );
}

beforeAll(async () => {
  adminClient = await signInAsTestUser(TEST_USERS.admin);
  service = createServiceRoleTestClient();

  // O perfil nasce pelo trigger handle_new_user() (INSERT no log, com nome e
  // e-mail em new_data); os dois updates geram um registro cada, com o valor
  // antigo e o novo.
  const { data: criado, error: erroCriacao } = await service.auth.admin.createUser(
    {
      email: DISPOSABLE.email,
      password: DISPOSABLE.password,
      email_confirm: true,
      user_metadata: { name: DISPOSABLE.name },
    }
  );

  if (erroCriacao || !criado?.user) {
    throw new Error(
      `Não foi possível criar o perfil descartável: ${erroCriacao?.message ?? "o Auth não devolveu o usuário"}`
    );
  }

  disposableId = criado.user.id;

  for (const mudanca of [
    { name: DISPOSABLE.nameAlterado },
    { email: DISPOSABLE.emailAlterado },
  ]) {
    const { error } = await service
      .from("profiles")
      .update(mudanca)
      .eq("id", disposableId);

    if (error) {
      throw new Error(
        `Não foi possível alterar o perfil descartável: ${error.message}`
      );
    }
  }

  // Uma edição de igreja feita por ele, logado como editor de verdade. É o que
  // prova a decisão de 07/11/2026: o log continua atribuindo esta edição a
  // ele depois que o perfil sai. Sem isso, `actor_id` nunca sairia de nulo
  // aqui (criação pelo GoTrue, updates pelo service role).
  // O perfil nasce sem permissão (`015`): quem ativa é o admin — aqui, o
  // service role, que não passa pelo trigger da `010`.
  const { error: erroAtivacao } = await service
    .from("profiles")
    .update({ role: "editor", is_active: true })
    .eq("id", disposableId);

  if (erroAtivacao) {
    throw new Error(
      `Não foi possível ativar o perfil descartável: ${erroAtivacao.message}`
    );
  }

  const { error: erroVinculo } = await service
    .from("editor_churches")
    .insert({ editor_id: disposableId, church_id: TEST_CHURCHES.linked.id });

  if (erroVinculo) {
    throw new Error(
      `Não foi possível vincular o perfil descartável à igreja: ${erroVinculo.message}`
    );
  }

  // O e-mail do Auth continua o original: só `profiles.email` foi alterado.
  const editorClient = await signInAsTestUser({
    email: DISPOSABLE.email,
    password: DISPOSABLE.password,
  });

  // Telefone é uma das colunas que o editor vinculado pode alterar (D3, `014`).
  const { error: erroEdicao } = await editorClient
    .from("churches")
    .update({ phone: "(82) 3333-0108" })
    .eq("id", TEST_CHURCHES.linked.id)
    .select("id")
    .single();

  if (erroEdicao) {
    throw new Error(
      `O editor descartável não conseguiu editar a igreja vinculada: ${erroEdicao.message}`
    );
  }

  registrosAntes = await lerRegistrosDoPerfil(disposableId);
  edicoesDeIgrejaAntes = await lerEdicoesDeIgrejaDoAutor(disposableId);

  // O painel do Supabase apaga o auth.users; o perfil sai em cascata.
  const { error: erroExclusao } = await service.auth.admin.deleteUser(
    disposableId
  );

  if (erroExclusao) {
    throw new Error(
      `Não foi possível excluir o perfil descartável: ${erroExclusao.message}`
    );
  }

  registrosDepois = await lerRegistrosDoPerfil(disposableId);
  edicoesDeIgrejaDepois = await lerEdicoesDeIgrejaDoAutor(disposableId);

  // Devolve o cenário ao estado do seed, como em `rls-editor.db.test.ts`: o
  // vínculo some em cascata com o perfil, o telefone não. As fotos acima já
  // foram tiradas, e este registro extra tem outro autor.
  await service
    .from("churches")
    .update({ phone: TEST_CHURCHES.linked.phone })
    .eq("id", TEST_CHURCHES.linked.id);
});

describe("audit_log: anonimização ao excluir um editor (migration 019)", () => {
  it("guardava nome e e-mail enquanto o perfil existia", () => {
    // Verificação positiva: sem ela, os testes seguintes passariam num
    // cenário que nunca gravou dado pessoal nenhum.
    expect(registrosAntes.length).toBeGreaterThanOrEqual(3);
    expect(registrosAntes.map((row) => row.operation)).toContain("INSERT");

    const valores = registrosAntes.flatMap(valoresDePii);
    expect(valores).toContain(DISPOSABLE.name);
    expect(valores).toContain(DISPOSABLE.nameAlterado);
    expect(valores).toContain(DISPOSABLE.email);
    expect(valores).toContain(DISPOSABLE.emailAlterado);
  });

  it("não deixa nome nem e-mail em nenhum registro do perfil excluído", () => {
    const vazados = registrosDepois
      .flatMap(valoresDePii)
      .filter((valor) => valor !== MASK);

    expect(vazados, MISSING_MIGRATION_HINT).toEqual([]);
  });

  it("anonimiza também o registro do próprio DELETE", () => {
    const exclusao = registrosDepois.find((row) => row.operation === "DELETE");

    // O registro do DELETE só existe se o trigger de auditoria tiver rodado
    // antes do de anonimização: é a ordem alfabética dos nomes que garante
    // isso (audit_log_changes < profiles_anonymize_audit_log).
    expect(exclusao, MISSING_MIGRATION_HINT).toBeDefined();
    expect(exclusao?.old_data?.name).toBe(MASK);
    expect(exclusao?.old_data?.email).toBe(MASK);
    expect(exclusao?.new_data).toBeNull();
  });

  it("mantém papel, status e id no registro do DELETE", () => {
    const exclusao = registrosDepois.find((row) => row.operation === "DELETE");

    // O cenário ativou o perfil para que ele editasse uma igreja: o log
    // guarda o papel e o status que ele tinha de verdade ao ser excluído.
    expect(exclusao?.old_data?.role).toBe("editor");
    expect(exclusao?.old_data?.is_active).toBe(true);
    expect(exclusao?.old_data?.id).toBe(disposableId);
  });

  it("mantém record_pk e não apaga registro nenhum", () => {
    // A anonimização reescreve, não remove: o que havia antes continua lá, e o
    // registro do DELETE é o único a mais.
    expect(registrosDepois).toHaveLength(registrosAntes.length + 1);
    expect(registrosDepois.map((row) => row.operation)).toContain("INSERT");

    for (const row of registrosDepois) {
      expect(row.record_pk.id).toBe(disposableId);
    }
  });

  it("mantém a atribuição das edições que o editor excluído fez", async () => {
    // Verificação positiva: ele editou mesmo uma igreja, e o log atribuiu a
    // edição a ele.
    expect(edicoesDeIgrejaAntes.length).toBeGreaterThan(0);
    expect(edicoesDeIgrejaAntes.every((row) => row.actor_id === disposableId)).toBe(
      true
    );

    // Decisão de 07/11/2026: `actor_id` continua no log depois da exclusão —
    // sem ele o log perde a atribuição, e o UUID já não resolve para ninguém.
    expect(
      edicoesDeIgrejaDepois.map((row) => row.id),
      "a exclusão do editor não pode apagar nem desatribuir as edições dele"
    ).toEqual(edicoesDeIgrejaAntes.map((row) => row.id));

    for (const row of edicoesDeIgrejaDepois) {
      expect(row.actor_id).toBe(disposableId);
      // A anonimização é só de `profiles`: nada de marcador em `churches`.
      expect(valoresDePii(row)).not.toContain(MASK);
      expect(row.new_data?.phone).toBe("(82) 3333-0108");
    }
  });

  it("não encosta nos registros de quem continua existindo", async () => {
    // Controle: o admin do seed não foi excluído, então o nome dele continua
    // à vista no log. Se a anonimização pegasse mais do que o perfil alvo,
    // este nome viraria marcador.
    const { data: perfil, error: erroPerfil } = await service
      .from("profiles")
      .select("id")
      .eq("email", TEST_USERS.admin.email)
      .single();

    expect(erroPerfil).toBeNull();

    const adminId = (perfil as { id: string } | null)?.id;
    expect(adminId).toBeDefined();

    const registros = await lerRegistrosDoPerfil(adminId as string);
    const valores = registros.flatMap(valoresDePii);

    // Verificação positiva: o admin tem registro no log (o seed o criou) e o
    // nome dele está lá — então o `not.toContain` abaixo tem o que reprovar.
    expect(registros.length).toBeGreaterThan(0);
    expect(valores).toContain(TEST_USERS.admin.name);
    expect(valores).not.toContain(MASK);
  });
});

describe("audit_log: limpeza por retenção (migration 019)", () => {
  it("o service role executa purge_audit_log() e recebe o total apagado", async () => {
    const { data, error } = await service.rpc("purge_audit_log");

    expect(error, MISSING_MIGRATION_HINT).toBeNull();
    expect(typeof data).toBe("number");
    expect(data).toBeGreaterThanOrEqual(0);
  });

  it("não apaga registro dentro do prazo de 2 anos", async () => {
    const antes = await lerRegistrosDoPerfil(disposableId);
    // Verificação positiva: há o que apagar errado, se a função errar o prazo.
    expect(antes.length).toBeGreaterThan(0);

    const { error } = await service.rpc("purge_audit_log");
    expect(error).toBeNull();

    const depois = await lerRegistrosDoPerfil(disposableId);
    expect(depois.map((row) => row.id)).toEqual(antes.map((row) => row.id));
  });

  it("o admin logado não executa a limpeza", async () => {
    // O admin lê o log; apagar não é dele. A verificação positiva de que a
    // função existe e está exposta é o teste do service role, acima.
    const { data, error } = await adminClient.rpc("purge_audit_log");

    // O código separa "sem permissão" de "a função sumiu" (PGRST202): sem
    // isso, remover a função por engano deixaria este teste verde.
    expect(error?.code, PERMISSION_DENIED_HINT).toBe(PERMISSION_DENIED);
    expect(data).toBeNull();
  });

  it("o anon não executa a limpeza", async () => {
    const { data, error } = await createAnonTestClient().rpc("purge_audit_log");

    expect(error?.code, PERMISSION_DENIED_HINT).toBe(PERMISSION_DENIED);
    expect(data).toBeNull();
  });
});

describe("audit_log: continua fechado para escrita pela API", () => {
  it("o service role lê, mas não insere, altera nem apaga", async () => {
    const { data: lidos, error: erroLeitura } = await service
      .from("audit_log")
      .select("id")
      .order("id")
      .limit(1);

    // Verificação positiva: há linha para alterar ou apagar.
    expect(erroLeitura).toBeNull();
    expect(lidos?.length).toBe(1);

    const alvo = (lidos as { id: number }[] | null)?.[0]?.id as number;
    expect(typeof alvo).toBe("number");

    const { error: erroInsercao } = await service.from("audit_log").insert({
      actor_db_role: "service_role",
      table_name: "churches",
      operation: "UPDATE",
      record_pk: { id: "forjado" },
    });
    expect(erroInsercao).not.toBeNull();

    const { error: erroAlteracao } = await service
      .from("audit_log")
      .update({ actor_db_role: "forjado" })
      .eq("id", alvo);
    expect(erroAlteracao).not.toBeNull();

    const { error: erroExclusao } = await service
      .from("audit_log")
      .delete()
      .eq("id", alvo);
    expect(erroExclusao).not.toBeNull();

    // E a linha continua lá depois das três tentativas.
    const { data: aindaLa } = await service
      .from("audit_log")
      .select("id")
      .eq("id", alvo);
    expect(aindaLa?.length).toBe(1);
  });

  it("as funções internas da 019 não são chamáveis por RPC", async () => {
    for (const funcao of [
      "audit_log_pii_mask",
      "audit_log_retention",
      "anonymize_profiles_in_audit_log",
    ]) {
      const { error } = await service.rpc(funcao);
      expect(
        error?.code,
        `${funcao} deveria recusar por falta de permissão, não por outro motivo`
      ).toBe(PERMISSION_DENIED);
    }
  });

  it("a função do trigger nem chega a ser exposta pela API", async () => {
    // Função que devolve `trigger` não entra no cache de schema do PostgREST,
    // então aqui a recusa é por inexistência, não por permissão — motivo
    // diferente das de cima, e por isso um teste à parte.
    const { error } = await service.rpc("anonymize_profile_in_audit_log");

    expect(error?.code).toBe("PGRST202");
  });
});
