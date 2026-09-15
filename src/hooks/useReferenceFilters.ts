import { useState, useMemo, useEffect, useCallback } from "react";
import { ReferenceItem, DuplicateGroup } from "../types";

interface UseReferenceFiltersProps {
  items: ReferenceItem[];
  groups: DuplicateGroup[];
  duplicateSortOrder: "none" | "asc" | "desc";
}

export function useReferenceFilters({
  items,
  groups,
  duplicateSortOrder,
}: UseReferenceFiltersProps) {
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [startYear, setStartYear] = useState<string>("");
  const [endYear, setEndYear] = useState<string>("");
  const [selectedYears, setSelectedYears] = useState<string[]>([]);

  // Compute Year Counts for Histogram
  const yearCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const item of items) {
      const yr = item.cleanYear || "N/A";
      counts[yr] = (counts[yr] || 0) + 1;
    }
    return counts;
  }, [items]);

  // Default select all years on fresh load
  useEffect(() => {
    if (!startYear && !endYear && Object.keys(yearCounts).length > 0) {
      setSelectedYears(Object.keys(yearCounts));
    }
  }, [startYear, endYear, yearCounts]);

  // Sync year range filter with selected years
  useEffect(() => {
    const startNum = startYear ? parseInt(startYear, 10) : null;
    const endNum = endYear ? parseInt(endYear, 10) : null;

    if ((startNum !== null && !isNaN(startNum)) || (endNum !== null && !isNaN(endNum))) {
      const allYears = Object.keys(yearCounts);
      const filtered = allYears.filter((yrStr) => {
        const yrNum = parseInt(yrStr, 10);
        if (isNaN(yrNum)) return false;
        if (startNum !== null && yrNum < startNum) return false;
        if (endNum !== null && yrNum > endNum) return false;
        return true;
      });
      setSelectedYears(filtered);
    }
  }, [startYear, endYear, yearCounts]);

  const handleToggleYear = useCallback((year: string) => {
    setSelectedYears((prev) =>
      prev.includes(year) ? prev.filter((y) => y !== year) : [...prev, year]
    );
  }, []);

  const handleSelectAllYears = useCallback(() => {
    setSelectedYears(Object.keys(yearCounts));
  }, [yearCounts]);

  const handleClearAllYears = useCallback(() => {
    setSelectedYears([]);
  }, []);

  const clearYearRange = useCallback(() => {
    setStartYear("");
    setEndYear("");
  }, []);

  // Filter predicate
  const matchesFilters = useCallback(
    (item: ReferenceItem): boolean => {
      // 1. Year Filter
      const yrNum = parseInt(item.cleanYear, 10);
      const startNum = startYear ? parseInt(startYear, 10) : null;
      const endNum = endYear ? parseInt(endYear, 10) : null;

      if (startNum !== null && !isNaN(startNum)) {
        if (isNaN(yrNum) || yrNum < startNum) return false;
      }
      if (endNum !== null && !isNaN(endNum)) {
        if (isNaN(yrNum) || yrNum > endNum) return false;
      }

      // Check histogram selection only if range is not manually typed
      const isRangeEmpty =
        (startNum === null || isNaN(startNum)) && (endNum === null || isNaN(endNum));
      if (isRangeEmpty && selectedYears.length > 0) {
        if (!selectedYears.includes(item.cleanYear)) return false;
      }

      // 2. Search Query
      if (searchTerm.trim().length > 0) {
        const query = searchTerm.toLowerCase();
        const matchesTitle = item.title.toLowerCase().includes(query);
        const matchesAuthors = item.authors.toLowerCase().includes(query);
        const matchesYear = item.cleanYear.toLowerCase().includes(query);
        const matchesDoi = item.doi.toLowerCase().includes(query);
        const matchesSource = item.sourceFile ? item.sourceFile.toLowerCase().includes(query) : false;

        return matchesTitle || matchesAuthors || matchesYear || matchesDoi || matchesSource;
      }

      return true;
    },
    [startYear, endYear, selectedYears, searchTerm]
  );

  // Cleaned Unique Items (Survivor/Unique and keep = true)
  const filteredCleanedItems = useMemo(() => {
    return items.filter((item) => !item.isDuplicate && item.keep && matchesFilters(item));
  }, [items, matchesFilters]);

  // Duplicate Groups
  const filteredDuplicateGroups = useMemo(() => {
    const matched = groups.filter((group) => {
      const pivotMatch = matchesFilters(group.pivot);
      const anyDupMatch = group.duplicates.some((dup) => matchesFilters(dup));
      return pivotMatch || anyDupMatch;
    });

    if (duplicateSortOrder === "none") return matched;

    return [...matched].sort((a, b) => {
      const simA =
        a.duplicates.length > 0 ? Math.max(...a.duplicates.map((d) => d.similarityToParent)) : 0;
      const simB =
        b.duplicates.length > 0 ? Math.max(...b.duplicates.map((d) => d.similarityToParent)) : 0;

      return duplicateSortOrder === "asc" ? simA - simB : simB - simA;
    });
  }, [groups, matchesFilters, duplicateSortOrder]);

  // All Items
  const filteredAllItems = useMemo(() => {
    return items.filter(matchesFilters);
  }, [items, matchesFilters]);

  return {
    searchTerm,
    setSearchTerm,
    startYear,
    setStartYear,
    endYear,
    setEndYear,
    clearYearRange,
    selectedYears,
    yearCounts,
    handleToggleYear,
    handleSelectAllYears,
    handleClearAllYears,
    filteredCleanedItems,
    filteredDuplicateGroups,
    filteredAllItems,
  };
}
