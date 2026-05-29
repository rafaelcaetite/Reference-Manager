/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ColumnMapping } from "./types";

/**
 * Normalizes reference title exactly matching the Python logic.
 * Case-fold, strip, remove punctuation, keep alphanumeric and spaces, and collapse whitespaces.
 */
export function normalizeTitle(title: any): string {
  if (title === null || title === undefined) {
    return "";
  }
  let strTitle = "";
  if (Array.isArray(title)) {
    strTitle = title.join(" ");
  } else {
    strTitle = String(title);
  }
  
  // Case-fold and strip
  strTitle = strTitle.toLowerCase().trim();
  
  // Normalize accents/diacritics so unstandardized formats match easily (e.g. "à" -> "a")
  strTitle = strTitle.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  
  // Remove punctuation, keep letters, numbers, and spaces
  // This matches exactly: titulo = ''.join(e for e in titulo if e.isalnum() or e.isspace())
  strTitle = strTitle.replace(/[^a-z0-9\s]/g, " ");
  
  // Collapse whitespaces
  return strTitle.split(/\s+/).filter(Boolean).join(" ");
}

/**
 * Computes Gestalt Pattern Matching similarity identical to Python's difflib.SequenceMatcher.ratio()
 */
export function gestaltSimilarity(a: string, b: string): number {
  if (a === b) return 1.0;
  if (!a || !b) return 0.0;
  
  function findLongestCommonSubstring(
    sa: string,
    sb: string,
    al: number,
    ar: number,
    bl: number,
    br: number
  ): { size: number; saIndex: number; sbIndex: number } {
    let maxBlock = { size: 0, saIndex: -1, sbIndex: -1 };
    
    for (let i = al; i < ar; i++) {
      for (let j = bl; j < br; j++) {
        let k = 0;
        while (i + k < ar && j + k < br && sa[i + k] === sb[j + k]) {
          k++;
        }
        if (k > maxBlock.size) {
          maxBlock.size = k;
          maxBlock.saIndex = i;
          maxBlock.sbIndex = j;
        }
      }
    }
    return maxBlock;
  }
  
  function getMatchSize(
    sa: string,
    sb: string,
    al: number,
    ar: number,
    bl: number,
    br: number
  ): number {
    let block = findLongestCommonSubstring(sa, sb, al, ar, bl, br);
    if (block.size === 0) {
      return 0;
    }
    
    let total = block.size;
    
    if (al < block.saIndex && bl < block.sbIndex) {
      total += getMatchSize(sa, sb, al, block.saIndex, bl, block.sbIndex);
    }
    
    if (block.saIndex + block.size < ar && block.sbIndex + block.size < br) {
      total += getMatchSize(
        sa,
        sb,
        block.saIndex + block.size,
        ar,
        block.sbIndex + block.size,
        br
      );
    }
    
    return total;
  }
  
  let matches = getMatchSize(a, b, 0, a.length, 0, b.length);
  return (2.0 * matches) / (a.length + b.length);
}

/**
 * Automatically detects column mapping based on common case-insensitive patterns
 */
export function autoDetectColumnMapping(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {
    titleColumn: "",
    yearColumn: "",
    authorsColumn: "",
    doiColumn: "",
    abstractColumn: "",
  };

  const titlePatterns = [/primary[-_\s]?title/i, /^title$/i, /document[-_\s]?title/i, /titulo/i, /^name$/i];
  const yearPatterns = [/publication[-_\s]?year/i, /^year$/i, /ano/i, /date[-_\s]?published/i, /^date$/i, /issue[-_\s]?date/i, /added[-_\s]?to/i];
  const authorsPatterns = [/authors/i, /author/i, /autor/i, /autores/i];
  const doiPatterns = [/^doi$/i, /doi/i];
  const abstractPatterns = [/abstract/i, /resumo/i, /resumen/i, /summary/i, /description/i];

  // Auto-detect Title
  for (const pattern of titlePatterns) {
    const match = headers.find((h) => pattern.test(h.trim()));
    if (match) {
      mapping.titleColumn = match;
      break;
    }
  }
  if (!mapping.titleColumn && headers.length > 0) {
    // Fallback to first column containing word 'title', or first column
    const match = headers.find((h) => h.toLowerCase().includes("title"));
    mapping.titleColumn = match || headers[0];
  }

  // Auto-detect Year
  for (const pattern of yearPatterns) {
    const match = headers.find((h) => pattern.test(h.trim()));
    if (match) {
      mapping.yearColumn = match;
      break;
    }
  }
  if (!mapping.yearColumn && headers.length > 0) {
    const match = headers.find((h) => h.toLowerCase().includes("year") || h.toLowerCase().includes("date"));
    mapping.yearColumn = match || headers.find((h) => h.toLowerCase().includes("ano")) || headers[0];
  }

  // Auto-detect Authors
  for (const pattern of authorsPatterns) {
    const match = headers.find((h) => pattern.test(h.trim()));
    if (match) {
      mapping.authorsColumn = match;
      break;
    }
  }
  if (!mapping.authorsColumn && headers.length > 0) {
    const match = headers.find((h) => h.toLowerCase().includes("author"));
    mapping.authorsColumn = match || headers[0];
  }

  // Auto-detect DOI
  for (const pattern of doiPatterns) {
    const match = headers.find((h) => pattern.test(h.trim()));
    if (match) {
      mapping.doiColumn = match;
      break;
    }
  }
  if (!mapping.doiColumn && headers.length > 0) {
    mapping.doiColumn = headers.find((h) => h.toLowerCase().includes("doi")) || headers[0];
  }

  // Auto-detect Abstract
  for (const pattern of abstractPatterns) {
    const match = headers.find((h) => pattern.test(h.trim()));
    if (match) {
      mapping.abstractColumn = match;
      break;
    }
  }
  if (!mapping.abstractColumn && headers.length > 0) {
    const match = headers.find((h) => h.toLowerCase().includes("abstract") || h.toLowerCase().includes("resumo"));
    mapping.abstractColumn = match || headers[0];
  }

  return mapping;
}

/**
 * Extracts and cleans the year from various string formats (e.g., "2026-05" or "14 Jan 2025" -> "2025")
 */
export function extractCleanYear(rawVal: any): string {
  if (rawVal === null || rawVal === undefined) return "N/A";
  const str = String(rawVal).trim();
  
  // Search for any 4 digits starting with 19 or 20
  const match = str.match(/\b(19\d{2}|20\d{2})\b/);
  if (match) {
    return match[1];
  }
  
  // Also try to extract a 2-digit abbreviated year like '25 -> 2025
  const shortMatch = str.match(/'(\d{2})\b/);
  if (shortMatch) {
    const yr = parseInt(shortMatch[1], 10);
    return yr < 50 ? `20${shortMatch[1]}` : `19${shortMatch[1]}`;
  }
  
  return str || "N/A";
}

/**
 * Resiliently extracts a column value from a raw CSV row.
 * It first checks the explicitly mapped column. If that key doesn't exist or is empty,
 * it searches the row's keys case-insensitively using regex patterns to find a suitable column.
 */
export function extractRowValue(
  row: any,
  columnSelected: string,
  fallbackPatterns: RegExp[]
): string {
  if (!row) return "";

  // 1. Check mapped column explicitly
  if (columnSelected && row[columnSelected] !== undefined && row[columnSelected] !== null) {
    const val = String(row[columnSelected]).trim();
    if (val.length > 0) return val;
  }

  // 2. Search row keys case-insensitively/tolerantly using patterns
  const keys = Object.keys(row);
  for (const pattern of fallbackPatterns) {
    const matchingKey = keys.find((k) => pattern.test(k.trim()));
    if (matchingKey && row[matchingKey] !== undefined && row[matchingKey] !== null) {
      const val = String(row[matchingKey]).trim();
      if (val.length > 0) return val;
    }
  }

  // 3. Last fallback: try a broad substring search on keys
  const firstFallbackKeyword = fallbackPatterns[0]?.source || "";
  if (firstFallbackKeyword) {
    const keyword = firstFallbackKeyword.replace(/[^a-zA-Z]/g, "").toLowerCase();
    if (keyword) {
      const matchingKey = keys.find((k) => k.toLowerCase().includes(keyword));
      if (matchingKey && row[matchingKey] !== undefined && row[matchingKey] !== null) {
        return String(row[matchingKey]).trim();
      }
    }
  }

  return "";
}

