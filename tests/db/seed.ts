/**
 * Seed mínimo de teste para o Supabase **local** (VF-098, D10).
 *
 * Separado do `npm run seed`, que usa `data/*.ts` e aponta para o projeto de
 * produção. Aqui entra só o necessário para verificar permissões:
 *
 * - duas igrejas: uma vinculada ao editor e uma não vinculada, para separar
 *   "não pode nesta coluna" de "não pode nesta igreja";
 * - um clérigo com vínculo, porque clero é só do admin (D3, D14);
 * - um item do catálogo de ministérios **sem** vínculo, para o editor vincular
 *   (D14: o catálogo é do admin, o vínculo é do editor);
 * - um horário e uma atividade com horário em cada igreja, para os testes de
 *   update e delete;
 * - um admin e um editor vinculado no Auth, com perfil ativo.
 *
 * Idempotente: apaga tudo o que tem o prefixo `Teste VF-098` e os usuários do
 * domínio de teste antes de inserir, então pode rodar quantas vezes quiser e
 * limpa também as linhas que os próprios testes criaram.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { createServiceRoleTestClient } from "./client";
import type { TestUserCredentials } from "./client";

/** Prefixo dos nomes criados pelos testes, usado para limpar o cenário. */
export const TEST_DATA_PREFIX = "Teste VF-098";

/** Domínio dos e-mails de teste, usado para limpar os usuários do Auth. */
const TEST_EMAIL_DOMAIN = "@viafidei.test";

/** Igreja do cenário de teste. */
export interface TestChurchFixture {
  id: string;
  name: string;
  slug: string;
  address: string;
  district: string;
  type: string;
  phone: string;
}

/**
 * IDs fixos, para os testes referenciarem as linhas sem consultar antes.
 * Versão 4 na forma, mas gerados à mão: `f1de` marca a origem (Via Fidei).
 */
export const TEST_CHURCHES: {
  linked: TestChurchFixture;
  unlinked: TestChurchFixture;
} = {
  linked: {
    id: "f1de0001-0000-4000-8000-000000000001",
    name: `${TEST_DATA_PREFIX} Paróquia Vinculada`,
    slug: "teste-vf098-paroquia-vinculada",
    address: "Rua do Teste, 1",
    district: "Centro",
    type: "parish",
    phone: "(82) 3333-0001",
  },
  unlinked: {
    id: "f1de0002-0000-4000-8000-000000000002",
    name: `${TEST_DATA_PREFIX} Paróquia Não Vinculada`,
    slug: "teste-vf098-paroquia-nao-vinculada",
    address: "Rua do Teste, 2",
    district: "Farol",
    type: "parish",
    phone: "(82) 3333-0002",
  },
};

/** Clérigo vinculado à igreja do editor (cadastro e vínculo são do admin). */
export const TEST_CLERGY = {
  id: "f1de0003-0000-4000-8000-000000000003",
  name: `${TEST_DATA_PREFIX} Padre Vinculado`,
  role: "parish-priest",
  title: "padre",
} as const;

/** Vínculo clérigo-igreja já existente, para os testes de update e delete. */
export const TEST_CHURCH_CLERGY_ID = "f1de0004-0000-4000-8000-000000000004";

/** Item do catálogo de ministérios, propositalmente **sem** vínculo (D14). */
export const TEST_MINISTRY = {
  id: "f1de0005-0000-4000-8000-000000000005",
  label: `${TEST_DATA_PREFIX} Pastoral da Escuta`,
  category: "pastoral",
} as const;

/** Horários e atividades já existentes em cada igreja. */
export const TEST_SCHEDULE_EVENTS = {
  linked: "f1de0006-0000-4000-8000-000000000006",
  unlinked: "f1de0007-0000-4000-8000-000000000007",
} as const;

export const TEST_ACTIVITIES = {
  linked: "f1de0008-0000-4000-8000-000000000008",
  unlinked: "f1de0009-0000-4000-8000-000000000009",
} as const;

export const TEST_ACTIVITY_SCHEDULES = {
  linked: "f1de000a-0000-4000-8000-00000000000a",
  unlinked: "f1de000b-0000-4000-8000-00000000000b",
} as const;

/** Usuários do Auth criados pelo seed. */
export const TEST_USERS: {
  admin: TestUserCredentials & { name: string };
  editor: TestUserCredentials & { name: string };
} = {
  admin: {
    email: `admin.vf098${TEST_EMAIL_DOMAIN}`,
    password: "senha-de-teste-vf098",
    name: `${TEST_DATA_PREFIX} Admin`,
  },
  editor: {
    email: `editor.vf098${TEST_EMAIL_DOMAIN}`,
    password: "senha-de-teste-vf098",
    name: `${TEST_DATA_PREFIX} Editor`,
  },
};

/** Papel em `profiles` de cada usuário de teste, do jeito que o seed deixa. */
const TEST_PROFILE_ROLES = { admin: "admin", editor: "editor" } as const;

/** Lança com contexto quando uma etapa do seed falha. */
function assertNoError(step: string, error: { message: string } | null): void {
  if (error) {
    throw new Error(`Seed de teste falhou em "${step}": ${error.message}`);
  }
}

/**
 * Confere que o Supabase local está no ar e com as migrations aplicadas.
 * A mensagem diz o que fazer, porque é o erro mais provável na primeira vez.
 *
 * Cobre as **funções** das migrations `016` e `018`, que o PostgREST expõe como
 * RPC. Os triggers das `010` e `014`, que estes testes exercem, não são
 * chamáveis por RPC e não dão para verificar aqui; por isso as asserções que
 * dependem deles carregam a instrução de rodar `supabase db reset` na mensagem
 * do próprio `expect`.
 */
export async function assertLocalDatabaseReady(
  client: SupabaseClient
): Promise<void> {
  const { error: tableError } = await client
    .from("churches")
    .select("id")
    .limit(1);

  if (tableError) {
    throw new Error(
      `Não foi possível ler a tabela \`churches\` no Supabase local: ${tableError.message}. ` +
        "Suba o stack com `npx supabase start` e aplique as migrations com `npx supabase db reset`."
    );
  }

  // Funções criadas pelas migrations mais recentes: se faltarem, o banco está
  // no ar mas desatualizado, e os testes falhariam por motivo errado.
  const missing: string[] = [];

  if ((await client.rpc("is_valid_schedule_time", { value: "09:00" })).error) {
    missing.push("is_valid_schedule_time() (migration 016)");
  }
  if ((await client.rpc("clergy_today_in_maceio")).error) {
    missing.push("clergy_today_in_maceio() (migration 018)");
  }

  if (missing.length > 0) {
    throw new Error(
      `O Supabase local está no ar, mas sem as migrations completas: faltam ${missing.join(", ")}. ` +
        "Rode `npx supabase db reset` para aplicar as 19 migrations do zero."
    );
  }
}

/** Apaga o cenário de teste. As igrejas levam em cascata horários e vínculos. */
async function clearTestData(client: SupabaseClient): Promise<void> {
  const prefixPattern = `${TEST_DATA_PREFIX}%`;

  assertNoError(
    "apagar igrejas de teste",
    (await client.from("churches").delete().like("name", prefixPattern)).error
  );
  assertNoError(
    "apagar clero de teste",
    (await client.from("clergy").delete().like("name", prefixPattern)).error
  );
  assertNoError(
    "apagar ministérios de teste",
    (await client.from("ministries").delete().like("label", prefixPattern)).error
  );

  // Apagar o usuário do Auth leva em cascata o perfil e os vínculos de editor.
  // Pagina até o fim: parar na primeira página deixaria um usuário de teste
  // para trás e `createTestUsers` falharia depois com "email already exists",
  // sem apontar a causa.
  //
  // Coleta tudo antes de apagar: apagar durante a paginação encurta a lista e
  // desloca o offset da página seguinte, que passaria a pular um usuário por
  // cada deleção já feita.
  const perPage = 200;
  const toDelete: { id: string; email: string }[] = [];

  for (let page = 1; ; page += 1) {
    const { data, error } = await client.auth.admin.listUsers({ page, perPage });
    assertNoError("listar usuários do Auth", error);

    const users = data?.users ?? [];

    for (const user of users) {
      if (user.email?.endsWith(TEST_EMAIL_DOMAIN)) {
        toDelete.push({ id: user.id, email: user.email });
      }
    }

    if (users.length < perPage) break;
  }

  for (const user of toDelete) {
    const { error } = await client.auth.admin.deleteUser(user.id);
    assertNoError(`apagar usuário ${user.email}`, error);
  }
}

/** Insere igrejas, clero, ministério, horários e atividades. */
async function insertChurchData(client: SupabaseClient): Promise<void> {
  assertNoError(
    "inserir igrejas",
    (await client.from("churches").insert(Object.values(TEST_CHURCHES))).error
  );

  assertNoError(
    "inserir clérigo",
    (await client.from("clergy").insert(TEST_CLERGY)).error
  );

  assertNoError(
    "inserir vínculo do clérigo",
    (
      await client.from("church_clergy").insert({
        id: TEST_CHURCH_CLERGY_ID,
        church_id: TEST_CHURCHES.linked.id,
        clergy_id: TEST_CLERGY.id,
        start_date: "2020",
        is_active: true,
      })
    ).error
  );

  assertNoError(
    "inserir ministério no catálogo",
    (await client.from("ministries").insert(TEST_MINISTRY)).error
  );

  assertNoError(
    "inserir horários",
    (
      await client.from("schedule_events").insert([
        {
          id: TEST_SCHEDULE_EVENTS.linked,
          church_id: TEST_CHURCHES.linked.id,
          category: "mass",
          day_of_week: 0,
          time: "08:00",
        },
        {
          id: TEST_SCHEDULE_EVENTS.unlinked,
          church_id: TEST_CHURCHES.unlinked.id,
          category: "mass",
          day_of_week: 0,
          time: "09:00",
        },
      ])
    ).error
  );

  assertNoError(
    "inserir atividades",
    (
      await client.from("activities").insert([
        {
          id: TEST_ACTIVITIES.linked,
          church_id: TEST_CHURCHES.linked.id,
          name: `${TEST_DATA_PREFIX} Terço dos Homens`,
        },
        {
          id: TEST_ACTIVITIES.unlinked,
          church_id: TEST_CHURCHES.unlinked.id,
          name: `${TEST_DATA_PREFIX} Novena`,
        },
      ])
    ).error
  );

  assertNoError(
    "inserir horários das atividades",
    (
      await client.from("activity_schedules").insert([
        {
          id: TEST_ACTIVITY_SCHEDULES.linked,
          activity_id: TEST_ACTIVITIES.linked,
          day_of_week: 6,
          time: "19:00",
          end_time: "20:00",
        },
        {
          id: TEST_ACTIVITY_SCHEDULES.unlinked,
          activity_id: TEST_ACTIVITIES.unlinked,
          day_of_week: 6,
          time: "19:00",
          end_time: "20:00",
        },
      ])
    ).error
  );
}

/**
 * Cria admin e editor no Auth e ajusta o perfil.
 *
 * O perfil nasce `editor` e **inativo** pelo trigger `handle_new_user()` da
 * `015`; quem ativa é o admin (ou este seed, via service role, que não passa
 * pelo trigger da `010` porque `current_user` não é `authenticated`).
 */
async function createTestUsers(client: SupabaseClient): Promise<void> {
  for (const [key, user] of Object.entries(TEST_USERS)) {
    const { data, error } = await client.auth.admin.createUser({
      email: user.email,
      password: user.password,
      email_confirm: true,
      user_metadata: { name: user.name },
    });
    assertNoError(`criar usuário ${user.email}`, error);

    const userId = data?.user?.id;
    if (!userId) {
      throw new Error(`Seed de teste: Auth não devolveu o id de ${user.email}`);
    }

    assertNoError(
      `ativar o perfil de ${user.email}`,
      (
        await client
          .from("profiles")
          .update({
            role: TEST_PROFILE_ROLES[key as keyof typeof TEST_PROFILE_ROLES],
            is_active: true,
          })
          .eq("id", userId)
      ).error
    );

    if (key === "editor") {
      assertNoError(
        "vincular o editor à igreja",
        (
          await client.from("editor_churches").insert({
            editor_id: userId,
            church_id: TEST_CHURCHES.linked.id,
          })
        ).error
      );
    }
  }
}

/**
 * Devolve admin e editor ao papel e ao status que o seed cria. Rede de
 * segurança para o teste em que o admin promove o editor.
 */
export async function restoreTestProfiles(): Promise<void> {
  const client = createServiceRoleTestClient();

  for (const [key, user] of Object.entries(TEST_USERS)) {
    assertNoError(
      `restaurar o perfil de ${user.email}`,
      (
        await client
          .from("profiles")
          .update({
            role: TEST_PROFILE_ROLES[key as keyof typeof TEST_PROFILE_ROLES],
            is_active: true,
          })
          .eq("email", user.email)
      ).error
    );
  }
}

/** Limpa e recria o cenário de teste no Supabase local. */
export async function seedTestDatabase(): Promise<void> {
  const client = createServiceRoleTestClient();

  await assertLocalDatabaseReady(client);
  await clearTestData(client);
  await insertChurchData(client);
  await createTestUsers(client);
}
