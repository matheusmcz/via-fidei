/** O mínimo de um resultado do Supabase para saber se a consulta falhou. */
interface QueryOutcome {
  error: Error | null;
}

/**
 * Primeiro erro entre resultados de consultas feitas em paralelo, ou `null`
 * se todas deram certo.
 *
 * Consulta que falha deve lançar o erro, nunca virar lista vazia: com ISR,
 * uma falha na revalidação mantém a versão anterior em cache em vez de
 * publicar a página sem horários, clero ou ministérios.
 */
export function findQueryError(
  results: readonly QueryOutcome[]
): Error | null {
  return results.find((result) => result.error !== null)?.error ?? null;
}
