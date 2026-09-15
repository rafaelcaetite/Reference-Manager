/**
 * Calculates whether two string lengths can mathematically reach the specified similarity threshold.
 * The theoretical maximum ratio of two strings of lengths lenA and lenB is: (2 * min) / (lenA + lenB).
 */
export function canMeetThreshold(lenA: number, lenB: number, threshold: number): boolean {
  if (lenA === 0 || lenB === 0) return false;
  const maxPossible = (2.0 * Math.min(lenA, lenB)) / (lenA + lenB);
  return maxPossible >= threshold;
}

/**
 * Computes the Ratcliff-Obershelp (Gestalt Pattern Matching) similarity ratio
 * between two strings, matching Python's difflib.SequenceMatcher.ratio().
 *
 * Uses an inverted index over string B to track matching substrings in O(L) average time
 * rather than naive O(L^3) brute-force scanning.
 */
export function gestaltSimilarity(a: string, b: string): number {
  if (a === b) return 1.0;
  if (!a || !b) return 0.0;

  const lenA = a.length;
  const lenB = b.length;

  // Build character occurrence index for B (equivalent to Python difflib b2j)
  const bIndices = new Map<string, number[]>();
  for (let j = 0; j < lenB; j++) {
    const ch = b[j];
    const list = bIndices.get(ch);
    if (list) {
      list.push(j);
    } else {
      bIndices.set(ch, [j]);
    }
  }

  function findLongestMatch(
    alo: number,
    ahi: number,
    blo: number,
    bhi: number
  ): { a: number; b: number; size: number } {
    let bestA = alo;
    let bestB = blo;
    let bestSize = 0;

    // Track match lengths ending at index j of B
    let j2len = new Map<number, number>();

    for (let i = alo; i < ahi; i++) {
      const ch = a[i];
      const occurrences = bIndices.get(ch);
      const newJ2len = new Map<number, number>();

      if (occurrences) {
        for (const j of occurrences) {
          if (j < blo) continue;
          if (j >= bhi) break;

          const k = (j2len.get(j - 1) || 0) + 1;
          newJ2len.set(j, k);

          if (k > bestSize) {
            bestA = i - k + 1;
            bestB = j - k + 1;
            bestSize = k;
          }
        }
      }
      j2len = newJ2len;
    }

    return { a: bestA, b: bestB, size: bestSize };
  }

  function getMatchSize(alo: number, ahi: number, blo: number, bhi: number): number {
    const match = findLongestMatch(alo, ahi, blo, bhi);
    if (match.size === 0) {
      return 0;
    }

    let total = match.size;

    // Recursively check characters to the left of the match
    if (alo < match.a && blo < match.b) {
      total += getMatchSize(alo, match.a, blo, match.b);
    }

    // Recursively check characters to the right of the match
    if (match.a + match.size < ahi && match.b + match.size < bhi) {
      total += getMatchSize(
        match.a + match.size,
        ahi,
        match.b + match.size,
        bhi
      );
    }

    return total;
  }

  const matches = getMatchSize(0, lenA, 0, lenB);
  return (2.0 * matches) / (lenA + lenB);
}
