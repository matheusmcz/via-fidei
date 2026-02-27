/**
 * Contact formatting utilities
 */

/**
 * Format a phone number for display (Brazilian format)
 * @example "+5582999999999" → "(82) 99999-9999"
 */
export function formatPhoneForDisplay(phone: string): string {
  // Remove non-digits except +
  const cleaned = phone.replace(/[^\d+]/g, "");

  // Format Brazilian phone: +55 82 99999-9999 or (82) 99999-9999
  if (cleaned.startsWith("+55") && cleaned.length === 14) {
    const ddd = cleaned.slice(3, 5);
    const part1 = cleaned.slice(5, 10);
    const part2 = cleaned.slice(10);
    return `(${ddd}) ${part1}-${part2}`;
  }

  // Format without country code: 82 99999-9999
  if (cleaned.length === 11) {
    const ddd = cleaned.slice(0, 2);
    const part1 = cleaned.slice(2, 7);
    const part2 = cleaned.slice(7);
    return `(${ddd}) ${part1}-${part2}`;
  }

  return phone;
}

/**
 * Format a phone number for use in href (tel: or wa.me)
 * Strips all non-digit characters
 */
export function formatPhoneForHref(phone: string): string {
  return phone.replace(/\D/g, "");
}

/**
 * Extract Instagram handle from URL or @mention
 * @example "https://instagram.com/paroquia" → "@paroquia"
 * @example "@paroquia" → "@paroquia"
 */
export function formatInstagramHandle(instagram: string): string {
  const match = instagram.match(/(?:instagram\.com\/)?@?([a-zA-Z0-9._]+)/);
  return match ? `@${match[1]}` : instagram;
}

/**
 * Get full Instagram URL from handle or URL
 */
export function getInstagramUrl(instagram: string): string {
  const handle = instagram.replace(/^@/, "").replace(/.*instagram\.com\//, "");
  return `https://instagram.com/${handle}`;
}

/**
 * Extract Facebook page name from URL
 * @example "https://facebook.com/paroquia" → "paroquia"
 */
export function formatFacebookName(facebook: string): string {
  const match = facebook.match(/facebook\.com\/([^/?]+)/);
  return match ? match[1] : facebook;
}

/**
 * Get full Facebook URL from page name or URL
 */
export function getFacebookUrl(facebook: string): string {
  if (facebook.startsWith("http")) return facebook;
  return `https://facebook.com/${facebook}`;
}

/**
 * Format website URL for href (ensures https://)
 */
export function getWebsiteUrl(website: string): string {
  if (website.startsWith("http")) return website;
  return `https://${website}`;
}

/**
 * Format website URL for display
 * Removes protocol, only removes trailing slash from root domain
 * @example "https://example.com/" → "example.com"
 * @example "https://example.com/path/" → "example.com/path/"
 */
export function formatWebsiteForDisplay(website: string): string {
  // Remove protocol
  const withoutProtocol = website.replace(/^https?:\/\//, "");

  // Only remove trailing slash if it's the root domain (no path segments)
  if (
    withoutProtocol.endsWith("/") &&
    !withoutProtocol.slice(0, -1).includes("/")
  ) {
    return withoutProtocol.slice(0, -1);
  }

  return withoutProtocol;
}
