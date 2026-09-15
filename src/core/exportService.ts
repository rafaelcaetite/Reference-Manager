import Papa from "papaparse";
import JSZip from "jszip";
import { ReferenceItem } from "../types";
import { extractCleanYear } from "./normalization";
import { detectArticleType, extractRowValue } from "./detection";

/**
 * Neutralizes CSV Formula Injection (CWE-1236).
 * Escapes characters that spreadsheets interpret as formula commands (=, +, -, @, \t, \r).
 */
export function sanitizeCsvFormula(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (/^[=+\-@\t\r]/.test(str)) {
    return `'${str}`;
  }
  return str;
}

/**
 * Exports cleaned reference records to a standard CSV file with formula protection
 * and automated memory cleanup.
 */
export function exportCleanedCsv(items: ReferenceItem[], baseFilename: string): void {
  if (items.length === 0) return;

  const exportRows = items.map((item) => {
    const raw = { ...item.originalRow };

    // Standardize essential metadata fields
    raw["Ano"] = extractCleanYear(item.year);
    raw["DOI"] = item.doi || "";
    raw["Tipo de Artigo"] = item.articleType || detectArticleType(item.originalRow);

    // Sanitize all values against CSV injection
    const sanitized: Record<string, string> = {};
    for (const key of Object.keys(raw)) {
      if (key.startsWith("__")) continue; // Exclude internal keys
      sanitized[key] = sanitizeCsvFormula(raw[key]);
    }
    return sanitized;
  });

  const csvOutput = Papa.unparse(exportRows);
  const blob = new Blob([csvOutput], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  const cleanBase = baseFilename.replace(/\.csv$/i, "") || "referencias";
  link.href = url;
  link.download = `${cleanBase}_unicas_limpas.csv`;
  link.style.display = "none";

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Revoke Blob URL to free memory
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export interface LlmBatchConfig {
  items: ReferenceItem[];
  abstractColumn: string;
  batchMode: "size" | "count";
  batchSize: number;
  batchCount: number;
}

/**
 * Packages references into structured text files partitioned in a compressed ZIP archive.
 */
export async function generateLlmBatchesZip(config: LlmBatchConfig): Promise<number> {
  const { items, abstractColumn, batchMode, batchSize, batchCount } = config;
  if (items.length === 0) return 0;

  let articlesPerBatch = 10;
  if (batchMode === "size") {
    articlesPerBatch = Math.max(1, batchSize);
  } else {
    const totalBatches = Math.max(1, Math.min(batchCount, items.length));
    articlesPerBatch = Math.ceil(items.length / totalBatches);
  }

  const zip = new JSZip();
  let batchNum = 1;

  for (let i = 0; i < items.length; i += articlesPerBatch) {
    const chunk = items.slice(i, i + articlesPerBatch);
    const txtFilename = `batch_${String(batchNum).padStart(3, "0")}.txt`;

    let content = "";
    chunk.forEach((item, index) => {
      const title = item.title ? String(item.title).trim() : "SEM TÍTULO";

      let abstract = "SEM RESUMO";
      if (item.originalRow) {
        abstract =
          extractRowValue(item.originalRow, abstractColumn, [
            /abstract/i,
            /resumo/i,
            /resumen/i,
            /summary/i,
            /description/i,
          ]) || "SEM RESUMO";
      }

      const year = item.cleanYear || extractCleanYear(item.year);
      const doi = item.doi || "SEM DOI";
      const articleType = item.articleType || detectArticleType(item.originalRow);

      content += `Artigo ${index + 1}:\n`;
      content += `Título: ${title}\n`;
      content += `Ano: ${year}\n`;
      content += `DOI: ${doi}\n`;
      content += `Tipo de Artigo: ${articleType}\n`;
      content += `Resumo: ${abstract}\n`;
      content += `${"-".repeat(60)}\n\n`;
    });

    zip.file(txtFilename, content.trim() + "\n");
    batchNum++;
  }

  const blobContent = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(blobContent);

  const link = document.createElement("a");
  link.href = url;
  link.download = "batches_para_llm.zip";
  link.style.display = "none";

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  setTimeout(() => URL.revokeObjectURL(url), 1500);

  return batchNum - 1;
}
