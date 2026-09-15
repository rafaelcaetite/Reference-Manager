import { ReferenceRawRow } from "../types";

/**
 * Calculates a metadata richness score for a raw CSV reference row.
 * Non-empty fields contribute points, with higher weights given to abstract and keywords.
 */
export function calculateCompleteness(row: ReferenceRawRow): number {
  if (!row || typeof row !== "object") return 0;

  let score = 0;
  for (const key in row) {
    if (Object.prototype.hasOwnProperty.call(row, key)) {
      if (key.startsWith("__")) continue; // Ignore internal metadata like __sourceFile

      const val = row[key];
      if (val !== null && val !== undefined && String(val).trim().length > 0) {
        score += 1;

        const lowerKey = key.toLowerCase();
        if (lowerKey.includes("abstract") || lowerKey.includes("resumo")) {
          score += 10;
        }
        if (lowerKey.includes("keyword") || lowerKey.includes("palavra")) {
          score += 5;
        }
      }
    }
  }

  return score;
}
