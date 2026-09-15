import {
  ReferenceRawRow,
  ReferenceItem,
  DuplicateGroup,
  DeduplicateOptions,
  DeduplicationResult,
} from "../types";
import { normalizeTitle, extractCleanYear } from "./normalization";
import { gestaltSimilarity, canMeetThreshold } from "./similarity";
import { extractRowValue, detectArticleType } from "./detection";
import { calculateCompleteness } from "./completeness";

/**
 * Executes multi-tier bibliographic reference deduplication.
 *
 * Employs:
 * 1. O(1) DOI and exact normalized title hash maps for immediate match grouping.
 * 2. Mathematical length-bound pruning to bypass string distance algorithms.
 * 3. Inverted-index Gestalt Pattern Matching for fuzzy title alignment.
 * 4. Configurable survivor election (metadata completeness vs chronological order).
 */
export function runDeduplication(
  rawRows: ReferenceRawRow[],
  options: DeduplicateOptions
): DeduplicationResult {
  const { titleColumn, yearColumn, authorsColumn, doiColumn } = options.columnMapping;

  // 1. Construct ReferenceItems with pre-computed metadata
  const initialItems: ReferenceItem[] = rawRows.map((row, index) => {
    const rawTitle = extractRowValue(row, titleColumn, [
      /primary[-_\s]?title/i,
      /^title$/i,
      /document[-_\s]?title/i,
      /article[-_\s]?title/i,
      /titulo/i,
      /^name$/i,
    ]);
    const rawYear = extractRowValue(row, yearColumn, [
      /publication[-_\s]?year/i,
      /^year$/i,
      /ano/i,
      /date[-_\s]?published/i,
      /^date$/i,
      /issue[-_\s]?date/i,
      /added[-_\s]?to/i,
    ]);
    const rawAuthors = extractRowValue(row, authorsColumn, [
      /authors/i,
      /author/i,
      /autor/i,
      /autores/i,
    ]);
    const rawDoi = extractRowValue(row, doiColumn, [
      /^doi$/i,
      /digital[-_\s]?object[-_\s]?identifier/i,
      /doi/i,
    ]);

    const titleStr = String(rawTitle).trim();
    const normalized = normalizeTitle(titleStr);
    const completeness = calculateCompleteness(row);
    const cleanYear = extractCleanYear(rawYear);
    const articleType = detectArticleType(row);

    const sourceFile = typeof row.__sourceFile === "string" ? row.__sourceFile : "";

    return {
      id: `ref-${index}`,
      originalRow: row,
      title: titleStr,
      normalizedTitle: normalized,
      year: String(rawYear).trim(),
      cleanYear,
      authors: String(rawAuthors).trim(),
      doi: String(rawDoi).trim(),
      completenessScore: completeness,
      articleType,
      isDuplicate: false,
      duplicateOfId: null,
      similarityToParent: 0,
      isPivot: false,
      keep: true,
      sourceFile,
    };
  });

  const uniquesList: ReferenceItem[] = [];
  const doiIndex = new Map<string, ReferenceItem>();
  const exactTitleIndex = new Map<string, ReferenceItem>();

  // 2. Sequential scan with tiered filtering
  for (const item of initialItems) {
    if (!item.normalizedTitle) {
      uniquesList.push(item);
      continue;
    }

    let matchedUnique: ReferenceItem | null = null;
    let maxScore = 0;

    // Tier 1a: O(1) Exact DOI Match (if enabled and present)
    const normalizedDoi = item.doi.toLowerCase().trim();
    if (options.matchDoi && normalizedDoi.length > 0) {
      const doiMatch = doiIndex.get(normalizedDoi);
      if (doiMatch) {
        matchedUnique = doiMatch;
        maxScore = 1.0;
      }
    }

    // Tier 1b: O(1) Exact Normalized Title Match
    if (!matchedUnique) {
      const exactMatch = exactTitleIndex.get(item.normalizedTitle);
      if (exactMatch) {
        matchedUnique = exactMatch;
        maxScore = 1.0;
      }
    }

    // Tier 2 & 3: Mathematical Bound + Inverted Index Gestalt Matching
    if (!matchedUnique) {
      const itemLen = item.normalizedTitle.length;

      for (const uniqueItem of uniquesList) {
        const uniqueLen = uniqueItem.normalizedTitle.length;

        // Skip if mathematical maximum ratio cannot meet user threshold
        if (!canMeetThreshold(itemLen, uniqueLen, options.threshold)) {
          continue;
        }

        const score = gestaltSimilarity(item.normalizedTitle, uniqueItem.normalizedTitle);
        if (score >= options.threshold) {
          if (score > maxScore) {
            matchedUnique = uniqueItem;
            maxScore = score;
            // Exact or near-exact match early exit
            if (score >= 0.999) {
              break;
            }
          }
        }
      }
    }

    if (matchedUnique) {
      item.isDuplicate = true;
      item.duplicateOfId = matchedUnique.id;
      item.similarityToParent = maxScore;
      item.keep = false;
    } else {
      uniquesList.push(item);
      exactTitleIndex.set(item.normalizedTitle, item);
      if (normalizedDoi.length > 0) {
        doiIndex.set(normalizedDoi, item);
      }
    }
  }

  // 3. O(N) Hash Grouping of Duplicates
  const duplicateBuckets = new Map<string, ReferenceItem[]>();
  for (const unique of uniquesList) {
    duplicateBuckets.set(unique.id, []);
  }

  for (const item of initialItems) {
    if (item.isDuplicate && item.duplicateOfId) {
      const bucket = duplicateBuckets.get(item.duplicateOfId);
      if (bucket) {
        bucket.push(item);
      } else {
        duplicateBuckets.set(item.duplicateOfId, [item]);
      }
    }
  }

  // 4. Apply Survivor Election Rules
  const duplicateGroups: DuplicateGroup[] = [];

  for (const originalPivot of uniquesList) {
    const clusterDuplicates = duplicateBuckets.get(originalPivot.id) || [];

    if (clusterDuplicates.length === 0) {
      originalPivot.isPivot = true;
      originalPivot.keep = true;
      continue;
    }

    const clusterAll = [originalPivot, ...clusterDuplicates];

    // Elect survivor
    let survivor = originalPivot;
    if (options.parentRule === "completeness") {
      let maxCompleteness = -1;
      for (const candidate of clusterAll) {
        if (candidate.completenessScore > maxCompleteness) {
          maxCompleteness = candidate.completenessScore;
          survivor = candidate;
        }
      }
    } else {
      // First rule preserves the first encountered record
      survivor = originalPivot;
    }

    // Set survivor states
    survivor.isPivot = true;
    survivor.isDuplicate = false;
    survivor.keep = true;
    survivor.duplicateOfId = null;
    survivor.similarityToParent = 1.0;

    // Demote and align cluster members
    const finalDuplicates: ReferenceItem[] = [];
    for (const member of clusterAll) {
      if (member.id !== survivor.id) {
        member.isPivot = false;
        member.isDuplicate = true;
        member.duplicateOfId = survivor.id;
        member.keep = false;

        // Recompute similarity to new survivor if changed
        if (survivor.id !== originalPivot.id) {
          if (member.normalizedTitle && survivor.normalizedTitle) {
            member.similarityToParent = gestaltSimilarity(
              member.normalizedTitle,
              survivor.normalizedTitle
            );
          } else {
            member.similarityToParent = 0.5;
          }
        }
        finalDuplicates.push(member);
      }
    }

    duplicateGroups.push({
      id: survivor.id,
      pivot: survivor,
      duplicates: finalDuplicates,
    });
  }

  return {
    items: initialItems,
    groups: duplicateGroups,
  };
}
