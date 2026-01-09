/**
 * Gera um slug a partir de um texto seguindo as regras:
 * - lowercase
 * - sem acentos
 * - espaços substituídos por '-'
 *
 * Exemplo:
 * "São José Operário" → "sao-jose-operario"
 */
export function slugify(text: string): string {
  return text
    .normalize("NFD") // Decompõe caracteres acentuados
    .replace(/[\u0300-\u036f]/g, "") // Remove diacríticos
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-") // Substitui espaços por '-'
    .replace(/[^\w\-]+/g, "") // Remove caracteres especiais
    .replace(/\-\-+/g, "-") // Remove hífens duplicados
    .replace(/^-+/, "") // Remove hífen do início
    .replace(/-+$/, ""); // Remove hífen do final
}
