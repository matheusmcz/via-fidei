/**
 * Permissões do editor no banco (migrations `008` e `014`), contra o Postgres
 * local (VF-098, D10).
 *
 * Regras verificadas (D3, D11, D14 e a contraparte no banco da D15):
 * - o editor vinculado grava **contato, foto e link do Maps** da igreja dele,
 *   além de horários, atividades e vínculos de grupos/movimentos/pastorais;
 * - **identidade da igreja** (nome, slug, endereço, bairro, tipo) e **clero**
 *   (cadastro e vínculo) são só do admin — é o que torna a D15 segura. A D15 em
 *   si é de UI (o editor vê o Clero como o visitante) e cabe ao VF-104;
 * - o **catálogo** de ministérios é do admin; o editor só vincula itens que já
 *   existem (D14);
 * - nada disso vale para igreja a que o editor não está vinculado, e o editor
 *   não se vincula a outra igreja.
 *
 * Os dois tipos de recusa aparecem de formas diferentes na API:
 * - **trigger** (`churches_restrict_editor_columns`): a linha passa pelo RLS e
 *   o `raise exception` vira erro `42501`;
 * - **RLS**: a linha não passa pelo `using`/`with check`. No UPDATE e no DELETE
 *   nenhuma linha é atingida e a resposta é lista vazia, sem erro; no INSERT
 *   vem erro `42501` ("new row violates row-level security policy").
 *
 * Por isso toda recusa por RLS em UPDATE/DELETE passa pelos helpers
 * `expectUpdateBlockedByRls`/`expectDeleteBlockedByRls`: eles conferem antes
 * que a linha existe, senão "lista vazia" também passaria com o cenário
 * desmontado e o teste ficaria verde sem exercitar RLS nenhum.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { beforeAll, describe, expect, it } from "vitest";
import {
  createAnonTestClient,
  createServiceRoleTestClient,
  signInAsTestUser,
} from "./client";
import {
  TEST_ACTIVITIES,
  TEST_ACTIVITY_SCHEDULES,
  TEST_CHURCHES,
  TEST_CHURCH_CLERGY_ID,
  TEST_CLERGY,
  TEST_DATA_PREFIX,
  TEST_MINISTRY,
  TEST_SCHEDULE_EVENTS,
  TEST_USERS,
} from "./seed";

/** Mensagem do `raise exception` da `014`. */
const ADMIN_ONLY_COLUMNS_MESSAGE =
  "O editor só altera contato, foto e link do Maps";

/** Dica para quando o banco local estiver numa versão anterior à `014`. */
const MISSING_TRIGGER_HINT =
  "esperava a recusa do trigger da 014; banco local desatualizado? rode `npx supabase db reset`";

/** Colunas de identidade da igreja: só o admin altera (D3). */
const IDENTITY_COLUMNS = [
  ["name", `${TEST_DATA_PREFIX} Nome Trocado`],
  ["slug", "teste-vf098-slug-trocado"],
  ["address", "Rua Trocada, 99"],
  ["district", "Jatiúca"],
  ["type", "chapel"],
] as const;

let editorClient: SupabaseClient;
let adminClient: SupabaseClient;
let anonClient: SupabaseClient;
let editorId: string;

beforeAll(async () => {
  editorClient = await signInAsTestUser(TEST_USERS.editor);
  adminClient = await signInAsTestUser(TEST_USERS.admin);
  anonClient = createAnonTestClient();

  const { data } = await editorClient.auth.getUser();
  if (!data.user) throw new Error("O editor de teste não ficou autenticado");
  editorId = data.user.id;
});

/** Confere que a linha existe antes de afirmar que o UPDATE não atinge nada. */
async function expectUpdateBlockedByRls(
  table: string,
  id: string,
  patch: Record<string, unknown>
): Promise<void> {
  const { data: existing } = await anonClient
    .from(table)
    .select("id")
    .eq("id", id);

  expect(
    existing,
    `cenário desmontado: ${table} com id ${id} não existe, então "lista vazia" não prova nada`
  ).toHaveLength(1);

  const { data, error } = await editorClient
    .from(table)
    .update(patch)
    .eq("id", id)
    .select("id");

  expect(error).toBeNull();
  expect(data).toEqual([]);
}

/** Confere que a linha existe antes de afirmar que o DELETE não atinge nada. */
async function expectDeleteBlockedByRls(
  table: string,
  id: string
): Promise<void> {
  const { data: existing } = await anonClient
    .from(table)
    .select("id")
    .eq("id", id);

  expect(
    existing,
    `cenário desmontado: ${table} com id ${id} não existe, então "lista vazia" não prova nada`
  ).toHaveLength(1);

  const { data, error } = await editorClient
    .from(table)
    .delete()
    .eq("id", id)
    .select("id");

  expect(error).toBeNull();
  expect(data).toEqual([]);
}

describe("o editor grava os dados da igreja dele", () => {
  it("altera contato, foto e link do Maps", async () => {
    const patch = {
      phone: "(82) 3333-9999",
      whatsapp: "(82) 99999-9999",
      email: "contato@teste-vf098.test",
      instagram: "@teste_vf098",
      facebook: "teste-vf098",
      website: "https://teste-vf098.test",
      image_url: "/images/teste-vf098.jpeg",
      google_maps_url: "https://maps.google.com/?q=teste-vf098",
    };

    const { data, error } = await editorClient
      .from("churches")
      .update(patch)
      .eq("id", TEST_CHURCHES.linked.id)
      .select("id, phone, image_url, google_maps_url");

    expect(error).toBeNull();
    expect(data).toEqual([
      {
        id: TEST_CHURCHES.linked.id,
        phone: patch.phone,
        image_url: patch.image_url,
        google_maps_url: patch.google_maps_url,
      },
    ]);
  });

  it("aceita updated_at junto com o contato (a 014 libera essa coluna)", async () => {
    // `updated_at` está na lista de permissão de propósito, porque o cliente
    // pode mandá-la; o trigger `churches_updated_at` a sobrescreve com now().
    const { error } = await editorClient
      .from("churches")
      .update({
        phone: "(82) 3333-7777",
        updated_at: new Date().toISOString(),
      })
      .eq("id", TEST_CHURCHES.linked.id)
      .select("id");

    expect(error).toBeNull();
  });

  it("insere, altera e apaga horário", async () => {
    const { data: inserted, error: insertError } = await editorClient
      .from("schedule_events")
      .insert({
        church_id: TEST_CHURCHES.linked.id,
        category: "confession",
        day_of_week: 3,
        time: "17:00",
        end_time: "18:00",
      })
      .select("id, time")
      .single();

    expect(insertError).toBeNull();
    expect(inserted?.time).toBe("17:00");

    const { data: updated, error: updateError } = await editorClient
      .from("schedule_events")
      .update({ time: "17:30" })
      .eq("id", inserted?.id)
      .select("id, time");

    expect(updateError).toBeNull();
    expect(updated).toEqual([{ id: inserted?.id, time: "17:30" }]);

    const { data: deleted, error: deleteError } = await editorClient
      .from("schedule_events")
      .delete()
      .eq("id", inserted?.id)
      .select("id");

    expect(deleteError).toBeNull();
    expect(deleted).toEqual([{ id: inserted?.id }]);
  });

  it("altera horário que já existia na igreja dele", async () => {
    const { data, error } = await editorClient
      .from("schedule_events")
      .update({ notes: "Alterado pelo editor" })
      .eq("id", TEST_SCHEDULE_EVENTS.linked)
      .select("id, notes");

    expect(error).toBeNull();
    expect(data).toEqual([
      { id: TEST_SCHEDULE_EVENTS.linked, notes: "Alterado pelo editor" },
    ]);
  });

  it("insere atividade e horário de atividade", async () => {
    const { data: activity, error: activityError } = await editorClient
      .from("activities")
      .insert({
        church_id: TEST_CHURCHES.linked.id,
        name: `${TEST_DATA_PREFIX} Catequese`,
      })
      .select("id")
      .single();

    expect(activityError).toBeNull();

    const { data: schedule, error: scheduleError } = await editorClient
      .from("activity_schedules")
      .insert({
        activity_id: activity?.id,
        day_of_week: 2,
        time: "15:00",
        end_time: "16:30",
      })
      .select("id, time");

    expect(scheduleError).toBeNull();
    expect(schedule).toHaveLength(1);
  });

  it("altera horário de atividade que já existia na igreja dele", async () => {
    const { data, error } = await editorClient
      .from("activity_schedules")
      .update({ notes: "Alterado pelo editor" })
      .eq("activity_id", TEST_ACTIVITIES.linked)
      .select("id, notes");

    expect(error).toBeNull();
    expect(data).toHaveLength(1);
  });

  it("apaga atividade e horário de atividade da igreja dele", async () => {
    // Cria o próprio cenário em vez de usar o do seed, para não depender da
    // ordem dos testes deste arquivo.
    const { data: activity, error: activitySetupError } = await editorClient
      .from("activities")
      .insert({
        church_id: TEST_CHURCHES.linked.id,
        name: `${TEST_DATA_PREFIX} Novena a ser apagada`,
      })
      .select("id")
      .single();

    expect(activitySetupError).toBeNull();

    const { data: schedule, error: scheduleSetupError } = await editorClient
      .from("activity_schedules")
      .insert({ activity_id: activity?.id, day_of_week: 5, time: "18:00" })
      .select("id")
      .single();

    expect(scheduleSetupError).toBeNull();

    const { data: deletedSchedule, error: scheduleError } = await editorClient
      .from("activity_schedules")
      .delete()
      .eq("id", schedule?.id)
      .select("id");

    expect(scheduleError).toBeNull();
    expect(deletedSchedule).toEqual([{ id: schedule?.id }]);

    const { data: deletedActivity, error: activityError } = await editorClient
      .from("activities")
      .delete()
      .eq("id", activity?.id)
      .select("id");

    expect(activityError).toBeNull();
    expect(deletedActivity).toEqual([{ id: activity?.id }]);
  });

  it("vincula e desvincula ministério já existente no catálogo (D14)", async () => {
    const { data: link, error: linkError } = await editorClient
      .from("church_ministries")
      .insert({
        church_id: TEST_CHURCHES.linked.id,
        ministry_id: TEST_MINISTRY.id,
      })
      .select("id")
      .single();

    expect(linkError).toBeNull();

    const { data: removed, error: removeError } = await editorClient
      .from("church_ministries")
      .delete()
      .eq("id", link?.id)
      .select("id");

    expect(removeError).toBeNull();
    expect(removed).toEqual([{ id: link?.id }]);
  });
});

describe("o editor não altera a identidade da igreja (migration 014)", () => {
  it.each(IDENTITY_COLUMNS)("recusa a alteração de %s", async (column, value) => {
    const { error } = await editorClient
      .from("churches")
      .update({ [column]: value })
      .eq("id", TEST_CHURCHES.linked.id)
      .select("id");

    expect(error?.code, MISSING_TRIGGER_HINT).toBe("42501");
    expect(error?.message).toContain(ADMIN_ONLY_COLUMNS_MESSAGE);
  });

  it("recusa a alteração mesmo junto com uma coluna permitida", async () => {
    const { error } = await editorClient
      .from("churches")
      .update({ phone: "(82) 3333-0000", district: "Ponta Verde" })
      .eq("id", TEST_CHURCHES.linked.id)
      .select("id");

    expect(error?.code, MISSING_TRIGGER_HINT).toBe("42501");
    expect(error?.message).toContain(ADMIN_ONLY_COLUMNS_MESSAGE);
  });

  it("recusa coluna fora da lista de permissão, mesmo não sendo identidade", async () => {
    // A `014` é lista de permissão, não de bloqueio: `created_at` e qualquer
    // coluna criada por uma migration futura também são só do admin. Sem este
    // caso, trocar o trigger por uma lista de bloqueio das cinco colunas de
    // identidade passaria sem nenhum teste vermelho.
    const { error } = await editorClient
      .from("churches")
      .update({ created_at: "2001-01-01T00:00:00Z" })
      .eq("id", TEST_CHURCHES.linked.id)
      .select("id");

    expect(error?.code, MISSING_TRIGGER_HINT).toBe("42501");
    expect(error?.message).toContain(ADMIN_ONLY_COLUMNS_MESSAGE);
  });

  it("mantém a identidade da igreja intacta depois das tentativas", async () => {
    const service = createServiceRoleTestClient();
    const { data, error } = await service
      .from("churches")
      .select("name, slug, address, district, type")
      .eq("id", TEST_CHURCHES.linked.id)
      .single();

    expect(error).toBeNull();
    expect(data).toEqual({
      name: TEST_CHURCHES.linked.name,
      slug: TEST_CHURCHES.linked.slug,
      address: TEST_CHURCHES.linked.address,
      district: TEST_CHURCHES.linked.district,
      type: TEST_CHURCHES.linked.type,
    });
  });

  it("não cadastra igreja nova", async () => {
    const { error } = await editorClient
      .from("churches")
      .insert({
        name: `${TEST_DATA_PREFIX} Igreja do Editor`,
        slug: "teste-vf098-igreja-do-editor",
        address: "Rua Nova, 1",
        district: "Centro",
      })
      .select("id");

    expect(error?.code).toBe("42501");
  });

  it("não apaga a igreja dele", async () => {
    await expectDeleteBlockedByRls("churches", TEST_CHURCHES.linked.id);
  });
});

describe("o editor não grava clero (D3; base da D15 no banco)", () => {
  it("não cadastra clérigo", async () => {
    const { error } = await editorClient
      .from("clergy")
      .insert({ name: `${TEST_DATA_PREFIX} Padre do Editor`, role: "vicar" })
      .select("id");

    expect(error?.code).toBe("42501");
  });

  it("não altera clérigo", async () => {
    await expectUpdateBlockedByRls("clergy", TEST_CLERGY.id, {
      bio: "alterado pelo editor",
    });
  });

  it("não cria vínculo de clero, nem na igreja dele", async () => {
    const { error } = await editorClient
      .from("church_clergy")
      .insert({
        church_id: TEST_CHURCHES.linked.id,
        clergy_id: TEST_CLERGY.id,
        start_date: "2021",
      })
      .select("id");

    expect(error?.code).toBe("42501");
  });

  it("não altera nem encerra vínculo de clero existente", async () => {
    await expectUpdateBlockedByRls("church_clergy", TEST_CHURCH_CLERGY_ID, {
      is_active: false,
      end_date: "2025",
    });
    await expectDeleteBlockedByRls("church_clergy", TEST_CHURCH_CLERGY_ID);
  });

  it("mantém o vínculo do clero ativo depois das tentativas", async () => {
    const service = createServiceRoleTestClient();
    const { data } = await service
      .from("church_clergy")
      .select("is_active, end_date")
      .eq("id", TEST_CHURCH_CLERGY_ID)
      .single();

    expect(data).toEqual({ is_active: true, end_date: null });
  });
});

describe("o editor não mexe no catálogo de ministérios (D14)", () => {
  it("não cria item no catálogo", async () => {
    const { error } = await editorClient
      .from("ministries")
      .insert({
        label: `${TEST_DATA_PREFIX} Grupo do Editor`,
        category: "group",
      })
      .select("id");

    expect(error?.code).toBe("42501");
  });

  it("não altera item do catálogo", async () => {
    await expectUpdateBlockedByRls("ministries", TEST_MINISTRY.id, {
      label: `${TEST_DATA_PREFIX} Renomeado`,
    });
  });
});

describe("o editor não grava em igreja a que não está vinculado", () => {
  it("não altera o contato da outra igreja", async () => {
    await expectUpdateBlockedByRls("churches", TEST_CHURCHES.unlinked.id, {
      phone: "(82) 0000-0000",
    });
  });

  it("não insere horário na outra igreja", async () => {
    const { error } = await editorClient
      .from("schedule_events")
      .insert({
        church_id: TEST_CHURCHES.unlinked.id,
        category: "mass",
        day_of_week: 1,
        time: "07:00",
      })
      .select("id");

    expect(error?.code).toBe("42501");
  });

  it("não altera nem apaga horário da outra igreja", async () => {
    await expectUpdateBlockedByRls(
      "schedule_events",
      TEST_SCHEDULE_EVENTS.unlinked,
      { time: "06:00" }
    );
    await expectDeleteBlockedByRls(
      "schedule_events",
      TEST_SCHEDULE_EVENTS.unlinked
    );
  });

  it("não insere atividade na outra igreja", async () => {
    const { error } = await editorClient
      .from("activities")
      .insert({
        church_id: TEST_CHURCHES.unlinked.id,
        name: `${TEST_DATA_PREFIX} Atividade Invasora`,
      })
      .select("id");

    expect(error?.code).toBe("42501");
  });

  it("não insere horário na atividade da outra igreja", async () => {
    const { error } = await editorClient
      .from("activity_schedules")
      .insert({
        activity_id: TEST_ACTIVITIES.unlinked,
        day_of_week: 4,
        time: "10:00",
      })
      .select("id");

    expect(error?.code).toBe("42501");
  });

  it("não altera nem apaga horário de atividade da outra igreja", async () => {
    await expectUpdateBlockedByRls(
      "activity_schedules",
      TEST_ACTIVITY_SCHEDULES.unlinked,
      { notes: "invadido" }
    );
    await expectDeleteBlockedByRls(
      "activity_schedules",
      TEST_ACTIVITY_SCHEDULES.unlinked
    );
  });

  it("não vincula ministério à outra igreja", async () => {
    const { error } = await editorClient
      .from("church_ministries")
      .insert({
        church_id: TEST_CHURCHES.unlinked.id,
        ministry_id: TEST_MINISTRY.id,
      })
      .select("id");

    expect(error?.code).toBe("42501");
  });

  it("não se vincula a outra igreja", async () => {
    // O caminho que transformaria toda recusa "da outra igreja" em permissão:
    // `editor_churches` só o admin grava (`editor_churches_insert_admin`).
    const { error } = await editorClient
      .from("editor_churches")
      .insert({
        editor_id: editorId,
        church_id: TEST_CHURCHES.unlinked.id,
      })
      .select("church_id");

    expect(error?.code).toBe("42501");
  });
});

describe("o visitante só lê", () => {
  it("não altera o contato de nenhuma igreja", async () => {
    const { data: read, error: readError } = await anonClient
      .from("churches")
      .select("id")
      .eq("id", TEST_CHURCHES.linked.id);

    expect(readError).toBeNull();
    expect(read).toHaveLength(1);

    const { data, error } = await anonClient
      .from("churches")
      .update({ phone: "(82) 0000-0000" })
      .eq("id", TEST_CHURCHES.linked.id)
      .select("id");

    expect(error).toBeNull();
    expect(data).toEqual([]);
  });
});

describe("o admin continua gravando tudo (o trigger da 014 não o alcança)", () => {
  it("altera a identidade da igreja", async () => {
    const name = `${TEST_DATA_PREFIX} Paróquia Vinculada (admin)`;

    const { data, error } = await adminClient
      .from("churches")
      .update({ name, district: "Pajuçara" })
      .eq("id", TEST_CHURCHES.linked.id)
      .select("id, name, district");

    expect(error).toBeNull();
    expect(data).toEqual([
      { id: TEST_CHURCHES.linked.id, name, district: "Pajuçara" },
    ]);

    // Devolve o cenário ao estado do seed, para não depender da ordem.
    const service = createServiceRoleTestClient();
    await service
      .from("churches")
      .update({
        name: TEST_CHURCHES.linked.name,
        district: TEST_CHURCHES.linked.district,
      })
      .eq("id", TEST_CHURCHES.linked.id);
  });

  it("cadastra clérigo e cria vínculo", async () => {
    const { data: clergy, error: clergyError } = await adminClient
      .from("clergy")
      .insert({
        name: `${TEST_DATA_PREFIX} Diácono do Admin`,
        role: "deacon",
      })
      .select("id")
      .single();

    expect(clergyError).toBeNull();

    const { data: link, error: linkError } = await adminClient
      .from("church_clergy")
      .insert({
        church_id: TEST_CHURCHES.linked.id,
        clergy_id: clergy?.id,
        start_date: "2024",
      })
      .select("id");

    expect(linkError).toBeNull();
    expect(link).toHaveLength(1);
  });

  it("cria item no catálogo de ministérios", async () => {
    const { data, error } = await adminClient
      .from("ministries")
      .insert({
        label: `${TEST_DATA_PREFIX} Movimento do Admin`,
        category: "movement",
      })
      .select("id");

    expect(error).toBeNull();
    expect(data).toHaveLength(1);
  });
});
