import { ColumnMapping, ReferenceRawRow } from "../types";

/**
 * Strips UTF-8 Byte Order Mark (BOM) and trims leading/trailing whitespace.
 */
export function cleanHeaderString(header: string): string {
  return header.replace(/^\uFEFF/, "").trim();
}

/**
 * Automatically detects column mapping based on common case-insensitive bibliographic patterns.
 */
export function autoDetectColumnMapping(headers: string[]): ColumnMapping {
  const cleanHeaders = headers.map(cleanHeaderString);

  const mapping: ColumnMapping = {
    titleColumn: "",
    yearColumn: "",
    authorsColumn: "",
    doiColumn: "",
    abstractColumn: "",
  };

  const titlePatterns = [
    /primary[-_\s]?title/i,
    /^title$/i,
    /document[-_\s]?title/i,
    /article[-_\s]?title/i,
    /titulo/i,
    /^name$/i,
  ];
  const yearPatterns = [
    /publication[-_\s]?year/i,
    /^year$/i,
    /ano/i,
    /date[-_\s]?published/i,
    /^date$/i,
    /issue[-_\s]?date/i,
    /added[-_\s]?to/i,
  ];
  const authorsPatterns = [/authors/i, /author/i, /autor/i, /autores/i];
  const doiPatterns = [/^doi$/i, /digital[-_\s]?object[-_\s]?identifier/i, /doi/i];
  const abstractPatterns = [/abstract/i, /resumo/i, /resumen/i, /summary/i, /description/i];

  function findHeader(patterns: RegExp[], fallbackWord?: string): string {
    for (const pattern of patterns) {
      const matchIndex = cleanHeaders.findIndex((h) => pattern.test(h));
      if (matchIndex !== -1) {
        return headers[matchIndex]; // Return original header key so row index lookup works
      }
    }
    if (fallbackWord) {
      const matchIndex = cleanHeaders.findIndex((h) => h.toLowerCase().includes(fallbackWord));
      if (matchIndex !== -1) {
        return headers[matchIndex];
      }
    }
    return "";
  }

  mapping.titleColumn = findHeader(titlePatterns, "title") || headers[0] || "";
  mapping.yearColumn = findHeader(yearPatterns, "year") || findHeader([], "date") || "";
  mapping.authorsColumn = findHeader(authorsPatterns, "author") || "";
  mapping.doiColumn = findHeader(doiPatterns, "doi") || "";
  mapping.abstractColumn = findHeader(abstractPatterns, "abstract") || "";

  return mapping;
}

/**
 * Resiliently extracts a column value from a raw CSV row.
 * Checks the explicitly mapped column first, then falls back to case-tolerant pattern matches.
 */
export function extractRowValue(
  row: ReferenceRawRow,
  columnSelected: string,
  fallbackPatterns: RegExp[]
): string {
  if (!row) return "";

  // 1. Explicitly mapped column
  if (columnSelected && row[columnSelected] !== undefined && row[columnSelected] !== null) {
    const val = String(row[columnSelected]).trim();
    if (val.length > 0) return val;
  }

  // 2. Pattern search across row keys
  const keys = Object.keys(row);
  for (const pattern of fallbackPatterns) {
    const matchingKey = keys.find((k) => pattern.test(cleanHeaderString(k)));
    if (matchingKey && row[matchingKey] !== undefined && row[matchingKey] !== null) {
      const val = String(row[matchingKey]).trim();
      if (val.length > 0) return val;
    }
  }

  return "";
}

/**
 * Classifies publication type into primary peer-reviewed literature vs secondary / grey literature.
 */
export function detectArticleType(row: ReferenceRawRow): string {
  if (!row) {
    return "Artigos publicados em conferências científicas, workshops ou periódicos revisados por pares";
  }

  const typeValue = extractRowValue(row, "", [
    /type/i,
    /document[-_\s]?type/i,
    /item[-_\s]?type/i,
    /tipo/i,
    /publication[-_\s]?type/i,
  ]).toLowerCase();

  if (!typeValue) {
    return "Artigos publicados em conferências científicas, workshops ou periódicos revisados por pares";
  }

  const secondaryPatterns = [
    /review/i,
    /revis/i,
    /report/i,
    /relat/i,
    /thesis/i,
    /tese/i,
    /dissertation/i,
    /disserta/i,
    /book/i,
    /livro/i,
    /chapter/i,
    /cap[ií]tulo/i,
    /abstract/i,
    /editorial/i,
    /opinion/i,
    /opini[aã]o/i,
    /letter/i,
    /carta/i,
  ];

  for (const pattern of secondaryPatterns) {
    if (pattern.test(typeValue)) {
      return "Publicações secundárias (revisões sistemáticas/mapeamentos), literatura cinza (relatórios técnicos, teses, dissertações), livros, capítulos de livros, abstracts isolados e editoriais/opiniões";
    }
  }

  return "Artigos publicados em conferências científicas, workshops ou periódicos revisados por pares";
}
