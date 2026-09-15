import { useState, useCallback, useMemo } from "react";
import { ReferenceItem, DuplicateGroup } from "../types";
import { gestaltSimilarity } from "../core/similarity";

/**
 * Manages manual user overrides for survivor promotion and keep/discard toggling.
 * Resolves state entirely in-memory in O(N) time without triggering expensive
 * Web Worker recalculations.
 */
export function useClusterManager(
  baseItems: ReferenceItem[],
  baseGroups: DuplicateGroup[]
) {
  const [manualKeeps, setManualKeeps] = useState<Record<string, boolean>>({});
  const [manualPivots, setManualPivots] = useState<Record<string, string>>({});

  const handleToggleKeep = useCallback((itemId: string, keep: boolean) => {
    setManualKeeps((prev) => ({
      ...prev,
      [itemId]: keep,
    }));
  }, []);

  const handlePromoteItem = useCallback((groupId: string, itemId: string) => {
    setManualPivots((prev) => ({
      ...prev,
      [groupId]: itemId,
    }));
  }, []);

  const resetOverrides = useCallback(() => {
    setManualKeeps({});
    setManualPivots({});
  }, []);

  // In-memory reconciliation of items
  const resolvedItems = useMemo(() => {
    if (baseItems.length === 0) return [];

    return baseItems.map((item) => {
      let keepVal = item.keep;
      let isPivotVal = item.isPivot;
      let isDuplicateVal = item.isDuplicate;
      let duplicateOfIdVal = item.duplicateOfId;

      // Check for manual pivot promotions
      if (item.isDuplicate || item.isPivot) {
        const clusterId = item.duplicateOfId || item.id;
        const chosenPivotId = manualPivots[clusterId];

        if (chosenPivotId) {
          if (item.id === chosenPivotId) {
            isPivotVal = true;
            isDuplicateVal = false;
            duplicateOfIdVal = null;
            if (manualKeeps[item.id] === undefined) {
              keepVal = true;
            }
          } else {
            isPivotVal = false;
            isDuplicateVal = true;
            duplicateOfIdVal = chosenPivotId;
            if (manualKeeps[item.id] === undefined) {
              keepVal = false;
            }
          }
        }
      }

      // Check for explicit user keep/discard override
      if (manualKeeps[item.id] !== undefined) {
        keepVal = manualKeeps[item.id];
      }

      return {
        ...item,
        keep: keepVal,
        isPivot: isPivotVal,
        isDuplicate: isDuplicateVal,
        duplicateOfId: duplicateOfIdVal,
      };
    });
  }, [baseItems, manualKeeps, manualPivots]);

  // In-memory reconciliation of duplicate groups
  const resolvedGroups = useMemo(() => {
    if (resolvedItems.length === 0 || baseGroups.length === 0) return [];

    // O(N) grouping by parent/pivot
    const duplicatesByParent = new Map<string, ReferenceItem[]>();
    const itemMap = new Map<string, ReferenceItem>();

    for (const itm of resolvedItems) {
      itemMap.set(itm.id, itm);
      if (itm.isDuplicate && itm.duplicateOfId) {
        const dups = duplicatesByParent.get(itm.duplicateOfId) || [];
        dups.push(itm);
        duplicatesByParent.set(itm.duplicateOfId, dups);
      }
    }

    const groups: DuplicateGroup[] = [];
    for (const [parentId, dups] of duplicatesByParent.entries()) {
      const parentItem = itemMap.get(parentId);
      if (parentItem && dups.length > 0) {
        // Re-align similarity relative to the active pivot
        const alignedDups = dups.map((dup) => {
          let sim = dup.similarityToParent;
          if (dup.normalizedTitle && parentItem.normalizedTitle) {
            sim = gestaltSimilarity(dup.normalizedTitle, parentItem.normalizedTitle);
          }
          return {
            ...dup,
            similarityToParent: sim,
          };
        });

        groups.push({
          id: parentId,
          pivot: parentItem,
          duplicates: alignedDups,
        });
      }
    }

    return groups;
  }, [resolvedItems, baseGroups]);

  return {
    resolvedItems,
    resolvedGroups,
    manualKeeps,
    manualPivots,
    handleToggleKeep,
    handlePromoteItem,
    resetOverrides,
  };
}
