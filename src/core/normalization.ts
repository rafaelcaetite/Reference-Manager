/**
 * Normalizes a bibliographic title for string distance comparison.
 * Standardizes casing, strips diacritics, preserves international alphanumeric characters,
 * and collapses redundant whitespace.
 */
export function normalizeTitle(title: unknown): string {
  if (title === null || title === undefined) {
    return "";
  }

  let strTitle = "";
  if (Array.isArray(title)) {
    strTitle = title.join(" ");
  } else {
    strTitle = String(title);
  }

  // Case-fold and trim
  strTitle = strTitle.toLowerCase().trim();

  // Decompose Unicode and strip combining diacritical marks (e.g. "à" -> "a")
  strTitle = strTitle.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  // Preserve Unicode letters (\p{L}), numbers (\p{N}), and spaces; replace punctuation with space
  strTitle = strTitle.replace(/[^\p{L}\p{N}\s]/gu, " ");

  // Collapse consecutive whitespaces
  return strTitle.split(/\s+/).filter(Boolean).join(" ");
}

/**
 * Extracts and standardizes a four-digit publication year from various string formats.
 * Examples: "2024-05", "15 Jan 2023", "'24" -> "2024"
 */
export function extractCleanYear(rawVal: unknown): string {
  if (rawVal === null || rawVal === undefined) return "N/A";
  const str = String(rawVal).trim();

  // Search for any 4-digit sequence representing common publication years (1800-2099)
  const match = str.match(/\b(1[89]\d{2}|20\d{2})\b/);
  if (match) {
    return match[1];
  }

  // Support 2-digit apostrophe format (e.g., '24 -> 2024)
  const shortMatch = str.match(/'(\d{2})\b/);
  if (shortMatch) {
    const yr = parseInt(shortMatch[1], 10);
    return yr < 50 ? `20${shortMatch[1]}` : `19${shortMatch[1]}`;
  }

  return str || "N/A";
}
