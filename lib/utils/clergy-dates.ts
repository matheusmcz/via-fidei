import type {
  ClergyDateField,
  ClergyDateIssue,
  ClergyDateIssueReason,
} from "@/types";
import { isFullClergyDate, isValidClergyDate } from "./clergy";

/**
 * Regras de ordem e de "não futura" das datas do clero (VF-105, D16/D17).
 *
 * As datas são texto em `YYYY` ou `YYYY-MM-DD` (`isValidClergyDate()`, VF-088).
 * Para comparar precisões diferentes, vale a **menor precisão comum**: se um dos
 * lados tem só o ano, compara-se só o ano. Assim, início `2020` e fim
 * `2020-05-01` são válidos; início `2021` e fim `2020-12-31` não; o mesmo ano
 * dos dois lados é sempre válido. A ordem aceita igualdade (`fim ≥ início`).
 *
 * Correspondência com o banco (migration 018, mesmos casos de borda testados):
 *   isClergyDateOrderValid() ↔ public.is_clergy_date_order_valid(text, text)
 *   isClergyDateNotFuture()  ↔ public.is_clergy_date_not_future(text, text)
 *   getTodayInMaceio()       ↔ public.clergy_today_in_maceio()
 */

/** Fuso usado para saber qual é o dia de hoje (D17). */
export const CLERGY_TIME_ZONE = "America/Maceio";

/** Mensagens para os formulários de edição (VF-021), por motivo. */
export const CLERGY_DATE_MESSAGES: Record<ClergyDateIssueReason, string> = {
  format: "Informe só o ano (AAAA) ou a data completa (AAAA-MM-DD).",
  future: "A data não pode estar no futuro.",
  "death-before-birth": "O falecimento não pode ser antes do nascimento.",
  "end-before-start": "O fim do vínculo não pode ser antes do início.",
};

function assertValidClergyDate(value: string): void {
  if (!isValidClergyDate(value)) {
    throw new Error(`Data do clero fora do formato: ${JSON.stringify(value)}`);
  }
}

/**
 * Compara duas datas do clero na menor precisão comum: -1 se `a` vem antes,
 * 0 se empatam (inclusive mesmo ano com precisões diferentes), 1 se vem depois.
 * Lança erro se alguma estiver fora do formato.
 */
export function compareClergyDates(a: string, b: string): -1 | 0 | 1 {
  assertValidClergyDate(a);
  assertValidClergyDate(b);

  const yearOnly = !isFullClergyDate(a) || !isFullClergyDate(b);
  const left = yearOnly ? a.slice(0, 4) : a;
  const right = yearOnly ? b.slice(0, 4) : b;

  // Mesmo comprimento e só dígitos e hífen nas mesmas posições: a ordem do
  // texto é a ordem das datas.
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

/**
 * True quando `later` não vem antes de `earlier` (fim ≥ início, falecimento ≥
 * nascimento). Não opina (devolve true) quando falta um dos lados ou um deles
 * está fora do formato: o formato tem regra própria (`isValidClergyDate()`).
 */
export function isClergyDateOrderValid(
  earlier?: string | null,
  later?: string | null,
): boolean {
  if (earlier == null || later == null) return true;
  if (!isValidClergyDate(earlier) || !isValidClergyDate(later)) return true;
  return compareClergyDates(earlier, later) <= 0;
}

/**
 * True quando a data não passa de hoje. Um ano sozinho vale até o fim do ano
 * atual. `today` é o dia de hoje em `YYYY-MM-DD` no fuso de Maceió (ver
 * `getTodayInMaceio()`), recebido por parâmetro para ser testável.
 * Não opina (devolve true) com valor ausente ou fora do formato.
 */
export function isClergyDateNotFuture(
  value: string | null | undefined,
  today: string,
): boolean {
  if (!isFullClergyDate(today)) {
    throw new Error(`"today" precisa ser YYYY-MM-DD: ${JSON.stringify(today)}`);
  }
  if (value == null || !isValidClergyDate(value)) return true;
  return compareClergyDates(value, today) <= 0;
}

/**
 * Dia de `now` no fuso de Maceió, em `YYYY-MM-DD`.
 * Maceió não tem horário de verão: hoje é sempre UTC-3.
 */
export function getTodayInMaceio(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: CLERGY_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const part = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((p) => p.type === type)?.value ?? "";

  return `${part("year").padStart(4, "0")}-${part("month")}-${part("day")}`;
}

/** Problema de formato ou de data futura em um campo, se houver. */
function checkSingleDate(
  field: ClergyDateField,
  value: string | null | undefined,
  today: string,
): ClergyDateIssue | null {
  if (value == null) return null;
  if (!isValidClergyDate(value)) return { field, reason: "format" };
  if (!isClergyDateNotFuture(value, today)) return { field, reason: "future" };
  return null;
}

/**
 * Valida um par de datas (cada uma: formato e não futura; o par: ordem).
 * O erro de ordem fica no campo da data posterior e só aparece quando os dois
 * lados estão no formato. Ausente (`null`/`undefined`) não é erro; texto vazio
 * é erro de formato, como no banco: o formulário deve gravar `null`.
 */
function validateDatePair(
  earlier: { field: ClergyDateField; value?: string | null },
  later: { field: ClergyDateField; value?: string | null },
  orderReason: ClergyDateIssueReason,
  today: string,
): ClergyDateIssue[] {
  const issues = [
    checkSingleDate(earlier.field, earlier.value, today),
    checkSingleDate(later.field, later.value, today),
  ].filter((issue): issue is ClergyDateIssue => issue !== null);

  if (!isClergyDateOrderValid(earlier.value, later.value)) {
    issues.push({ field: later.field, reason: orderReason });
  }
  return issues;
}

/** Nascimento e falecimento do clérigo (`clergy.birth_date`, `death_date`). */
export function validateClergyVitalDates(
  dates: { birthDate?: string | null; deathDate?: string | null },
  today: string,
): ClergyDateIssue[] {
  return validateDatePair(
    { field: "birthDate", value: dates.birthDate },
    { field: "deathDate", value: dates.deathDate },
    "death-before-birth",
    today,
  );
}

/** Início e fim do vínculo clérigo-igreja (`church_clergy.start_date`, `end_date`). */
export function validateClergyTenureDates(
  dates: { startDate?: string | null; endDate?: string | null },
  today: string,
): ClergyDateIssue[] {
  return validateDatePair(
    { field: "startDate", value: dates.startDate },
    { field: "endDate", value: dates.endDate },
    "end-before-start",
    today,
  );
}
