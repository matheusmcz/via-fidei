import { z } from "zod";

/**
 * Validação da entrada das Server Actions de gestão de editores.
 * Funções puras: recebem valores desconhecidos (vindos do FormData ou de
 * argumentos da action, que o cliente controla) e devolvem os dados
 * normalizados ou a primeira mensagem de erro, pronta para a tela.
 */

export const EDITOR_NAME_MAX_LENGTH = 120;
/** Mínimo padrão do Supabase Auth, o mesmo pedido no formulário. */
export const PASSWORD_MIN_LENGTH = 6;
/** O Supabase Auth (bcrypt) recusa senhas acima de 72 caracteres. */
export const PASSWORD_MAX_LENGTH = 72;
/** Limite técnico do tamanho da lista, bem acima do número de igrejas. */
export const MAX_CHURCHES_PER_EDITOR = 500;
const EMAIL_MAX_LENGTH = 254;

export interface CreateEditorInput {
  name: string;
  email: string;
  password: string;
  churchIds: string[];
}

export interface EditorChurchesInput {
  editorId: string;
  churchIds: string[];
}

export type ValidationResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

const NAME_REQUIRED = "Informe o nome do editor";
const EMAIL_INVALID = "Informe um email válido";
const PASSWORD_TOO_SHORT = `A senha deve ter pelo menos ${PASSWORD_MIN_LENGTH} caracteres`;
const CHURCH_INVALID = "Igreja inválida";
const EDITOR_INVALID = "Editor inválido";

// `guid` aceita o formato 8-4-4-4-12 do tipo `uuid` do Postgres, sem exigir
// os bits de versão do RFC (IDs criados à mão continuam válidos). Em
// minúsculas, como o Postgres devolve, para comparar com os IDs do banco.
function uuidSchema(error: string) {
  return z.guid({ error }).transform((id) => id.toLowerCase());
}

const editorIdSchema = uuidSchema(EDITOR_INVALID);

const churchIdsSchema = z
  .array(uuidSchema(CHURCH_INVALID), { error: CHURCH_INVALID })
  .max(MAX_CHURCHES_PER_EDITOR, {
    error: `Selecione no máximo ${MAX_CHURCHES_PER_EDITOR} igrejas`,
  })
  .transform((ids) => [...new Set(ids)]);

const createEditorSchema = z.object({
  name: z
    .string({ error: NAME_REQUIRED })
    .trim()
    .min(1, { error: NAME_REQUIRED })
    .max(EDITOR_NAME_MAX_LENGTH, {
      error: `O nome deve ter no máximo ${EDITOR_NAME_MAX_LENGTH} caracteres`,
    }),
  email: z
    .string({ error: EMAIL_INVALID })
    .trim()
    .toLowerCase()
    .max(EMAIL_MAX_LENGTH, { error: EMAIL_INVALID })
    .pipe(z.email({ error: EMAIL_INVALID })),
  // Senha sem trim: espaços fazem parte dela.
  password: z
    .string({ error: PASSWORD_TOO_SHORT })
    .min(PASSWORD_MIN_LENGTH, { error: PASSWORD_TOO_SHORT })
    .max(PASSWORD_MAX_LENGTH, {
      error: `A senha deve ter no máximo ${PASSWORD_MAX_LENGTH} caracteres`,
    }),
  churchIds: churchIdsSchema,
});

const editorChurchesSchema = z.object({
  editorId: editorIdSchema,
  churchIds: churchIdsSchema,
});

function toResult<T>(
  parsed: { success: true; data: T } | { success: false; error: z.ZodError },
): ValidationResult<T> {
  if (parsed.success) return { success: true, data: parsed.data };
  return { success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
}

export function parseCreateEditorInput(
  raw: unknown,
): ValidationResult<CreateEditorInput> {
  return toResult(createEditorSchema.safeParse(raw));
}

export function parseEditorId(raw: unknown): ValidationResult<string> {
  return toResult(editorIdSchema.safeParse(raw));
}

export function parseEditorChurchesInput(
  raw: unknown,
): ValidationResult<EditorChurchesInput> {
  return toResult(editorChurchesSchema.safeParse(raw));
}
