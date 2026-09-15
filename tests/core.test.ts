import { describe, it, expect } from "vitest";
import { normalizeTitle, extractCleanYear } from "../src/core/normalization";
import { gestaltSimilarity, canMeetThreshold } from "../src/core/similarity";
import {
  autoDetectColumnMapping,
  cleanHeaderString,
  detectArticleType,
  extractRowValue,
} from "../src/core/detection";
import { calculateCompleteness } from "../src/core/completeness";
import { sanitizeCsvFormula } from "../src/core/exportService";
import { runDeduplication } from "../src/core/deduplicator";
import { ColumnMapping } from "../src/types";

describe("Normalization Service", () => {
  it("normalizes titles by stripping diacritics, case-folding, and removing punctuation", () => {
    const raw = "  Aplicação de Inteligência Artificial: Uma Revisão Sistemática (2024)!  ";
    const expected = "aplicacao de inteligencia artificial uma revisao sistematica 2024";
    expect(normalizeTitle(raw)).toBe(expected);
  });

  it("preserves international Unicode characters in titles", () => {
    const raw = "β-Amyloid Plaque Dynamics in Alzheimer's Disease";
    const normalized = normalizeTitle(raw);
    expect(normalized).toContain("β amyloid");
  });

  it("handles null and undefined titles safely", () => {
    expect(normalizeTitle(null)).toBe("");
    expect(normalizeTitle(undefined)).toBe("");
  });

  it("extracts clean four-digit years from varied date formats", () => {
    expect(extractCleanYear("2024-05-12")).toBe("2024");
    expect(extractCleanYear("15 Jan 2023")).toBe("2023");
    expect(extractCleanYear("'25")).toBe("2025");
    expect(extractCleanYear("unknown")).toBe("unknown");
    expect(extractCleanYear(null)).toBe("N/A");
  });
});

describe("Gestalt Pattern Matching Similarity", () => {
  it("returns 1.0 for identical strings and 0.0 for empty strings", () => {
    expect(gestaltSimilarity("deep learning", "deep learning")).toBe(1.0);
    expect(gestaltSimilarity("", "deep learning")).toBe(0.0);
    expect(gestaltSimilarity("deep learning", "")).toBe(0.0);
  });

  it("computes accurate Ratcliff-Obershelp similarity for near duplicates", () => {
    const a = "modular personalization of emotional ai via behavioral metadata";
    const b = "modular personalization of emotional ai through behavioral metadata";
    const score = gestaltSimilarity(a, b);
    expect(score).toBeGreaterThan(0.9);
    expect(score).toBeLessThan(1.0);
  });

  it("evaluates mathematical length threshold bounds correctly", () => {
    // 2 * min / (min + max)
    // len 10 and 20: max ratio = 20 / 30 = 0.6667
    expect(canMeetThreshold(10, 20, 0.95)).toBe(false);
    expect(canMeetThreshold(10, 20, 0.5)).toBe(true);
    expect(canMeetThreshold(100, 100, 1.0)).toBe(true);
  });
});

describe("Column Detection and Classification", () => {
  it("strips UTF-8 BOM from header strings", () => {
    expect(cleanHeaderString("\uFEFFTitle")).toBe("Title");
  });

  it("automatically detects standard bibliographic column headers", () => {
    const headers = [
      "\uFEFFPrimary Title",
      "Publication Year",
      "Authors",
      "DOI",
      "Abstract Note",
    ];
    const mapping = autoDetectColumnMapping(headers);

    expect(mapping.titleColumn).toBe("\uFEFFPrimary Title");
    expect(mapping.yearColumn).toBe("Publication Year");
    expect(mapping.authorsColumn).toBe("Authors");
    expect(mapping.doiColumn).toBe("DOI");
    expect(mapping.abstractColumn).toBe("Abstract Note");
  });

  it("extracts mapped and fallback values resiliently from CSV rows", () => {
    const row = { "Document Title": "Sample Title", "Extra": "123" };
    const val = extractRowValue(row, "", [/title/i]);
    expect(val).toBe("Sample Title");
  });

  it("classifies document types into primary peer-reviewed vs grey literature", () => {
    const conferenceRow = { "Document Type": "Conference Paper" };
    expect(detectArticleType(conferenceRow)).toContain("periódicos revisados por pares");

    const thesisRow = { "Document Type": "Doctoral Dissertation" };
    expect(detectArticleType(thesisRow)).toContain("literatura cinza");
  });
});

describe("Completeness Scoring", () => {
  it("computes weighted completeness favoring abstracts and keywords", () => {
    const basicRow = { Title: "Paper A", Year: "2024", Authors: "Author A" };
    const richRow = {
      Title: "Paper B",
      Year: "2024",
      Authors: "Author B",
      Abstract: "Comprehensive abstract content",
      Keywords: "AI, RAG, LLM",
    };

    const basicScore = calculateCompleteness(basicRow);
    const richScore = calculateCompleteness(richRow);

    expect(basicScore).toBe(3);
    // 3 base fields + 1 abstract (1+10) + 1 keyword (1+5) = 3 + 11 + 6 = 20
    expect(richScore).toBe(20);
    expect(richScore).toBeGreaterThan(basicScore);
  });
});

describe("Security & CSV Formula Injection Protection", () => {
  it("neutralizes spreadsheet command prefixes", () => {
    expect(sanitizeCsvFormula("=cmd|' /C calc'!A0")).toBe("'=cmd|' /C calc'!A0");
    expect(sanitizeCsvFormula("+12345")).toBe("'+12345");
    expect(sanitizeCsvFormula("-sum(A1:A10)")).toBe("'-sum(A1:A10)");
    expect(sanitizeCsvFormula("@malicious_link")).toBe("'@malicious_link");
    expect(sanitizeCsvFormula("Normal Title")).toBe("Normal Title");
    expect(sanitizeCsvFormula(123)).toBe("123");
  });
});

describe("Deduplication Engine", () => {
  const columnMapping: ColumnMapping = {
    titleColumn: "Title",
    yearColumn: "Year",
    authorsColumn: "Authors",
    doiColumn: "DOI",
    abstractColumn: "Abstract",
  };

  it("identifies duplicates via exact DOI match", () => {
    const rows = [
      { Title: "First Title", Year: "2024", Authors: "Doe", DOI: "10.1000/182" },
      { Title: "Completely Different Variant", Year: "2024", Authors: "Doe", DOI: "10.1000/182" },
    ];

    const result = runDeduplication(rows, {
      threshold: 0.95,
      matchDoi: true,
      parentRule: "first",
      columnMapping,
    });

    expect(result.items[0].isDuplicate).toBe(false);
    expect(result.items[1].isDuplicate).toBe(true);
    expect(result.items[1].duplicateOfId).toBe(result.items[0].id);
    expect(result.groups.length).toBe(1);
  });

  it("promotes the most complete metadata record when parentRule is 'completeness'", () => {
    const rows = [
      { Title: "Deep Learning Foundations", Year: "2024", Authors: "Smith", Abstract: "" },
      {
        Title: "Deep Learning Foundations",
        Year: "2024",
        Authors: "Smith J",
        Abstract: "Full abstract description with extensive details.",
        Keywords: "AI, ML",
        DOI: "10.1000/dlf",
      },
    ];

    const result = runDeduplication(rows, {
      threshold: 0.95,
      matchDoi: false,
      parentRule: "completeness",
      columnMapping,
    });

    // The second row has far more complete metadata and should be elected pivot
    const pivot = result.groups[0].pivot;
    expect(pivot.id).toBe("ref-1");
    expect(pivot.isPivot).toBe(true);
    expect(pivot.keep).toBe(true);
    expect(result.items[0].isDuplicate).toBe(true);
  });
});
