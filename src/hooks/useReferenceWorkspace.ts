import { useState, useMemo, useCallback } from "react";
import Papa from "papaparse";
import { UploadedFile, ReferenceRawRow } from "../types";
import { SAMPLE_ACM_CSV, SAMPLE_IEEE_CSV, SAMPLE_SCOPUS_CSV } from "../samples";
import { cleanHeaderString } from "../core/detection";
import { parseBibtex } from "../core/bibtexParser";
import { parseTex } from "../core/texParser";

interface UseReferenceWorkspaceProps {
  onNotify: (type: "success" | "warning" | "error", message: string) => void;
  onResetOverrides: () => void;
}

export function useReferenceWorkspace({ onNotify, onResetOverrides }: UseReferenceWorkspaceProps) {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isParsing, setIsParsing] = useState(false);

  // Unified list of raw rows tagging sourceFile
  const rawRows = useMemo(() => {
    const merged: ReferenceRawRow[] = [];
    for (const file of uploadedFiles) {
      for (const row of file.rows) {
        merged.push({
          ...row,
          __sourceFile: file.name,
        });
      }
    }
    return merged;
  }, [uploadedFiles]);

  // Unified headers extracted from all active files with BOM stripped
  const headers = useMemo(() => {
    const headerSet = new Set<string>();
    for (const file of uploadedFiles) {
      for (const h of file.headers) {
        if (h) headerSet.add(cleanHeaderString(h));
      }
    }
    return Array.from(headerSet);
  }, [uploadedFiles]);

  const fileName = useMemo(() => {
    if (uploadedFiles.length === 0) return "";
    if (uploadedFiles.length === 1) return uploadedFiles[0].name;
    const firstClean = uploadedFiles[0].name.replace(/\.(csv|bib|tex|bibtex)$/i, "");
    return `${firstClean}_e_${uploadedFiles.length - 1}_outros_arquivos.csv`;
  }, [uploadedFiles]);

  const totalSize = useMemo(() => {
    return uploadedFiles.reduce((acc, f) => acc + f.size, 0);
  }, [uploadedFiles]);

  const addParsedFile = useCallback(
    (
      name: string,
      size: number,
      parsedRows: ReferenceRawRow[],
      parsedHeaders: string[],
      format: "csv" | "bib" | "tex"
    ) => {
      let alreadyLoaded = false;
      setUploadedFiles((prev) => {
        if (prev.some((f) => f.name === name)) {
          alreadyLoaded = true;
          return prev;
        }

        const newFile: UploadedFile = {
          id: `file-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          name,
          size,
          rowCount: parsedRows.length,
          headers: parsedHeaders,
          rows: parsedRows,
          format,
        };

        return [...prev, newFile];
      });

      if (alreadyLoaded) {
        onNotify("warning", `O arquivo "${name}" já foi carregado anteriormente.`);
      } else {
        onNotify(
          "success",
          `Sucesso! Carregado "${name}" (${format.toUpperCase()}) com ${parsedRows.length} registros.`
        );
      }

      onResetOverrides();
      setIsParsing(false);
    },
    [onNotify, onResetOverrides]
  );

  const parseFileContent = useCallback(
    (rawText: string, name: string, size: number) => {
      setIsParsing(true);

      // Strip UTF-8 BOM
      const cleanText = rawText.replace(/^\uFEFF/, "");
      const lowerName = name.toLowerCase();

      try {
        if (lowerName.endsWith(".bib") || lowerName.endsWith(".bibtex")) {
          // Parse BibTeX
          const entries = parseBibtex(cleanText, { unescape: true });
          if (entries.length === 0) {
            onNotify("error", `O arquivo BibTeX "${name}" está vazio ou nenhuma entrada válida foi identificada.`);
            setIsParsing(false);
            return;
          }

          const headerSet = new Set<string>();
          headerSet.add("citationKey");
          headerSet.add("entryType");

          const parsedRows: ReferenceRawRow[] = entries.map((entry) => {
            const row: ReferenceRawRow = {
              ...entry.fields,
              citationKey: entry.citationKey,
              entryType: entry.entryType,
            };
            for (const key of Object.keys(entry.fields)) {
              if (key) headerSet.add(cleanHeaderString(key));
            }
            return row;
          });

          addParsedFile(name, size, parsedRows, Array.from(headerSet), "bib");
        } else if (lowerName.endsWith(".tex")) {
          // Parse TeX (embedded BibTeX or \bibitem)
          const entries = parseTex(cleanText);
          if (entries.length === 0) {
            onNotify("error", `O arquivo TeX "${name}" não continha referências reconhecíveis (@article ou \\bibitem).`);
            setIsParsing(false);
            return;
          }

          const headerSet = new Set<string>();
          headerSet.add("citationKey");
          headerSet.add("entryType");

          const parsedRows: ReferenceRawRow[] = entries.map((entry) => {
            const row: ReferenceRawRow = {
              ...entry.fields,
              citationKey: entry.citationKey,
              entryType: entry.entryType,
            };
            for (const key of Object.keys(entry.fields)) {
              if (key) headerSet.add(cleanHeaderString(key));
            }
            return row;
          });

          addParsedFile(name, size, parsedRows, Array.from(headerSet), "tex");
        } else {
          // Default: Parse as CSV via PapaParse
          Papa.parse(cleanText, {
            header: true,
            skipEmptyLines: "greedy",
            complete: (results) => {
              const parsedRows = results.data as ReferenceRawRow[];
              if (parsedRows.length === 0) {
                onNotify("error", `O arquivo "${name}" está vazio ou não pôde ser analisado.`);
                setIsParsing(false);
                return;
              }

              const parsedHeaders = (results.meta.fields || []).map(cleanHeaderString);
              addParsedFile(name, size, parsedRows, parsedHeaders, "csv");
            },
            error: (err: Error) => {
              onNotify("error", `Erro ao analisar CSV "${name}": ${err.message}`);
              setIsParsing(false);
            },
          });
        }
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        onNotify("error", `Erro ao processar "${name}": ${errorMsg}`);
        setIsParsing(false);
      }
    },
    [addParsedFile, onNotify]
  );

  const handleFileUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const reader = new FileReader();
        reader.onload = (event) => {
          const text = event.target?.result as string;
          parseFileContent(text, file.name, file.size);
        };
        reader.readAsText(file, "utf-8");
      }

      e.target.value = "";
    },
    [parseFileContent]
  );

  const handleLoadSample = useCallback(
    (sampleType: "acm" | "ieee" | "scopus") => {
      let csvText = "";
      let name = "";
      if (sampleType === "acm") {
        csvText = SAMPLE_ACM_CSV;
        name = "articles_acm_raw.csv";
      } else if (sampleType === "ieee") {
        csvText = SAMPLE_IEEE_CSV;
        name = "references_ieee_raw.csv";
      } else {
        csvText = SAMPLE_SCOPUS_CSV;
        name = "scopus_export_raw.csv";
      }
      parseFileContent(csvText, name, csvText.length);
    },
    [parseFileContent]
  );

  const handleDeleteFile = useCallback(
    (id: string) => {
      setUploadedFiles((prev) => prev.filter((f) => f.id !== id));
      onNotify("success", "Arquivo removido da base de dados.");
      onResetOverrides();
    },
    [onNotify, onResetOverrides]
  );

  const handleClearAll = useCallback(() => {
    setUploadedFiles([]);
    onResetOverrides();
    onNotify("success", "Área de trabalho limpa.");
  }, [onNotify, onResetOverrides]);

  return {
    uploadedFiles,
    rawRows,
    headers,
    fileName,
    totalSize,
    isParsing,
    handleFileUpload,
    handleLoadSample,
    handleDeleteFile,
    handleClearAll,
  };
}
