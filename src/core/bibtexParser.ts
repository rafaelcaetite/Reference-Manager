/**
 * High-performance, zero-dependency BibTeX parser.
 * Implements a robust scanner tracking brace and quote depth, supporting
 * standard and custom entry types, string concatenations (#), @string macros,
 * and multi-line fields with 100% metadata preservation.
 */

import { unescapeLatex } from "./latexUnescape";

export interface ParsedBibEntry {
  entryType: string;
  citationKey: string;
  fields: Record<string, string>;
}

export interface ParseBibtexOptions {
  /** If true, automatically unescapes LaTeX diacritics and symbols on all fields */
  unescape?: boolean;
}

/**
 * Parses raw BibTeX text into an array of structured ParsedBibEntry records.
 */
export function parseBibtex(
  bibText: string,
  options?: ParseBibtexOptions
): ParsedBibEntry[] {
  const entries: ParsedBibEntry[] = [];
  if (!bibText || typeof bibText !== "string") {
    return entries;
  }

  const len = bibText.length;
  let pos = 0;
  const macros = new Map<string, string>();

  function skipWhitespaceAndComments(): void {
    while (pos < len) {
      const ch = bibText[pos];
      if (/\s/.test(ch)) {
        pos++;
      } else if (ch === "%") {
        // Skip LaTeX line comment
        while (pos < len && bibText[pos] !== "\n" && bibText[pos] !== "\r") {
          pos++;
        }
      } else {
        break;
      }
    }
  }

  function readValuePart(): string {
    skipWhitespaceAndComments();
    if (pos >= len) return "";

    const ch = bibText[pos];

    if (ch === "{") {
      pos++;
      let depth = 1;
      const start = pos;
      while (pos < len && depth > 0) {
        if (bibText[pos] === "\\") {
          pos += 2;
          continue;
        }
        if (bibText[pos] === "{") {
          depth++;
        } else if (bibText[pos] === "}") {
          depth--;
          if (depth === 0) {
            const val = bibText.slice(start, pos);
            pos++; // consume '}'
            return val;
          }
        }
        pos++;
      }
      return bibText.slice(start, pos);
    }

    if (ch === '"') {
      pos++;
      let braceDepth = 0;
      const start = pos;
      while (pos < len) {
        if (bibText[pos] === "\\") {
          pos += 2;
          continue;
        }
        if (bibText[pos] === "{") {
          braceDepth++;
        } else if (bibText[pos] === "}") {
          if (braceDepth > 0) braceDepth--;
        } else if (bibText[pos] === '"' && braceDepth === 0) {
          const val = bibText.slice(start, pos);
          pos++; // consume '"'
          return val;
        }
        pos++;
      }
      return bibText.slice(start, pos);
    }

    // Bare number, identifier, or macro
    const start = pos;
    while (pos < len && !/[,\s#}{()]/.test(bibText[pos])) {
      pos++;
    }
    const token = bibText.slice(start, pos).trim();
    const macroVal = macros.get(token.toLowerCase());
    return macroVal !== undefined ? macroVal : token;
  }

  function parseFieldValue(): string {
    const parts: string[] = [];

    while (pos < len) {
      skipWhitespaceAndComments();
      if (pos >= len) break;

      const part = readValuePart();
      parts.push(part);

      skipWhitespaceAndComments();
      if (pos < len && bibText[pos] === "#") {
        pos++; // consume '#'
        continue;
      }
      break;
    }

    const combined = parts.join("");
    return combined.replace(/\r?\n\s*/g, " ").trim();
  }

  while (pos < len) {
    skipWhitespaceAndComments();
    if (pos >= len) break;

    // Scan for entry indicator '@'
    if (bibText[pos] !== "@") {
      pos++;
      continue;
    }
    pos++; // consume '@'

    // Read entry type
    const typeStart = pos;
    while (pos < len && /[a-zA-Z0-9_\-]/.test(bibText[pos])) {
      pos++;
    }
    const entryType = bibText.slice(typeStart, pos).toLowerCase();
    if (!entryType) continue;

    skipWhitespaceAndComments();
    if (pos >= len) break;

    const openDelim = bibText[pos];
    if (openDelim !== "{" && openDelim !== "(") {
      continue;
    }
    const closeDelim = openDelim === "{" ? "}" : ")";
    pos++; // consume open delimiter

    // Handle @comment
    if (entryType === "comment") {
      let depth = 1;
      while (pos < len && depth > 0) {
        if (bibText[pos] === openDelim) depth++;
        else if (bibText[pos] === closeDelim) depth--;
        pos++;
      }
      continue;
    }

    // Handle @preamble
    if (entryType === "preamble") {
      let depth = 1;
      while (pos < len && depth > 0) {
        if (bibText[pos] === openDelim) depth++;
        else if (bibText[pos] === closeDelim) depth--;
        pos++;
      }
      continue;
    }

    // Handle @string macro definition
    if (entryType === "string") {
      skipWhitespaceAndComments();
      const macroKeyStart = pos;
      while (pos < len && /[a-zA-Z0-9_\-:]/.test(bibText[pos])) {
        pos++;
      }
      const macroKey = bibText.slice(macroKeyStart, pos).toLowerCase().trim();
      skipWhitespaceAndComments();
      if (pos < len && bibText[pos] === "=") {
        pos++;
        const macroVal = parseFieldValue();
        if (macroKey) {
          macros.set(macroKey, macroVal);
        }
      }
      while (pos < len && bibText[pos] !== closeDelim) {
        pos++;
      }
      if (pos < len && bibText[pos] === closeDelim) {
        pos++;
      }
      continue;
    }

    // Standard citation entry: read citationKey
    skipWhitespaceAndComments();
    const keyStart = pos;
    while (
      pos < len &&
      bibText[pos] !== "," &&
      bibText[pos] !== closeDelim
    ) {
      pos++;
    }
    const citationKey = bibText.slice(keyStart, pos).trim();

    if (pos < len && bibText[pos] === ",") {
      pos++; // consume comma after citation key
    }

    // Parse fields
    const fields: Record<string, string> = {};

    while (pos < len) {
      skipWhitespaceAndComments();
      if (pos >= len) break;

      if (bibText[pos] === closeDelim) {
        pos++; // consume close delimiter
        break;
      }

      // Read field name
      const fieldKeyStart = pos;
      while (pos < len && /[a-zA-Z0-9_\-:]/.test(bibText[pos])) {
        pos++;
      }
      const fieldKey = bibText.slice(fieldKeyStart, pos).toLowerCase().trim();

      if (!fieldKey) {
        if (bibText[pos] === closeDelim) {
          pos++;
          break;
        }
        pos++;
        continue;
      }

      skipWhitespaceAndComments();
      if (pos < len && bibText[pos] === "=") {
        pos++; // consume '='
      }

      const rawVal = parseFieldValue();
      fields[fieldKey] = options?.unescape ? unescapeLatex(rawVal) : rawVal;

      skipWhitespaceAndComments();
      if (pos < len && bibText[pos] === ",") {
        pos++; // consume comma
      }
    }

    entries.push({
      entryType,
      citationKey,
      fields,
    });
  }

  return entries;
}
