/**
 * Configuração do Supabase **local** para o projeto Vitest `db` (VF-098, D10).
 *
 * Lê o `.env.test` direto do disco, com `dotenv.parse`, em vez de usar
 * `process.env`. São dois motivos:
 *
 * 1. `tests/setup/env.ts` apaga as variáveis do Supabase antes de todo teste do
 *    Vitest. Ler o arquivo mantém esse apagamento em vigor: nenhum teste do
 *    projeto `db` consegue alcançar o Supabase de produção por engano, nem
 *    mesmo via `lib/supabase/*`, que depende de `process.env`.
 * 2. Uma variável de ambiente deixada na sessão (ex.: `.env.local` exportado)
 *    não tem como sobrescrever a URL local sem querer.
 *
 * Fecha o cerco a guarda `assertLocalSupabaseUrl`: só 127.0.0.1, localhost ou
 * ::1 passam. Qualquer outro host é recusado antes da primeira gravação.
 *
 * O `.env.test` **não** é versionado: cada máquina gera o seu com
 * `npm run test:db:env`. Isso faz de `assertLocalSupabaseUrl` a única barreira
 * contra um arquivo mal gerado apontar para produção — por isso ela valida o
 * host antes de qualquer cliente existir, e não só antes da primeira gravação.
 */
import { parse } from "dotenv";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const ENV_TEST_PATH = fileURLToPath(new URL("../../.env.test", import.meta.url));

/** Hosts aceitos. `new URL("http://[::1]:54321").hostname` devolve `[::1]`. */
const LOCAL_HOSTNAMES = new Set(["127.0.0.1", "localhost", "::1", "[::1]"]);

/** Credenciais do Supabase local lidas do `.env.test`. */
export interface DbTestEnv {
  /** URL da API do Supabase local (`http://127.0.0.1:54321`). */
  supabaseUrl: string;
  /** Chave pública (publishable) — papel `anon`, sujeito ao RLS. */
  publishableKey: string;
  /** Chave secreta (service_role) — ignora o RLS; só no seed e na limpeza. */
  serviceRoleKey: string;
}

/**
 * Recusa qualquer URL que não seja do Supabase local. Chamada antes de montar
 * qualquer cliente, para que um `.env.test` errado nunca grave em produção.
 */
export function assertLocalSupabaseUrl(url: string): void {
  let hostname: string;
  try {
    hostname = new URL(url).hostname;
  } catch {
    throw new Error(
      `NEXT_PUBLIC_SUPABASE_URL do .env.test não é uma URL válida: ${url}`
    );
  }

  if (!LOCAL_HOSTNAMES.has(hostname)) {
    throw new Error(
      `Os testes do projeto \`db\` só rodam no Supabase local: ${url} aponta para "${hostname}". ` +
        "Corrija o `.env.test` para http://127.0.0.1:54321 (D10: nenhum teste grava no projeto de produção)."
    );
  }
}

let cached: DbTestEnv | undefined;

/** Lê e valida o `.env.test`. Memoizada: o arquivo é lido uma vez por processo. */
export function getDbTestEnv(): DbTestEnv {
  if (cached) return cached;

  let contents: string;
  try {
    contents = readFileSync(ENV_TEST_PATH, "utf8");
  } catch {
    throw new Error(
      [
        `.env.test não encontrado em ${ENV_TEST_PATH}.`,
        "",
        "Ele não é versionado (as chaves ficam fora do Git): gere o seu, com o Supabase local no ar.",
        "",
        "  npx supabase start      # precisa do Docker aberto",
        "  npm run test:db:env     # escreve o .env.test a partir de `supabase status -o env`",
        "  npm run test:db",
        "",
        "Ver 'Testes contra o Supabase local' no .claude/docs/ARCHITECTURE.md.",
      ].join("\n")
    );
  }

  const parsed = parse(contents);
  const supabaseUrl = parsed.NEXT_PUBLIC_SUPABASE_URL?.trim();
  // Aceita as duas formas de chave pública que o stack local imprime, na mesma
  // ordem de preferência de `lib/supabase/env.ts`: a nova (`sb_publishable_…`)
  // e a JWT legada (`anon`), que é a usada hoje (ver o comentário no .env.test).
  const publishableKey =
    parsed.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    parsed.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  const serviceRoleKey = parsed.SUPABASE_SERVICE_ROLE_KEY?.trim();

  const missing = [
    !supabaseUrl && "NEXT_PUBLIC_SUPABASE_URL",
    !publishableKey &&
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ou NEXT_PUBLIC_SUPABASE_ANON_KEY",
    !serviceRoleKey && "SUPABASE_SERVICE_ROLE_KEY",
  ].filter((name): name is string => Boolean(name));

  if (!supabaseUrl || !publishableKey || !serviceRoleKey) {
    throw new Error(
      `Faltam variáveis no .env.test: ${missing.join(", ")}. ` +
        "Gere o arquivo de novo com `npm run test:db:env` (precisa do Supabase local no ar: `npx supabase start`)."
    );
  }

  assertLocalSupabaseUrl(supabaseUrl);

  cached = { supabaseUrl, publishableKey, serviceRoleKey };
  return cached;
}
