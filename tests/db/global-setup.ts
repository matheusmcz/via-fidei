/**
 * `globalSetup` do projeto Vitest `db` (VF-098, D10): roda uma vez por
 * `npm run test:db`, antes de qualquer arquivo de teste.
 *
 * Deixa o Supabase local com o cenário mínimo. Os arquivos do projeto `db`
 * rodam em série (`fileParallelism: false`), porque compartilham um banco só.
 */
import { seedTestDatabase } from "./seed";

export default async function setup(): Promise<void> {
  try {
    await seedTestDatabase();
  } catch (error) {
    // O Vitest 5 / Vite não consegue formatar o stack de um erro lançado aqui:
    // quebra em `extractInlineSourceMap` com "code.charCodeAt is not a
    // function" e imprime esse TypeError no lugar da mensagem. Como os erros
    // deste caminho são justamente os que dizem o que fazer (`.env.test`
    // ausente, Supabase local fora do ar, migrations faltando, URL que não é
    // local), escrevê-los em stderr antes de propagar é o que garante que a
    // instrução chegue ao terminal.
    //
    // Só `message`, nunca `stack`: ler `error.stack` chama o
    // `Error.prepareStackTrace` que o Vite substitui, que é onde está o bug —
    // o acesso ao `.stack` lança o TypeError aqui dentro e derruba este
    // `catch` antes do `write`, voltando ao sintoma que ele existe para
    // evitar. `String(error)` cobre o que não for `Error`, em vez de
    // imprimir `undefined`.
    const detail = error instanceof Error ? error.message : String(error);

    process.stderr.write(`\n${detail}\n\n`);
    throw error;
  }
}
