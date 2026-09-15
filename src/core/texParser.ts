/**
 * LaTeX and TeX bibliographic parser.
 * Supports dual-mode resolution:
 * Mode A: Embedded BibTeX entries (@article{...}, @inproceedings{...})
 * Mode B: thebibliography / \bibitem environments with heuristic metadata extraction
 * and 100% preservation of full raw citation text in 'raw_citation'.
 */

import { unescapeLatex } from "./latexUnescape";
import { parseBibtex, ParsedBibEntry } from "./bibtexParser";

export type { ParsedBibEntry };
export { unescapeLatex };

/**
 * Strips LaTeX line comments (% ...) that are not escaped (\%).
 */
function stripLatexComments(tex: string): string {
  return tex
    .split("\n")
    .map((line) => {
      let inEscape = false;
      for (let i = 0; i < line.length; i++) {
        if (line[i] === "\\") {
          inEscape = !inEscape;
        } else if (line[i] === "%" && !inEscape) {
          return line.substring(0, i);
        } else {
          inEscape = false;
        }
      }
      return line;
    })
    .join("\n");
}

/**
 * Extracts bibliographic items from LaTeX thebibliography / \bibitem environments.
 */
function parseThebibliography(cleanedTex: string): ParsedBibEntry[] {
  const entries: ParsedBibEntry[] = [];
  const bibitemRegex = /\\bibitem(?:\s*\[([^\]]*)\])?\s*\{([^}]+)\}/g;

  interface RawBibitem {
    label?: string;
    citationKey: string;
    contentStartIndex: number;
  }

  const items: RawBibitem[] = [];
  let match: RegExpExecArray | null;

  while ((match = bibitemRegex.exec(cleanedTex)) !== null) {
    items.push({
      label: match[1] ? match[1].trim() : undefined,
      citationKey: match[2].trim(),
      contentStartIndex: match.index + match[0].length,
    });
  }

  for (let idx = 0; idx < items.length; idx++) {
    const cur = items[idx];
    const nextStart =
      idx + 1 < items.length
        ? cleanedTex.lastIndexOf("\\bibitem", items[idx + 1].contentStartIndex)
        : cleanedTex.indexOf("\\end{thebibliography}", cur.contentStartIndex);

    const endIndex = nextStart !== -1 ? nextStart : cleanedTex.length;
    const rawContent = cleanedTex.substring(cur.contentStartIndex, endIndex).trim();

    if (!cur.citationKey && !rawContent) continue;

    const fields: Record<string, string> = {
      raw_citation: rawContent,
    };

    // 1. Extract DOI
    const doiMatch =
      rawContent.match(/\\doi\s*\{([^}]+)\}/i) ||
      rawContent.match(/https?:\/\/(?:dx\.)?doi\.org\/([^\s,;]+)/i) ||
      rawContent.match(/doi:\s*([^\s,;]+)/i) ||
      rawContent.match(/\b(10\.\d{4,9}\/[-._;()/:A-Za-z0-9]+)\b/i);

    if (doiMatch) {
      fields.doi = doiMatch[1].replace(/[.,}>]+$/, "").trim();
    }

    // 2. Extract URL
    const urlMatch =
      rawContent.match(/\\url\s*\{([^}]+)\}/i) ||
      rawContent.match(/\\href\s*\{([^}]+)\}/i) ||
      rawContent.match(/(https?:\/\/[^\s,">]+)/i);

    if (urlMatch) {
      fields.url = urlMatch[1].replace(/[.,}>]+$/, "").trim();
    }

    // 3. Extract Year
    let year = "";
    if (cur.label) {
      const labelYear = cur.label.match(/\b(1[89]\d{2}|20\d{2})\b/);
      if (labelYear) year = labelYear[1];
    }
    if (!year) {
      const parenYear = rawContent.match(/\b\((1[89]\d{2}|20\d{2})\)\b/);
      if (parenYear) {
        year = parenYear[1];
      } else {
        const anyYear = rawContent.match(/\b(1[89]\d{2}|20\d{2})\b/);
        if (anyYear) year = anyYear[1];
      }
    }
    if (year) {
      fields.year = year;
    }

    // 4. Extract Title & Journal / Booktitle
    // Check for LaTeX quoted titles: ``...'' or "..."
    const quotedMatch = rawContent.match(/``([^'']+)''/) || rawContent.match(/"([^"]+)"/);
    if (quotedMatch) {
      fields.title = unescapeLatex(quotedMatch[1].replace(/[,.]+$/, "").trim());

      // Extract author before the quote
      const quoteIndex = rawContent.indexOf(quotedMatch[0]);
      const authorText = rawContent.substring(0, quoteIndex).replace(/[,.]+$/, "").trim();
      if (authorText) {
        fields.author = unescapeLatex(authorText);
      }

      // Check for venue after quote in \textit{...} or \emph{...}
      const venueMatch = rawContent.substring(quoteIndex).match(/\\(?:textit|emph)\s*\{([^}]+)\}/);
      if (venueMatch) {
        const venue = unescapeLatex(venueMatch[1]);
        if (/proceedings|conference|symposium|naacl|icml|neurips|acl/i.test(venue)) {
          fields.booktitle = venue;
        } else {
          fields.journal = venue;
        }
      }
    } else {
      // APA-like or standard format: Authors (Year). Title. Journal / Venue
      if (year) {
        const yearPattern = new RegExp(`\\(${year}\\)\\.?\\s*`, "i");
        const yearMatch = rawContent.match(yearPattern);
        if (yearMatch && yearMatch.index !== undefined) {
          const authorSection = rawContent.substring(0, yearMatch.index).replace(/[,.]+$/, "").trim();
          if (authorSection) {
            fields.author = unescapeLatex(authorSection);
          }

          const afterYear = rawContent.substring(yearMatch.index + yearMatch[0].length).trim();
          // Title usually continues until the next period followed by space, or next \emph/\textit
          const titleEndMatch = afterYear.match(/\.\s|\\(?:emph|textit)/);
          if (titleEndMatch && titleEndMatch.index !== undefined) {
            const potentialTitle = afterYear.substring(0, titleEndMatch.index).trim();
            if (potentialTitle) {
              fields.title = unescapeLatex(potentialTitle);
            }
          } else {
            const firstPeriod = afterYear.indexOf(".");
            if (firstPeriod !== -1) {
              fields.title = unescapeLatex(afterYear.substring(0, firstPeriod).trim());
            }
          }
        }
      }

      // Extract venue from \emph{...} or \textit{...}
      const venueMatch = rawContent.match(/\\(?:textit|emph)\s*\{([^}]+)\}/);
      if (venueMatch) {
        const venue = unescapeLatex(venueMatch[1]);
        if (/proceedings|conference|symposium|workshop/i.test(venue)) {
          fields.booktitle = venue;
        } else {
          fields.journal = venue;
        }
      }
    }

    // Fallbacks if title or author are still missing
    if (!fields.title) {
      const emphMatch = rawContent.match(/\\(?:emph|textit)\s*\{([^}]+)\}/);
      if (emphMatch) {
        fields.title = unescapeLatex(emphMatch[1]);
      }
    }

    let entryType = "misc";
    if (fields.booktitle) {
      entryType = "inproceedings";
    } else if (fields.journal) {
      entryType = "article";
    }

    entries.push({
      entryType,
      citationKey: cur.citationKey,
      fields,
    });
  }

  return entries;
}

/**
 * Main parser entry point: Parses a TeX document and extracts all bibliographic records.
 * Supports both embedded BibTeX blocks and \begin{thebibliography} / \bibitem environments.
 */
export function parseTex(texText: string): ParsedBibEntry[] {
  if (!texText || typeof texText !== "string" || !texText.trim()) {
    return [];
  }

  const cleanedTex = stripLatexComments(texText);
  const bibEntries = parseBibtex(cleanedTex, { unescape: true });
  const bibitemEntries = parseThebibliography(cleanedTex);

  return [...bibEntries, ...bibitemEntries];
}
