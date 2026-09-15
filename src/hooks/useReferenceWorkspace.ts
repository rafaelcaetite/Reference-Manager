import { useState, useMemo, useCallback } from "react";
import Papa from "papaparse";
import { UploadedFile, ReferenceRawRow } from "../types";
import { SAMPLE_ACM_CSV, SAMPLE_IEEE_CSV, SAMPLE_SCOPUS_CSV } from "../samples";
import { cleanHeaderString } from "../core/detection";

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
    const firstClean = uploadedFiles[0].name.replace(/\.csv$/i, "");
    return `${firstClean}_e_${uploadedFiles.length - 1}_outros_arquivos.csv`;
  }, [uploadedFiles]);

  const totalSize = useMemo(() => {
    return uploadedFiles.reduce((acc, f) => acc + f.size, 0);
  }, [uploadedFiles]);

  const parseCsvText = useCallback(
    (csvText: string, name: string, size: number) => {
      setIsParsing(true);

      // Strip UTF-8 BOM
      const cleanText = csvText.replace(/^\uFEFF/, "");

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
            };

            return [...prev, newFile];
          });

          if (alreadyLoaded) {
            onNotify("warning", `O arquivo "${name}" já foi carregado anteriormente.`);
          } else {
            onNotify(
              "success",
              `Sucesso! Carregado "${name}" com ${parsedRows.length} registros.`
            );
          }

          onResetOverrides();
          setIsParsing(false);
        },
        error: (err: Error) => {
          onNotify("error", `Erro ao analisar CSV "${name}": ${err.message}`);
          setIsParsing(false);
        },
      });
    },
    [onNotify, onResetOverrides]
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
          parseCsvText(text, file.name, file.size);
        };
        reader.readAsText(file, "utf-8");
      }

      e.target.value = "";
    },
    [parseCsvText]
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
      parseCsvText(csvText, name, csvText.length);
    },
    [parseCsvText]
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
