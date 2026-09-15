export interface BibtexExportItem {
  row: Record<string, any>;
  originalId?: string;
  [key: string]: any;
}

export interface BibtexExportOptions {
  defaultEntryType?: string;
}

const INTERNAL_KEYS = new Set([
  "id",
  "originalid",
  "duplicateofid",
  "isduplicate",
  "ispivot",
  "keep",
  "completenessscore",
  "similaritytoparent",
  "normalizedtitle",
  "cleanyear",
  "sourcefile",
  "originalrow",
  "row",
  "citationkey",
  "citation_key",
  "key",
  "entrytype",
  "entry_type",
  "tipodeartigo",
  "tipo de artigo",
]);

/**
 * Standard bibliographic fields and their prioritized search patterns in raw rows.
 */
const STANDARD_FIELD_DEFS: Array<{
  name: string;
  keys: string[];
}> = [
  { name: "title", keys: ["title", "titulo", "document title", "primary title", "name"] },
  { name: "author", keys: ["author", "authors", "autores", "autor"] },
  { name: "year", keys: ["year", "ano", "publication year", "cleanyear", "date"] },
  { name: "journal", keys: ["journal", "revista", "publication title"] },
  { name: "booktitle", keys: ["booktitle", "book title", "conference", "proceedings"] },
  { name: "volume", keys: ["volume"] },
  { name: "number", keys: ["number", "issue"] },
  { name: "pages", keys: ["pages", "page"] },
  { name: "month", keys: ["month"] },
  { name: "doi", keys: ["doi", "digital object identifier"] },
  { name: "url", keys: ["url", "link"] },
  { name: "publisher", keys: ["publisher"] },
  { name: "abstract", keys: ["abstract", "resumo", "abstract note", "summary"] },
  { name: "keywords", keys: ["keywords", "palavras_chave"] },
];

/**
 * Generates an AuthorYearTitle citation key or returns the explicit citation key if present.
 */
function resolveCitationKey(row: Record<string, any>, index: number): string {
  const explicitKey = row.citationKey || row.citation_key || row.key;
  if (explicitKey && typeof explicitKey === "string" && explicitKey.trim()) {
    return explicitKey.trim().replace(/\s+/g, "_");
  }

  // 1. Author surname
  const rawAuthor = row.author || row.authors || row.autores || row.autor || row.Authors;
  let authorPart = "";
  if (rawAuthor && typeof rawAuthor === "string" && rawAuthor.trim()) {
    const firstAuthor = rawAuthor.split(/\s+(?:and|e)\s+|;/i)[0].trim();
    let surname = "";
    if (firstAuthor.includes(",")) {
      surname = firstAuthor.split(",")[0].trim();
    } else {
      const parts = firstAuthor.split(/\s+/).filter(Boolean);
      surname = parts[parts.length - 1] || "";
    }
    authorPart = surname
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]/g, "");
    if (authorPart.length > 0) {
      authorPart = authorPart.charAt(0).toUpperCase() + authorPart.slice(1);
    }
  }

  // 2. Publication year
  const rawYear = row.year || row.ano || row.cleanYear || row["Publication Year"] || row.date;
  let yearPart = "";
  if (rawYear) {
    const yearMatch = String(rawYear).match(/\b(1[89]\d{2}|20\d{2})\b/);
    if (yearMatch) {
      yearPart = yearMatch[1];
    }
  }

  // 3. First significant title word
  const rawTitle = row.title || row.titulo || row["Document Title"] || row["Primary Title"];
  let titlePart = "";
  let words: string[] = [];
  if (rawTitle && typeof rawTitle === "string" && rawTitle.trim()) {
    const stopWords = new Set([
      "a", "an", "the", "in", "on", "of", "and", "to", "for", "with", "at", "by", "from",
      "up", "about", "into", "over", "after", "is", "are", "was", "were", "de", "da", "do",
      "dos", "das", "em", "um", "uma", "para", "com",
    ]);

    words = rawTitle
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9\s]/g, " ")
      .split(/\s+/)
      .filter(Boolean);

    let chosenWord = words.find((w) => !stopWords.has(w.toLowerCase()) && w.length >= 2);
    if (!chosenWord && words.length > 0) {
      chosenWord = words[0];
    }

    if (chosenWord) {
      titlePart = chosenWord.charAt(0).toUpperCase() + chosenWord.slice(1);
    }
  }

  // Handle missing author with available title
  if (!authorPart) {
    if (titlePart) {
      if (words.length > 1) {
        authorPart = titlePart;
        const secondWord = words.find((w, i) => i > 0 && w.length >= 2);
        titlePart = secondWord ? secondWord.charAt(0).toUpperCase() + secondWord.slice(1) : "";
      } else {
        authorPart = "Anonymous";
      }
    } else {
      authorPart = "Ref";
    }
  }

  const baseKey = `${authorPart}${yearPart}${titlePart}` || `Ref_${index + 1}`;
  return baseKey.replace(/[^a-zA-Z0-9_:-]/g, "");
}

/**
 * Determines the BibTeX entry type (e.g. article, inproceedings, book, etc.).
 */
function resolveEntryType(row: Record<string, any>, defaultType = "article"): string {
  const rawType = String(
    row.entryType || row.entry_type || row.type || row["Tipo de Artigo"] || ""
  ).toLowerCase();

  if (/conference|proceedings|workshop|symposium/i.test(rawType) || row.booktitle || row["Book Title"]) {
    return "inproceedings";
  }
  if (/book|livro/i.test(rawType)) {
    return "book";
  }
  if (/thesis|dissertation|tese|disserta/i.test(rawType)) {
    return "phdthesis";
  }
  if (/report|techreport|relat/i.test(rawType)) {
    return "techreport";
  }
  if (row.journal || row.revista || row["Publication Title"]) {
    return "article";
  }

  return defaultType;
}

/**
 * Exports reference records to a standardized, clean BibTeX (.bib) string.
 * Automatically synthesizes missing citation keys, orders standard fields,
 * and preserves all custom attributes.
 */
export function exportToBibtex(
  records: Array<{ row: Record<string, any>; originalId?: string }>,
  options?: BibtexExportOptions
): string {
  if (!records || records.length === 0) {
    return "";
  }

  const seenKeys = new Set<string>();
  const entriesOutput: string[] = [];

  records.forEach((record, index) => {
    const raw = record.row || (record as any).originalRow || record;
    if (!raw) return;

    // Resolve unique citation key
    let key = resolveCitationKey(raw, index);
    if (seenKeys.has(key)) {
      let suffixNum = 2;
      while (seenKeys.has(`${key}_${suffixNum}`)) {
        suffixNum++;
      }
      key = `${key}_${suffixNum}`;
    }
    seenKeys.add(key);

    const entryType = resolveEntryType(raw, options?.defaultEntryType);

    // Track which row keys have been consumed
    const consumedKeys = new Set<string>();
    const fieldsToOutput: Array<{ name: string; value: string }> = [];

    // 1. Process standard fields in clean canonical order
    for (const def of STANDARD_FIELD_DEFS) {
      if (entryType === "inproceedings" && def.name === "journal") {
        continue;
      }
      if (entryType === "article" && def.name === "booktitle" && !raw.booktitle) {
        continue;
      }

      for (const rowKey of Object.keys(raw)) {
        if (consumedKeys.has(rowKey)) continue;

        const cleanKey = rowKey.toLowerCase().replace(/[\s_\-]/g, "");
        const matchesKey = def.keys.some((k) => k.replace(/[\s_\-]/g, "") === cleanKey);

        if (matchesKey) {
          const val = raw[rowKey];
          if (val !== undefined && val !== null && String(val).trim() !== "") {
            fieldsToOutput.push({
              name: def.name,
              value: String(val).trim(),
            });
            consumedKeys.add(rowKey);
            break;
          }
        }
      }
    }

    // 2. Retain custom and arbitrary metadata fields
    for (const rowKey of Object.keys(raw)) {
      if (consumedKeys.has(rowKey)) continue;
      if (rowKey.startsWith("__")) continue;

      const lowerKey = rowKey.toLowerCase().trim();
      if (INTERNAL_KEYS.has(lowerKey)) continue;

      const val = raw[rowKey];
      if (val !== undefined && val !== null && String(val).trim() !== "") {
        fieldsToOutput.push({
          name: rowKey,
          value: String(val).trim(),
        });
        consumedKeys.add(rowKey);
      }
    }

    // 3. Format entry
    const fieldLines = fieldsToOutput.map((f) => `  ${f.name} = {${f.value}},`);
    const entryStr = `@${entryType}{${key},\n${fieldLines.join("\n")}\n}`;
    entriesOutput.push(entryStr);
  });

  return entriesOutput.join("\n\n");
}
