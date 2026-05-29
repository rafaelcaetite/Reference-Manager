/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ReferenceItem, DuplicateGroup, ReferenceRawRow } from "./types";
import { normalizeTitle, gestaltSimilarity, extractRowValue } from "./utils";

interface DeduplicateOptions {
  threshold: number;
  matchDoi: boolean;
  parentRule: "first" | "completeness" | "manual";
  columnMapping: {
    titleColumn: string;
    yearColumn: string;
    authorsColumn: string;
    doiColumn: string;
  };
}

/**
 * Calculates metadata completeness score of a raw reference row.
 * Higher values mean more filled, non-empty fields.
 */
export function calculateCompleteness(row: ReferenceRawRow): number {
  let score = 0;
  for (const key in row) {
    if (Object.prototype.hasOwnProperty.call(row, key)) {
      const val = row[key];
      if (val !== null && val !== undefined && String(val).trim().length > 0) {
        score += 1;
        // Give higher weight to abstract and keywords since they are very detailed
        if (key.toLowerCase().includes("abstract")) {
          score += 10;
        }
        if (key.toLowerCase().includes("keyword")) {
          score += 5;
        }
      }
    }
  }
  return score;
}

/**
 * Deduplicate active references based on user options and similarity matching
 */
export function runDeduplication(
  rawRows: ReferenceRawRow[],
  options: DeduplicateOptions
): { items: ReferenceItem[]; groups: DuplicateGroup[] } {
  const { titleColumn, yearColumn, authorsColumn, doiColumn } = options.columnMapping;

  // 1. Initial ReferenceItem construction
  const initialItems: ReferenceItem[] = rawRows.map((row, index) => {
    const rawTitle = extractRowValue(row, titleColumn, [
      /primary[-_\s]?title/i,
      /^title$/i,
      /document[-_\s]?title/i,
      /titulo/i,
      /^name$/i
    ]);
    const rawYear = extractRowValue(row, yearColumn, [
      /publication[-_\s]?year/i,
      /^year$/i,
      /ano/i,
      /date[-_\s]?published/i,
      /^date$/i,
      /issue[-_\s]?date/i,
      /added[-_\s]?to/i
    ]);
    const rawAuthors = extractRowValue(row, authorsColumn, [
      /authors/i,
      /author/i,
      /autor/i,
      /autores/i
    ]);
    const rawDoi = extractRowValue(row, doiColumn, [
      /^doi$/i,
      /doi/i
    ]);

    const normalizedTitleStr = normalizeTitle(rawTitle);

    return {
      id: `ref-${index}`,
      originalRow: row,
      title: String(rawTitle).trim(),
      normalizedTitle: normalizedTitleStr,
      year: String(rawYear).trim(),
      authors: String(rawAuthors).trim(),
      doi: String(rawDoi).trim(),
      isDuplicate: false,
      duplicateOfId: null,
      similarityToParent: 0,
      isPivot: false,
      keep: true,
      sourceFile: row.__sourceFile || "",
    };
  });

  // Keep track of visited pivots/uniques
  const uniquesList: ReferenceItem[] = [];
  const itemMap: { [id: string]: ReferenceItem } = {};

  initialItems.forEach((item) => {
    itemMap[item.id] = item;
  });

  // 2. Pairwise sequential scan matching the Python behavior but with smart upgrades
  // We compare each item with already established uniques.
  initialItems.forEach((item) => {
    // If the title is completely empty, we skip duplicate checks to avoid false positives
    if (!item.normalizedTitle) {
      uniquesList.push(item);
      return;
    }

    let matchedUnique: ReferenceItem | null = null;
    let maxScore = 0;

    for (const uniqueItem of uniquesList) {
      // Tie breaker 1: DOI exact match (if configured and populated)
      if (
        options.matchDoi &&
        item.doi &&
        uniqueItem.doi &&
        item.doi.toLowerCase().trim() === uniqueItem.doi.toLowerCase().trim()
      ) {
        matchedUnique = uniqueItem;
        maxScore = 1.0;
        break;
      }

      // Length optimization from Python code:
      // Otimização: Se os tamanhos forem muito diferentes, nem calcula similaridade
      const lenDiff = Math.abs(item.normalizedTitle.length - uniqueItem.normalizedTitle.length);
      if (lenDiff > 25) {
        continue;
      }

      // Calculate string similarity (Gestalt Pattern Matching)
      const score = gestaltSimilarity(item.normalizedTitle, uniqueItem.normalizedTitle);
      if (score >= options.threshold) {
        if (score > maxScore) {
          matchedUnique = uniqueItem;
          maxScore = score;
        }
      }
    }

    if (matchedUnique) {
      item.isDuplicate = true;
      item.duplicateOfId = matchedUnique.id;
      item.similarityToParent = maxScore;
      item.keep = false; // Discard duplicate by default
    } else {
      uniquesList.push(item);
    }
  });

  // 3. Grouping duplicates together
  const groupsTemp: { [pivotId: string]: ReferenceItem[] } = {};
  
  uniquesList.forEach((item) => {
    groupsTemp[item.id] = [];
  });

  initialItems.forEach((item) => {
    if (item.isDuplicate && item.duplicateOfId) {
      const parentId = item.duplicateOfId;
      if (groupsTemp[parentId]) {
        groupsTemp[parentId].push(item);
      } else {
        // If parent wasn't added for some reason
        groupsTemp[parentId] = [item];
      }
    }
  });

  // 4. Applying Parent Selection Rule to choose the best "Pivot/Survivor" within each group
  const finalizedUniqueIds = new Set<string>();
  const duplicatesGroups: DuplicateGroup[] = [];

  uniquesList.forEach((originalPivot) => {
    const groupDuplicates = groupsTemp[originalPivot.id] || [];
    if (groupDuplicates.length === 0) {
      // No duplicates found for this item, it is truly unique!
      originalPivot.isPivot = true;
      originalPivot.keep = true;
      finalizedUniqueIds.add(originalPivot.id);
      return;
    }

    // There are duplicates. Aggregate all members of the duplicate cluster:
    const clusterAll = [originalPivot, ...groupDuplicates];

    // Find the best survivor based on the chosen rule
    let survivor = originalPivot;

    if (options.parentRule === "completeness") {
      // Find item with highest metadata completeness
      let maxScore = -1;
      clusterAll.forEach((item) => {
        const score = calculateCompleteness(item.originalRow);
        if (score > maxScore) {
          maxScore = score;
          survivor = item;
        }
      });
    } else {
      // "first" rule: keep original pivot (the first occurrence in the original CSV order)
      survivor = originalPivot;
    }

    // Set survivor states
    survivor.isPivot = true;
    survivor.isDuplicate = false;
    survivor.keep = true;
    survivor.duplicateOfId = null;
    survivor.similarityToParent = 1.0;

    // Others in the cluster are marked as duplicates of the survivor
    clusterAll.forEach((item) => {
      if (item.id !== survivor.id) {
        item.isPivot = false;
        item.isDuplicate = true;
        item.duplicateOfId = survivor.id;
        item.keep = false;
        
        // Recompute similarity relative to the new survivor if changed
        if (survivor.id !== originalPivot.id) {
          if (item.normalizedTitle && survivor.normalizedTitle) {
            item.similarityToParent = gestaltSimilarity(item.normalizedTitle, survivor.normalizedTitle);
          } else {
            item.similarityToParent = 0.5;
          }
        }
      }
    });

    finalizedUniqueIds.add(survivor.id);
    duplicatesGroups.push({
      id: survivor.id,
      pivot: survivor,
      duplicates: clusterAll.filter((itm) => itm.id !== survivor.id),
    });
  });

  return {
    items: initialItems,
    groups: duplicatesGroups,
  };
}
