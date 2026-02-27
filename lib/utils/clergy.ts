import type { Clergy, ClergyRole, ClergyTitle } from "@/types";

/**
 * Role hierarchy order (lower index = higher rank)
 */
const ROLE_HIERARCHY: ClergyRole[] = [
  "parish-priest",
  "administrator",
  "vicar",
  "deacon",
];

/**
 * Portuguese labels for clergy roles
 */
const ROLE_LABELS: Record<ClergyRole, string> = {
  "parish-priest": "Pároco",
  administrator: "Administrador Paroquial",
  vicar: "Vigário",
  deacon: "Diácono",
};

/**
 * Portuguese abbreviations for clergy titles
 */
const TITLE_ABBREVIATIONS: Record<ClergyTitle, string> = {
  padre: "Pe.",
  monsenhor: "Mons.",
  frei: "Fr.",
  dom: "Dom",
};

/**
 * Get the Portuguese label for a clergy role
 * @param role - The clergy role
 * @returns The Portuguese label for the role
 */
export function getRoleLabel(role: ClergyRole): string {
  return ROLE_LABELS[role] || role;
}

/**
 * Get the title prefix for a clergy member
 * @param title - The clergy title
 * @returns The abbreviated title prefix (e.g., "Pe.", "Mons.")
 */
export function getClergyTitle(title?: ClergyTitle): string {
  if (!title) return "";
  return TITLE_ABBREVIATIONS[title] || "";
}

/**
 * Format a clergy member's full name with title and suffix
 * @param clergy - The clergy member
 * @returns The formatted name (e.g., "Pe. José da Silva, OFM")
 */
export function formatClergyName(clergy: Clergy): string {
  const parts: string[] = [];

  // Add title prefix
  const titlePrefix = getClergyTitle(clergy.title);
  if (titlePrefix) {
    parts.push(titlePrefix);
  }

  // Add name
  parts.push(clergy.name);

  // Join title/name with space
  let formattedName = parts.join(" ");

  // Add suffix after comma
  if (clergy.suffix) {
    formattedName += `, ${clergy.suffix}`;
  }

  return formattedName;
}

/**
 * Sort clergy members by hierarchical role
 * @param clergy - Array of clergy members
 * @returns Sorted array with higher ranks first
 */
export function sortClergyByRole(clergy: Clergy[]): Clergy[] {
  return [...clergy].sort((a, b) => {
    const indexA = ROLE_HIERARCHY.indexOf(a.role);
    const indexB = ROLE_HIERARCHY.indexOf(b.role);

    // If role not found, put at the end
    const orderA = indexA === -1 ? ROLE_HIERARCHY.length : indexA;
    const orderB = indexB === -1 ? ROLE_HIERARCHY.length : indexB;

    return orderA - orderB;
  });
}

/**
 * Check if a clergy member is currently active (no endDate)
 * @param clergy - The clergy member
 * @returns True if clergy is active
 */
export function isActiveClergyMember(clergy: Clergy): boolean {
  return !clergy.endDate;
}

/**
 * Filter only active clergy members (no endDate)
 * @param clergy - Array of clergy members
 * @returns Array of active clergy members
 */
export function getActiveClergyMembers(clergy: Clergy[]): Clergy[] {
  return clergy.filter(isActiveClergyMember);
}

/**
 * Filter only past clergy members (with endDate)
 * @param clergy - Array of clergy members
 * @returns Array of past clergy members
 */
export function getPastClergyMembers(clergy: Clergy[]): Clergy[] {
  return clergy.filter((c) => !!c.endDate);
}

/**
 * Format tenure period for a clergy member
 * @param clergy - The clergy member
 * @returns Formatted tenure (e.g., "2011 - 2020" or "2021 - Atual")
 */
export function formatClergyTenure(clergy: Clergy): string | null {
  if (!clergy.startDate) return null;

  const startYear = clergy.startDate.slice(0, 4);
  const endYear = clergy.endDate ? clergy.endDate.slice(0, 4) : "Atual";

  return `${startYear} - ${endYear}`;
}

/**
 * Sort clergy members by start date (most recent first)
 * @param clergy - Array of clergy members
 * @returns Sorted array by start date descending
 */
export function sortClergyByStartDate(clergy: Clergy[]): Clergy[] {
  return [...clergy].sort((a, b) => {
    const dateA = a.startDate || "0000";
    const dateB = b.startDate || "0000";
    return dateB.localeCompare(dateA);
  });
}
