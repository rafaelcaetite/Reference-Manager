/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from "react";
import Papa from "papaparse";
import {
  Upload,
  Trash2,
  FileText,
  Settings,
  Download,
  AlertTriangle,
  RefreshCw,
  Star,
  Check,
  Calendar,
  Users,
  Filter,
  CheckCircle,
  HelpCircle,
  Sliders,
  ChevronRight,
  Database,
  Layers,
  Search,
  BookOpen
} from "lucide-react";
import { ReferenceRawRow, ReferenceItem, DuplicateGroup, ColumnMapping } from "./types";
import { autoDetectColumnMapping, extractCleanYear, extractRowValue } from "./utils";
import { runDeduplication, calculateCompleteness } from "./deduplicator";
import { SAMPLE_ACM_CSV, SAMPLE_IEEE_CSV, SAMPLE_SCOPUS_CSV } from "./samples";
import YearHistogram from "./components/YearHistogram";
import JSZip from "jszip";

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  rowCount: number;
  headers: string[];
  rows: ReferenceRawRow[];
}

export default function App() {
  // Input References State (Holds list of multiple uploaded CSV reference files)
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);

  // Year periods from direct user typing (Filters)
  const [startYear, setStartYear] = useState<string>("");
  const [endYear, setEndYear] = useState<string>("");

  // Computed state for combined raw rows
  const rawRows = useMemo(() => {
    const merged: ReferenceRawRow[] = [];
    uploadedFiles.forEach((file) => {
      file.rows.forEach((row) => {
        merged.push({
          ...row,
          __sourceFile: file.name,
        });
      });
    });
    return merged;
  }, [uploadedFiles]);

  // Computed state for merged headers from all files
  const headers = useMemo(() => {
    const allHeaders = new Set<string>();
    uploadedFiles.forEach((file) => {
      file.headers.forEach((h) => {
        if (h) allHeaders.add(h);
      });
    });
    return Array.from(allHeaders);
  }, [uploadedFiles]);

  // Computed visual filename descriptor for export
  const fileName = useMemo(() => {
    if (uploadedFiles.length === 0) return "";
    if (uploadedFiles.length === 1) return uploadedFiles[0].name;
    const firstClean = uploadedFiles[0].name.replace(/\.csv$/i, "");
    return `${firstClean}_e_outros_${uploadedFiles.length - 1}_arquivos.csv`;
  }, [uploadedFiles]);

  // Computed combined file size
  const fileSize = useMemo(() => {
    return uploadedFiles.reduce((acc, f) => acc + f.size, 0);
  }, [uploadedFiles]);
  
  // Column Mappings State
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({
    titleColumn: "",
    yearColumn: "",
    authorsColumn: "",
    doiColumn: "",
    abstractColumn: "",
  });

  // Settings State
  const [threshold, setThreshold] = useState<number>(0.95);
  const [matchDoi, setMatchDoi] = useState<boolean>(true);
  const [parentRule, setParentRule] = useState<"first" | "completeness">("completeness");

  // Filter State
  const [selectedYears, setSelectedYears] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"duplicates" | "cleaned" | "all">("cleaned");

  // Output State
  const [processedItems, setProcessedItems] = useState<ReferenceItem[]>([]);
  const [duplicateGroups, setDuplicateGroups] = useState<DuplicateGroup[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  // LLM Batch Preparation states
  const [batchMode, setBatchMode] = useState<"size" | "count">("size");
  const [batchSize, setBatchSize] = useState<number>(10);
  const [batchCount, setBatchCount] = useState<number>(5);
  const [batchSourceSelect, setBatchSourceSelect] = useState<"cleaned" | "all">("cleaned");

  // Manual Overrides State Tracker
  // Maps item ID to chosen keep boolean or promoted pivot ID
  const [manualKeeps, setManualKeeps] = useState<{ [id: string]: boolean }>({});
  const [manualPivots, setManualPivots] = useState<{ [groupId: string]: string }>({});

  // Error/Success Notification State
  const [notification, setNotification] = useState<{
    type: "success" | "warning" | "error" | null;
    message: string;
  }>({ type: null, message: "" });

  const showNotification = (type: "success" | "warning" | "error", message: string) => {
    setNotification({ type, message });
    setTimeout(() => {
      setNotification({ type: null, message: "" });
    }, 5000);
  };

  // Convert raw text/file into parsed rows using PapaParse and append to uploadedFiles list
  const handleParseCsv = (csvText: string, name: string, size: number) => {
    setLoading(true);
    Papa.parse(csvText, {
      header: true,
      skipEmptyLines: "greedy",
      complete: (results) => {
        const parsedRows = results.data as ReferenceRawRow[];
        if (parsedRows.length === 0) {
          showNotification("error", `O arquivo "${name}" está vazio ou não pôde ser analisado.`);
          setLoading(false);
          return;
        }

        const parsedHeaders = results.meta.fields || [];

        setUploadedFiles((prev) => {
          if (prev.some((f) => f.name === name)) {
            showNotification("warning", `O arquivo "${name}" já foi carregado.`);
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

          showNotification(
            "success",
            `Sucesso! Carregado "${name}" com ${parsedRows.length} registros.`
          );

          return [...prev, newFile];
        });

        // Reset manual modifications
        setManualKeeps({});
        setManualPivots({});
        setLoading(false);
      },
      error: (err) => {
        showNotification("error", `Erro ao analisar CSV "${name}": ${err.message}`);
        setLoading(false);
      }
    });
  };

  // Run auto-detect mappings whenever the combined headers change
  useEffect(() => {
    if (uploadedFiles.length > 0 && headers.length > 0) {
      const detectedMapping = autoDetectColumnMapping(headers);
      setColumnMapping(detectedMapping);
    }
  }, [uploadedFiles, headers]);

  // Handle local file uploads (supports multi-upload!)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        handleParseCsv(text, file.name, file.size);
      };
      reader.readAsText(file, "utf-8");
    }
    
    // Clear input so same files can be re-selected
    e.target.value = "";
  };

  // Load a Prepackaged Sample Dataset
  const handleLoadSample = (sampleType: "acm" | "ieee" | "scopus") => {
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
    handleParseCsv(csvText, name, csvText.length);
  };

  // Delete an individual database/file source from the list
  const handleDeleteFile = (id: string) => {
    setUploadedFiles((prev) => {
      const updated = prev.filter((f) => f.id !== id);
      showNotification("success", "Arquivo/base de dados removido.");
      return updated;
    });
    setManualKeeps({});
    setManualPivots({});
  };

  // Clear all loaded datasets completely
  const handleClearAll = () => {
    setUploadedFiles([]);
    setProcessedItems([]);
    setDuplicateGroups([]);
    setManualKeeps({});
    setManualPivots({});
    setSelectedYears([]);
    setStartYear("");
    setEndYear("");
  };

  // Run the core deduplication when settings or mappings change
  useEffect(() => {
    if (rawRows.length === 0 || !columnMapping.titleColumn) {
      setProcessedItems([]);
      setDuplicateGroups([]);
      return;
    }

    setLoading(true);
    // Debounce/Timeout execution to prevent freezing UI on larger matrices
    const timer = setTimeout(() => {
      try {
        const result = runDeduplication(rawRows, {
          threshold,
          matchDoi,
          parentRule,
          columnMapping,
        });

        // Initialize active select years based on all detected years
        const yearsSet = new Set<string>();
        result.items.forEach((item) => {
          const cleanYr = extractCleanYear(item.year);
          yearsSet.add(cleanYr);
        });

        // Apply any manual state selections overriding the automatic deduplication outputs
        const updatedItems = result.items.map((item) => {
          let keepVal = item.keep;
          let isPivotVal = item.isPivot;
          let isDuplicateVal = item.isDuplicate;
          let duplicateOfIdVal = item.duplicateOfId;

          // Apply manual keeps/discards
          if (manualKeeps[item.id] !== undefined) {
            keepVal = manualKeeps[item.id];
          }

          // Apply manual group pivot overrides
          if (item.isDuplicate || item.isPivot) {
            // Find which group/cluster this belongs to
            const groupId = item.duplicateOfId || item.id;
            const chosenPivotId = manualPivots[groupId];
            
            if (chosenPivotId) {
              if (item.id === chosenPivotId) {
                isPivotVal = true;
                isDuplicateVal = false;
                duplicateOfIdVal = null;
                // Keep the promoted one
                if (manualKeeps[item.id] === undefined) {
                  keepVal = true;
                }
              } else {
                isPivotVal = false;
                isDuplicateVal = true;
                duplicateOfIdVal = chosenPivotId;
                // Discard the demoted ones
                if (manualKeeps[item.id] === undefined) {
                  keepVal = false;
                }
              }
            }
          }

          return {
            ...item,
            keep: keepVal,
            isPivot: isPivotVal,
            isDuplicate: isDuplicateVal,
            duplicateOfId: duplicateOfIdVal,
          };
        });

        // Regenerate duplicate groups following state modifications
        const finalUniqueList = updatedItems.filter((it) => !it.isDuplicate);
        const finalGroups: DuplicateGroup[] = [];

        finalUniqueList.forEach((uniqueItm) => {
          const groupDuplicates = updatedItems.filter(
            (it) => it.isDuplicate && it.duplicateOfId === uniqueItm.id
          );
          if (groupDuplicates.length > 0) {
            finalGroups.push({
              id: uniqueItm.id,
              pivot: uniqueItm,
              duplicates: groupDuplicates,
            });
          }
        });

        setProcessedItems(updatedItems);
        setDuplicateGroups(finalGroups);
      } catch (err: any) {
        showNotification("error", `Erro no processamento: ${err.message}`);
      } finally {
        setLoading(false);
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [rawRows, columnMapping, threshold, matchDoi, parentRule, manualKeeps, manualPivots]);

  // Compute Year Counts Distribution for Histogram
  const yearCounts = useMemo(() => {
    const counts: { [year: string]: number } = {};
    processedItems.forEach((item) => {
      const yr = extractCleanYear(item.year);
      counts[yr] = (counts[yr] || 0) + 1;
    });
    return counts;
  }, [processedItems]);

  // Initialize selected years once data loads
  useEffect(() => {
    if (Object.keys(yearCounts).length > 0 && selectedYears.length === 0) {
      setSelectedYears(Object.keys(yearCounts));
    }
  }, [yearCounts]);

  const handleToggleYear = (year: string) => {
    if (selectedYears.includes(year)) {
      setSelectedYears(selectedYears.filter((y) => y !== year));
    } else {
      setSelectedYears([...selectedYears, year]);
    }
  };

  const handleSelectAllYears = () => {
    setSelectedYears(Object.keys(yearCounts));
  };

  const handleClearAllYears = () => {
    setSelectedYears([]);
  };

  // Manual Promo override action
  const handlePromoteItem = (groupId: string, itemId: string) => {
    setManualPivots((prev) => ({
      ...prev,
      [groupId]: itemId,
    }));
    showNotification("success", "Item promovido para registro principal com sucesso!");
  };

  // Manual Toggle Keep
  const handleToggleKeepItem = (itemId: string, keep: boolean) => {
    setManualKeeps((prev) => ({
      ...prev,
      [itemId]: keep,
    }));
  };

  // Helper function to decide if an item matches search query and year restrictions (histogram / typed period)
  const matchesFilters = (item: ReferenceItem) => {
    // 1. Filter by Year (dynamic range typed or individual selections)
    const cleanYr = extractCleanYear(item.year);
    const yearNum = parseInt(cleanYr, 10);

    const startNum = startYear ? parseInt(startYear, 10) : null;
    const endNum = endYear ? parseInt(endYear, 10) : null;

    // Type checking range
    if (startNum !== null && !isNaN(startNum)) {
      if (isNaN(yearNum) || yearNum < startNum) {
        return false;
      }
    }
    if (endNum !== null && !isNaN(endNum)) {
      if (isNaN(yearNum) || yearNum > endNum) {
        return false;
      }
    }

    // Fallback to histogram individual selection only when there is no typed range
    const isRangeEmpty = (startNum === null || isNaN(startNum)) && (endNum === null || isNaN(endNum));
    if (isRangeEmpty) {
      if (selectedYears.length > 0 && !selectedYears.includes(cleanYr)) {
        return false;
      }
    }

    // 2. Filter by Search Query
    if (searchTerm.trim().length > 0) {
      const query = searchTerm.toLowerCase();
      const matchesTitle = item.title.toLowerCase().includes(query);
      const matchesAuthors = item.authors.toLowerCase().includes(query);
      const matchesYear = String(item.year).toLowerCase().includes(query);
      const matchesDoi = item.doi.toLowerCase().includes(query);
      const matchesSource = item.sourceFile ? item.sourceFile.toLowerCase().includes(query) : false;
      return matchesTitle || matchesAuthors || matchesYear || matchesDoi || matchesSource;
    }

    return true;
  };

  // Filters and searches unique references displayed in Cleaned References tab
  const filteredCleanedItems = useMemo(() => {
    return processedItems.filter((item) => {
      // Must not be a duplicate (must be a pivot or truly unique)
      if (item.isDuplicate) return false;
      
      // Check if user turned keep off manually
      if (!item.keep) return false;

      return matchesFilters(item);
    });
  }, [processedItems, selectedYears, startYear, endYear, searchTerm]);

  // Filters and searches groups in Duplicates tab
  const filteredDuplicateGroups = useMemo(() => {
    return duplicateGroups.filter((group) => {
      // Return true if either the pivot or any duplicate within the group satisfies current filters
      const pivotMatches = matchesFilters(group.pivot);
      const anyDuplicateMatches = group.duplicates.some((dup) => matchesFilters(dup));
      return pivotMatches || anyDuplicateMatches;
    });
  }, [duplicateGroups, selectedYears, startYear, endYear, searchTerm]);

  // Filters and searches all active rows in the All tab
  const filteredAllItems = useMemo(() => {
    return processedItems.filter((item) => matchesFilters(item));
  }, [processedItems, selectedYears, startYear, endYear, searchTerm]);

  // Export fully cleaned CSV keeping 100% of original metadata columns
  const handleExportCSV = () => {
    if (filteredCleanedItems.length === 0) {
      showNotification("warning", "Nenhuma referência única encontrada para exportar.");
      return;
    }

    setLoading(true);
    try {
      // Reconstruct original rows
      const exportRows = filteredCleanedItems.map((item) => item.originalRow);
      
      // Convert to CSV
      const csvOutput = Papa.unparse(exportRows);

      // Create download link
      const blob = new Blob([csvOutput], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      
      const parts = fileName.split(".");
      const baseName = parts[0] || "referencias";
      link.setAttribute("href", url);
      link.setAttribute("download", `${baseName}_unicas_limpas.csv`);
      link.style.visibility = "hidden";
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      showNotification(
        "success",
        `Sucesso! Exportadas ${exportRows.length} referências limpas sem duplicatas para o arquivo CSV.`
      );
    } catch (err: any) {
      showNotification("error", `Erro ao exportar arquivo: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Dynamically group references and prepare text batches inside a ZIP archive for LLMs
  const handleGenerateLLMBatches = () => {
    const targetItems = batchSourceSelect === "cleaned" ? filteredCleanedItems : filteredAllItems;
    if (targetItems.length === 0) {
      showNotification("warning", "Nenhuma referência disponível com os filtros atuais para gerar os lotes.");
      return;
    }

    setLoading(true);
    try {
      let articlesPerBatch = 10;
      if (batchMode === "size") {
        articlesPerBatch = Math.max(1, batchSize);
      } else {
        const totalBatches = Math.max(1, Math.min(batchCount, targetItems.length));
        articlesPerBatch = Math.ceil(targetItems.length / totalBatches);
      }

      const zip = new JSZip();
      let batchNum = 1;

      for (let i = 0; i < targetItems.length; i += articlesPerBatch) {
        const chunk = targetItems.slice(i, i + articlesPerBatch);
        const txtFilename = `batch_${String(batchNum).padStart(3, "0")}.txt`;

        let content = "";
        chunk.forEach((item, index) => {
          const title = item.title ? String(item.title).trim() : "SEM TÍTULO";
          
          let abstract = "SEM RESUMO";
          if (item.originalRow) {
            abstract = extractRowValue(item.originalRow, columnMapping.abstractColumn, [
              /abstract/i,
              /resumo/i,
              /resumen/i,
              /summary/i,
              /description/i
            ]) || "SEM RESUMO";
          }

          content += `Artigo ${index + 1}:\n`;
          content += `Título: ${title}\n`;
          content += `Resumo: ${abstract}\n`;
          content += `${"-".repeat(50)}\n\n`;
        });

        zip.file(txtFilename, content.trim() + "\n");
        batchNum++;
      }

      zip.generateAsync({ type: "blob" }).then((blobContent) => {
        const url = URL.createObjectURL(blobContent);
        const link = document.createElement("a");
        link.href = url;
        link.download = `batches_para_llm.zip`;
        link.style.visibility = "hidden";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        showNotification(
          "success",
          `Sucesso! Arquivo "batches_para_llm.zip" gerado com ${batchNum - 1} lotes de texto.`
        );
        setLoading(false);
      }).catch((err: any) => {
        showNotification("error", `Erro ao gerar ZIP: ${err.message}`);
        setLoading(false);
      });
    } catch (err: any) {
      showNotification("error", `Falha ao processar lotes: ${err.message}`);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#1F2937] flex flex-col font-sans selection:bg-[#E5E7EB]">
      
      {/* Toast Notification */}
      {notification.type && (
        <div
          className={`fixed top-4 right-4 z-50 p-4 rounded-xl shadow-lg flex items-center gap-3 border transition-all duration-300 max-w-sm animate-in fade-in slide-in-from-top-4 ${
            notification.type === "success"
              ? "bg-[#D1FAE5] border-[#10B981]/25 text-[#065F46]"
              : notification.type === "warning"
              ? "bg-[#FEF3C7] border-amber-200 text-[#92400E]"
              : "bg-rose-50 border-rose-200 text-rose-800"
          }`}
          id="toast-notification"
        >
          {notification.type === "success" && <Check className="w-5 h-5 text-[#10B981] shrink-0" />}
          {notification.type === "warning" && <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />}
          {notification.type === "error" && <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />}
          <div className="text-sm font-medium">{notification.message}</div>
        </div>
      )}

      {/* Header Bar */}
      <header className="bg-white border-b border-[#E5E7EB] px-6 py-4 shrink-0 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#3B82F6] rounded-xl flex items-center justify-center text-white shadow-sm">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect width="10" height="10" x="12" y="2" rx="1" />
              <path d="M12 2H2v10h10V2z"/>
              <path d="m17 15 5 5-5 5"/>
              <path d="M2 17h12c2.8 0 5-2.2 5-5V2"/>
            </svg>
          </div>
          <div>
            <h1 className="text-base font-extrabold text-[#1F2937] tracking-tight flex items-center gap-1 font-sans">
              CiteSync <span className="text-[#3B82F6]">Pro</span>
            </h1>
            <p className="text-xs text-[#6B7280] font-sans">
              Removedor de Duplicatas de Referências Bibliográficas em .csv
            </p>
          </div>
        </div>
        
        {/* Author Email & Developer Badge */}
        <div className="flex items-center gap-4 text-xs font-mono text-[#6B7280]">
          <span className="hidden sm:inline bg-slate-100 text-slate-600 px-2 py-1 rounded">
            UTF-8 & Latin-1 compliant
          </span>
          <span className="hidden md:inline">2026-05-29</span>
        </div>
      </header>

      {/* Main Workspace Layout */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        
        {/* Left Control Panel Column (Uploader, Mapping, Settings) */}
        <div className="w-full lg:w-96 bg-white border-b lg:border-b-0 lg:border-r border-[#E5E7EB] overflow-y-auto p-5 space-y-5 shrink-0">
          
          {/* 1. UPLOADER CARD */}
          <div className="rounded-2xl border border-[#E5E7EB] p-4 space-y-4 bg-[#F8F9FA]" id="uploader-card">
            <h2 className="text-xs font-bold text-[#6B7280] uppercase tracking-wider font-sans">
              1. Carregar Arquivos de Referência (.csv)
            </h2>
            
            {/* List of active uploaded files */}
            {uploadedFiles.length > 0 && (
              <div className="space-y-2" id="uploaded-files-list">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280] font-mono">
                  Bases de dados carregadas ({uploadedFiles.length}):
                </p>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {uploadedFiles.map((file) => (
                    <div 
                      key={file.id} 
                      className="bg-white rounded-xl border border-[#E5E7EB] p-2.5 flex items-center justify-between gap-3 shadow-sm relative group"
                      id={`file-badge-${file.id}`}
                    >
                      <div className="flex items-center gap-2.5 overflow-hidden">
                        <FileText className="w-5 h-5 text-[#3B82F6] shrink-0" />
                        <div className="overflow-hidden">
                          <p className="text-xs font-bold text-[#1F2937] truncate font-mono" title={file.name}>
                            {file.name}
                          </p>
                          <p className="text-[10px] text-[#6B7280] font-mono">
                            {(file.size / 1024).toFixed(1)} KB | {file.rowCount} refs
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteFile(file.id)}
                        className="p-1 px-1.5 text-[#6B7280] hover:text-rose-600 rounded-lg hover:bg-rose-50 transition cursor-pointer shrink-0"
                        title="Remover base de dados"
                        id={`btn-delete-file-${file.id}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Upload form/dropzone - always show simplified if files already loaded, or full if empty */}
            <div className="space-y-3">
              <div className={`border border-dashed border-[#D1D5DB] hover:border-[#3B82F6] rounded-2xl text-center bg-white hover:bg-white transition cursor-pointer relative group ${uploadedFiles.length > 0 ? "p-3.5" : "p-6"}`}>
                <input
                  type="file"
                  multiple
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  id="csv-file-input"
                />
                <Upload className={`mx-auto text-[#6B7280] group-hover:text-[#3B82F6] transition ${uploadedFiles.length > 0 ? "w-5 h-5 mb-1" : "w-8 h-8 mb-2"}`} />
                <p className={`${uploadedFiles.length > 0 ? "text-xs" : "text-sm"} font-semibold text-[#1F2937] font-sans`}>
                  {uploadedFiles.length > 0 ? "Importar outra base (.CSV)" : "Carregar arquivos .CSV"}
                </p>
                <p className="text-[10px] text-[#6B7280] mt-0.5 font-sans">
                  {uploadedFiles.length > 0 ? "Arraste ou clique para somar" : "Arraste múltiplos arquivos ou clique"}
                </p>
              </div>
            </div>
          </div>

          {/* 2. COLUMN MAPPINGS CARD */}
          {rawRows.length > 0 && (
            <div className="rounded-2xl border border-[#E5E7EB] p-4 space-y-4 bg-white" id="mappings-card">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider font-sans">
                  2. Mapeamento de Colunas
                </h2>
                <span className="bg-[#D1FAE5] text-[#065F46] text-[10px] font-semibold px-2 py-0.5 rounded-full font-mono flex items-center gap-1">
                  <Check className="w-3 h-3" /> Auto
                </span>
              </div>
              <p className="text-[11px] text-[#6B7280] font-sans">
                Selecione as colunas correspondentes para possibilitar a extração e deduplicação consistentes de metadados:
              </p>

              <div className="space-y-3">
                {/* Title Mapping */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-[#1F2937] font-sans flex items-center justify-between">
                    <span>Título (Objeto de comparação)</span>
                    <span className="text-[10px] text-rose-500 font-bold">*Obrigatório</span>
                  </label>
                  <select
                    value={columnMapping.titleColumn}
                    onChange={(e) => setColumnMapping({ ...columnMapping, titleColumn: e.target.value })}
                    className="w-full text-xs border border-[#E5E7EB] rounded-xl px-3 py-2 bg-white text-[#1F2937] focus:border-[#3B82F6] focus:outline-none font-mono"
                    id="select-mapping-title"
                  >
                    {headers.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Year Mapping */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-[#1F2937] font-sans flex items-center justify-between">
                    <span>Ano de Publicação (Ano)</span>
                    <span className="text-[10px] text-[#6B7280] font-mono">Para filtro posterior</span>
                  </label>
                  <select
                    value={columnMapping.yearColumn}
                    onChange={(e) => setColumnMapping({ ...columnMapping, yearColumn: e.target.value })}
                    className="w-full text-xs border border-[#E5E7EB] rounded-xl px-3 py-2 bg-white text-[#1F2937] focus:border-[#3B82F6] focus:outline-none font-mono"
                    id="select-mapping-year"
                  >
                    {headers.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Authors Mapping */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-[#1F2937] font-sans">
                    Autores (Informativo / Tie-breaker)
                  </label>
                  <select
                    value={columnMapping.authorsColumn}
                    onChange={(e) => setColumnMapping({ ...columnMapping, authorsColumn: e.target.value })}
                    className="w-full text-xs border border-[#E5E7EB] rounded-xl px-3 py-2 bg-white text-[#1F2937] focus:border-[#3B82F6] focus:outline-none font-mono"
                    id="select-mapping-authors"
                  >
                    {headers.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>

                {/* DOI Mapping */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-[#1F2937] font-sans flex items-center justify-between">
                    <span>Identificador DOI</span>
                    <span className="text-[10px] text-[#6B7280] font-mono">Garante match absoluto</span>
                  </label>
                  <select
                    value={columnMapping.doiColumn}
                    onChange={(e) => setColumnMapping({ ...columnMapping, doiColumn: e.target.value })}
                    className="w-full text-xs border border-[#E5E7EB] rounded-xl px-3 py-2 bg-white text-[#1F2937] focus:border-[#3B82F6] focus:outline-none font-mono"
                    id="select-mapping-doi"
                  >
                    {headers.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Abstract Mapping */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-[#1F2937] font-sans flex items-center justify-between">
                    <span>Resumo / Abstract</span>
                    <span className="text-[10px] text-[#6B7280] font-mono">Para divisão de lotes</span>
                  </label>
                  <select
                    value={columnMapping.abstractColumn}
                    onChange={(e) => setColumnMapping({ ...columnMapping, abstractColumn: e.target.value })}
                    className="w-full text-xs border border-[#E5E7EB] rounded-xl px-3 py-2 bg-white text-[#1F2937] focus:border-[#3B82F6] focus:outline-none font-mono"
                    id="select-mapping-abstract"
                  >
                    {headers.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* 3. SETTINGS & THRESHOLD CARD */}
          {rawRows.length > 0 && (
            <div className="rounded-2xl border border-[#E5E7EB] p-4 space-y-4 bg-white" id="settings-card">
              <h2 className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider font-sans flex items-center gap-1.5">
                <Settings className="w-4 h-4 text-[#6B7280]" />
                3. Configurações de Deduplicação
              </h2>

              <div className="space-y-4">
                {/* Similarity threshold range */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-[#1F2937] font-sans">Limite de Similaridade</span>
                    <span className="font-mono font-extrabold bg-blue-50 text-[#3B82F6] px-2 py-0.5 rounded border border-blue-100">
                      {(threshold * 100).toFixed(0)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="1.0"
                    step="0.01"
                    value={threshold}
                    onChange={(e) => setThreshold(parseFloat(e.target.value))}
                    className="w-full accent-[#3B82F6] cursor-pointer"
                    id="threshold-range-slider"
                  />
                  <div className="flex items-center justify-between text-[10px] text-[#6B7280] font-mono">
                    <span>0.50 (Permissivo)</span>
                    <span>0.95 (Padrão)</span>
                    <span>1.00 (Exato)</span>
                  </div>
                </div>

                {/* Match DOI toggle */}
                <label className="flex items-center gap-2.5 cursor-pointer group" id="toggle-match-doi-label">
                  <input
                    type="checkbox"
                    checked={matchDoi}
                    onChange={(e) => setMatchDoi(e.target.checked)}
                    className="w-4 h-4 rounded border-[#D1D5DB] text-[#3B82F6] focus:ring-[#3B82F6] cursor-pointer"
                    id="toggle-match-doi-checkbox"
                  />
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-[#1F2937] font-sans group-hover:text-[#3B82F6] transition">
                      Mesclar DOIs idênticos
                    </span>
                    <span className="text-[10px] text-[#6B7280] font-sans">
                      Se preenchido, DOIs iguais são duplicatas absolutas.
                    </span>
                  </div>
                </label>

                {/* Parent Resolution selector */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#1F2937] font-sans flex items-center justify-between">
                    <span>Sobrevivente do Grupo</span>
                    <HelpCircle className="w-3.5 h-3.5 text-[#6B7280]" title="Qual registro deve sobreviver/permanecer?" />
                  </label>
                  <div className="grid grid-cols-1 gap-2">
                    <label
                      className={`border rounded-xl p-2.5 flex items-start gap-2 cursor-pointer transition ${
                        parentRule === "completeness"
                          ? "bg-slate-50 border-[#3B82F6] text-[#1F2937]"
                          : "bg-white border-[#E5E7EB] text-[#6B7280] hover:border-[#D1D5DB]"
                      }`}
                      id="parent-rule-completeness-label"
                    >
                      <input
                        type="radio"
                        name="parentRule"
                        value="completeness"
                        checked={parentRule === "completeness"}
                        onChange={() => setParentRule("completeness")}
                        className="mt-0.5 w-4 h-4 text-[#3B82F6] cursor-pointer focus:ring-[#3B82F6]"
                        id="radio-parent-completeness"
                      />
                      <div className="flex flex-col">
                        <span className="text-xs font-bold font-sans">Metadados Completos</span>
                        <span className="text-[10px] opacity-85 leading-relaxed font-sans">
                          Promove automaticamente o registro com menor número de campos vazios (preservação inteligente).
                        </span>
                      </div>
                    </label>

                    <label
                      className={`border rounded-xl p-2.5 flex items-start gap-2 cursor-pointer transition ${
                        parentRule === "first"
                          ? "bg-slate-50 border-[#3B82F6] text-[#1F2937]"
                          : "bg-white border-[#E5E7EB] text-[#6B7280] hover:border-[#D1D5DB]"
                      }`}
                      id="parent-rule-first-label"
                    >
                      <input
                        type="radio"
                        name="parentRule"
                        value="first"
                        checked={parentRule === "first"}
                        onChange={() => setParentRule("first")}
                        className="mt-0.5 w-4 h-4 text-[#3B82F6] cursor-pointer focus:ring-[#3B82F6]"
                        id="radio-parent-first"
                      />
                      <div className="flex flex-col">
                        <span className="text-xs font-bold font-sans">Ordem de Aparição</span>
                        <span className="text-[10px] opacity-85 leading-relaxed font-sans">
                          Mantém a primeira ocorrência do arquivo na linha, descartando o resto (mesmo critério da sua versão original).
                        </span>
                      </div>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 4. TEMPORAL DISTRIBUTION CARD */}
          {rawRows.length > 0 && (
            <div className="rounded-2xl border border-[#E5E7EB] p-4 bg-white space-y-4" id="distribution-card">
              {/* Year Inputs Range Filter */}
              <div className="space-y-2 border-b border-[#F3F4F6] pb-3" id="year-range-filter">
                <label className="text-xs font-bold text-[#6B7280] uppercase tracking-wider font-sans block">
                  Filtrar por Período Digitado
                </label>
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <input
                      type="text"
                      maxLength={4}
                      placeholder="Ano Início"
                      value={startYear}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, "");
                        setStartYear(val);
                      }}
                      className="w-full text-xs border border-[#E5E7EB] rounded-xl px-2.5 py-1.5 bg-white text-[#1F2937] focus:border-[#3B82F6] focus:outline-none font-mono text-center placeholder-[#9CA3AF]"
                      id="input-start-year"
                    />
                  </div>
                  <span className="text-xs text-[#6B7280] font-sans font-medium">até</span>
                  <div className="flex-1">
                    <input
                      type="text"
                      maxLength={4}
                      placeholder="Ano Fim"
                      value={endYear}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, "");
                        setEndYear(val);
                      }}
                      className="w-full text-xs border border-[#E5E7EB] rounded-xl px-2.5 py-1.5 bg-white text-[#1F2937] focus:border-[#3B82F6] focus:outline-none font-mono text-center placeholder-[#9CA3AF]"
                      id="input-end-year"
                    />
                  </div>
                  {(startYear || endYear) && (
                    <button
                      onClick={() => {
                        setStartYear("");
                        setEndYear("");
                      }}
                      className="p-1.5 text-[#6B7280] hover:text-rose-600 rounded-lg hover:bg-rose-50 transition cursor-pointer"
                      title="Limpar período"
                      id="btn-clear-year-range"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
                {(startYear || endYear) && (
                  <p className="text-[10px] text-[#3B82F6] font-semibold font-sans">
                    * Filtrando referências de: {startYear || "Qualquer"} até {endYear || "Qualquer"}
                  </p>
                )}
              </div>

              <YearHistogram
                yearCounts={yearCounts}
                selectedYears={selectedYears}
                onToggleYear={handleToggleYear}
                onSelectAllYears={handleSelectAllYears}
                onClearAllYears={handleClearAllYears}
              />
            </div>
          )}

        </div>

        {/* Right Dashboard Area (Results lists, tabs, detailed comparison) */}
        <div className="flex-1 flex flex-col min-w-0 bg-[#F8F9FA]">
          
          {rawRows.length === 0 ? (
            /* Welcome / Empty state placeholder */
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center max-w-xl mx-auto space-y-6" id="welcome-empty-state">
              <div className="w-16 h-16 bg-white border border-[#E5E7EB] rounded-2xl flex items-center justify-center text-[#3B82F6] shadow-sm animate-pulse">
                <Database className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-extrabold text-[#1F2937] tracking-tight font-sans">
                  Pronto para Identificar e Remover Duplicatas
                </h2>
                <p className="text-sm text-[#6B7280] leading-relaxed font-sans">
                  Surgido como um projeto para lidar com arquivos bibliográficos unificados e referências despadronizadas, essa ferramenta executa o algoritmo de Gestalt Pattern Matching em tempo real no seu navegador.
                </p>
              </div>

              <div className="bg-blue-50/50 text-[#1F2937] border border-blue-100 text-xs rounded-2xl p-5 flex items-start gap-3 text-left font-sans shadow-sm">
                <CheckCircle className="w-5 h-5 text-[#3B82F6] shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold text-[#1F2937]">Garantias de processamento:</p>
                  <ul className="list-disc pl-4 space-y-1 text-[#6B7280]">
                    <li>Deduplicação de referências em múltiplos formatos despadronizados.</li>
                    <li>Preservação garantida de 100% dos seus metadados e colunas originais.</li>
                    <li>Sistemas de representação interativa para escolha manual ou automática de qual registro salvar.</li>
                    <li>Filtre instantaneamente e ordene por ano de publicação para suas análises posteriores.</li>
                  </ul>
                </div>
              </div>

              <div className="pt-2 animate-bounce">
                <ChevronRight className="w-5 h-5 text-[#3B82F6] rotate-90 mx-auto" />
                <p className="text-xs text-[#6B7280] font-sans">Envie seu arquivo à esquerda ou carregue uma amostra para começar!</p>
              </div>
            </div>
          ) : (
            /* Work Dashboard */
            <>
              {/* Stats Bar */}
              <div className="bg-white border-b border-[#E5E7EB] px-6 py-4 flex flex-wrap items-center justify-between gap-4 select-none shrink-0 shadow-sm">
                <div className="flex gap-4 sm:gap-6">
                  {/* Total Record Counter */}
                  <div className="flex flex-col" id="stat-total">
                    <span className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider font-sans">Registros Totais</span>
                    <span className="text-lg font-extrabold text-[#1F2937] font-mono">{rawRows.length}</span>
                  </div>

                  {/* Spacer Line */}
                  <div className="w-px h-8 bg-[#E5E7EB]" />

                  {/* Unique Records Counter */}
                  <div className="flex flex-col" id="stat-unique">
                    <span className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider font-sans">Registros Únicos</span>
                    <span className="text-lg font-extrabold text-[#3B82F6] font-mono">
                      {processedItems.filter((i) => !i.isDuplicate && i.keep).length}
                    </span>
                  </div>

                  {/* Spacer Line */}
                  <div className="w-px h-8 bg-[#E5E7EB]" />

                  {/* Duplicates Counter */}
                  <div className="flex flex-col text-[#6B7280]" id="stat-duplicates">
                    <span className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider font-sans">Falso-Unicos (Duplicados)</span>
                    <span className="text-lg font-extrabold text-rose-500 font-mono">
                      {processedItems.filter((i) => i.isDuplicate).length}
                    </span>
                  </div>
                </div>

                {/* Tab Switcher & Export */}
                <div className="flex items-center gap-3">
                  <div className="bg-[#F3F4F6] p-0.5 rounded-xl flex" id="dashboard-tabs">
                    <button
                      onClick={() => setActiveTab("cleaned")}
                      className={`text-xs font-bold px-3 py-1.5 rounded-lg transition cursor-pointer font-sans ${
                        activeTab === "cleaned"
                          ? "bg-white text-[#1F2937] shadow-sm"
                          : "text-[#6B7280] hover:text-[#1F2937]"
                      }`}
                      id="tab-cleaned"
                    >
                      Únicas ({filteredCleanedItems.length})
                    </button>
                    <button
                      onClick={() => setActiveTab("duplicates")}
                      className={`text-xs font-bold px-3 py-1.5 rounded-lg transition cursor-pointer font-sans ${
                        activeTab === "duplicates"
                          ? "bg-white text-[#1F2937] shadow-sm"
                          : "text-[#6B7280] hover:text-[#1F2937]"
                      }`}
                      id="tab-duplicates"
                    >
                      Delineados ({filteredDuplicateGroups.length} grupos)
                    </button>
                    <button
                      onClick={() => setActiveTab("all")}
                      className={`text-xs font-bold px-3 py-1.5 rounded-lg transition cursor-pointer font-sans ${
                        activeTab === "all"
                          ? "bg-white text-[#1F2937] shadow-sm"
                          : "text-[#6B7280] hover:text-[#1F2937]"
                      }`}
                      id="tab-all"
                    >
                      Todos ({filteredAllItems.length})
                    </button>
                  </div>

                  {/* Export Button */}
                  <button
                    onClick={handleExportCSV}
                    className="bg-[#3B82F6] hover:bg-[#2563EB] text-white text-xs font-bold px-4 py-2 rounded-xl transition flex items-center gap-1.5 shadow-sm cursor-pointer font-sans"
                    id="btn-export-csv"
                  >
                    <Download className="w-4 h-4" />
                    <span>Exportar Únicas</span>
                  </button>
                </div>
              </div>

              {/* Sub-Filters / Search */}
              <div className="bg-[#F8F9FA] px-6 py-3 shrink-0 flex items-center justify-between border-b border-[#E5E7EB]">
                <div className="relative w-full max-w-md" id="search-input-box">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B7280]" />
                  <input
                    type="text"
                    placeholder="Pesquisar referências por título, autores ou DOI..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-4 py-1.5 text-xs bg-white border border-[#E5E7EB] rounded-xl focus:border-[#3B82F6] focus:outline-none focus:ring-0 font-sans text-[#1F2937] placeholder-[#6B7280]"
                    id="search-input-field"
                  />
                </div>
                
                {/* Year filter indicator */}
                <div className="text-xs text-[#6B7280] flex items-center gap-1">
                  <Filter className="w-3.5 h-3.5 text-[#6B7280]" />
                  <span className="font-sans">
                    Anos selecionados:{" "}
                    <strong className="text-[#1F2937]">{selectedYears.length === Object.keys(yearCounts).length ? "Todos" : `${selectedYears.length}`}</strong>
                  </span>
                </div>
              </div>

              {/* Central Display */}
              <div className="flex-1 overflow-y-auto p-6">
                
                {loading ? (
                  <div className="h-full flex flex-col items-center justify-center space-y-3" id="loading-spinner">
                    <RefreshCw className="w-8 h-8 text-[#3B82F6] animate-spin" />
                    <p className="text-sm font-semibold text-[#6B7280] font-sans">Analisando similaridades em tempo real...</p>
                  </div>
                ) : (
                  <>
                    {/* Cleaned References Table view */}
                    {activeTab === "cleaned" && (
                      <div className="bg-white rounded-2xl border border-[#E5E7EB] overflow-hidden shadow-sm" id="cleaned-table-view">
                        
                        {filteredCleanedItems.length === 0 ? (
                          <div className="text-center py-16 text-[#6B7280] space-y-2 font-sans">
                            <BookOpen className="w-10 h-10 mx-auto text-[#D1D5DB]" />
                            <p className="text-sm font-semibold text-[#1F2937]">Nenhum registro único atende à busca/filtros.</p>
                            <p className="text-xs text-[#6B7280]">Tente ajustar a busca ou redefinir a seleção temporal.</p>
                          </div>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                              <thead>
                                <tr className="bg-[#F8F9FA] border-b border-[#E5E7EB] text-[10px] font-bold text-[#6B7280] uppercase tracking-wider font-sans">
                                  <th className="py-3 px-4">Coluna Ano</th>
                                  <th className="py-3 px-4">Origem / Base</th>
                                  <th className="py-3 px-4">Título Original</th>
                                  <th className="py-3 px-4">Autores</th>
                                  <th className="py-3 px-4">Identificador DOI</th>
                                  <th className="py-3 px-4">Campos Preenchidos</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 text-xs font-sans text-[#1F2937]">
                                {filteredCleanedItems.map((item) => {
                                  const metadataScore = calculateCompleteness(item.originalRow);
                                  return (
                                    <tr key={item.id} className="hover:bg-slate-50/50 transition">
                                      <td className="py-3 px-4 font-mono font-semibold text-[#6B7280]">
                                        {extractCleanYear(item.year)}
                                      </td>
                                      <td className="py-3 px-4">
                                        <span className="bg-blue-50 text-[#3B82F6] border border-blue-100 text-[10px] font-bold px-2 py-0.5 rounded-lg inline-block truncate max-w-[140px]" title={item.sourceFile}>
                                          {item.sourceFile || "N/A"}
                                        </span>
                                      </td>
                                      <td className="py-3 px-4 pr-6 max-w-sm">
                                        <div className="font-semibold text-[#1F2937] leading-snug">{item.title}</div>
                                        {item.normalizedTitle !== item.title.toLowerCase().trim() && (
                                          <div className="text-[10px] text-[#6B7280] font-mono mt-0.5 truncate" title="Normalizado para comparação">
                                            norm: {item.normalizedTitle}
                                          </div>
                                        )}
                                      </td>
                                      <td className="py-3 px-4 text-[#6B7280] italic max-w-[180px] break-words">
                                        {item.authors || <span className="text-slate-300">N/A</span>}
                                      </td>
                                      <td className="py-3 px-4 font-mono text-[#6B7280] max-w-[150px] truncate">
                                        {item.doi ? (
                                          <span className="text-[#3B82F6] hover:underline cursor-pointer" title={item.doi}>
                                            {item.doi}
                                          </span>
                                        ) : (
                                          <span className="text-slate-300">N/A</span>
                                        )}
                                      </td>
                                      <td className="py-3 px-4">
                                        <span className="bg-slate-100 text-[#1F2937] text-[10px] font-bold px-2 py-0.5 rounded-full font-mono">
                                          {metadataScore} campos
                                        </span>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Duplicate Groups view */}
                    {activeTab === "duplicates" && (
                      <div className="space-y-6" id="duplicates-groups-view">
                        {filteredDuplicateGroups.length === 0 ? (
                          <div className="bg-white rounded-2xl border border-[#E5E7EB] py-16 text-center text-[#6B7280] space-y-2 font-sans shadow-sm">
                            <CheckCircle className="w-10 h-10 mx-auto text-[#10B981]" />
                            <p className="text-sm font-semibold text-[#1F2937]">Parabéns! Nenhuma duplicata encontrada!</p>
                            <p className="text-xs text-[#6B7280]">Todas as referências são totalmente únicas para o limite selecionado.</p>
                          </div>
                        ) : (
                          filteredDuplicateGroups.map((group) => {
                            const groupCompleteness = calculateCompleteness(group.pivot.originalRow);
                            return (
                              <div
                                key={group.id}
                                className="bg-white rounded-2xl border border-[#E5E7EB] overflow-hidden shadow-sm flex flex-col"
                                id={`duplicate-group-card-${group.id}`}
                              >
                                {/* Group Header */}
                                <div className="bg-[#F8F9FA] px-5 py-3.5 border-b border-[#E5E7EB] flex flex-wrap items-center justify-between gap-3 font-sans">
                                  <div className="flex items-center gap-2">
                                    <span className="bg-[#1F2937] text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full font-mono uppercase">
                                      Conjunto {group.pivot.id}
                                    </span>
                                    <span className="text-xs font-semibold text-[#6B7280] font-sans">
                                      {group.duplicates.length + 1} referências redundantes identificadas
                                    </span>
                                  </div>
                                </div>

                                {/* Items Container */}
                                <div className="divide-y divide-[#E5E7EB]">
                                  
                                  {/* PIVOT / MASTER RECORD */}
                                  <div className="p-5 bg-blue-50/10 relative flex flex-col md:flex-row md:items-start gap-4" id={`pivot-row-${group.pivot.id}`}>
                                    {/* Star Badge */}
                                    <div className="w-8 h-8 rounded-full bg-amber-50 border border-amber-200 text-amber-500 flex items-center justify-center shrink-0 self-start mt-1">
                                      <Star className="w-4.5 h-4.5 fill-amber-300 text-amber-500" />
                                    </div>

                                    {/* Info Block */}
                                    <div className="flex-1 space-y-1.5 min-w-0">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <span className="bg-amber-100 text-amber-900 text-[10px] font-extrabold px-2 py-0.5 rounded uppercase font-sans">
                                          REGISTRO ÚNICO (PRESERVADO)
                                        </span>
                                        <span className="text-[10px] bg-blue-50 text-[#3B82F6] border border-blue-100 px-2 py-0.5 rounded font-bold max-w-[150px] truncate" title={group.pivot.sourceFile}>
                                          {group.pivot.sourceFile || "N/A"}
                                        </span>
                                        <span className="text-xs font-bold text-[#6B7280] font-mono">
                                          completeness: {groupCompleteness} pts
                                        </span>
                                        {group.pivot.doi && (
                                          <span className="text-[10px] bg-slate-100 text-[#1F2937] px-2 py-0.5 rounded font-mono truncate">
                                            DOI: {group.pivot.doi}
                                          </span>
                                        )}
                                      </div>
                                      <h3 className="text-sm font-bold text-[#1F2937] leading-snug">{group.pivot.title}</h3>
                                      <div className="flex items-center gap-x-4 gap-y-1 text-xs text-[#6B7280] flex-wrap">
                                        <span className="flex items-center gap-1">
                                          <Calendar className="w-3.5 h-3.5 text-[#6B7280]" />
                                          Ano {group.pivot.year}
                                        </span>
                                        <span className="flex items-center gap-1 truncate max-w-xs">
                                          <Users className="w-3.5 h-3.5 text-[#6B7280]" />
                                          {group.pivot.authors || "Sem autores"}
                                        </span>
                                      </div>
                                    </div>

                                    {/* Action button */}
                                    <div className="shrink-0 self-center">
                                      <span className="bg-[#D1FAE5] text-[#065F46] text-xs px-3 py-1.5 rounded-full font-bold flex items-center gap-1.5 border border-[#10B981]/25">
                                        <Check className="w-4.5 h-4.5" /> Sobrevivente
                                      </span>
                                    </div>
                                  </div>

                                  {/* THE DUPLICATES (DISCARDED) */}
                                  {group.duplicates.map((dup) => {
                                    const dupCompleteness = calculateCompleteness(dup.originalRow);
                                    const pcent = (dup.similarityToParent * 100).toFixed(0);

                                    return (
                                      <div
                                        key={dup.id}
                                        className="p-5 bg-white flex flex-col md:flex-row md:items-start gap-4 transition hover:bg-slate-50/20"
                                        id={`dup-row-${dup.id}`}
                                      >
                                        {/* Status Checkbox */}
                                        <button
                                          onClick={() => handleToggleKeepItem(dup.id, !dup.keep)}
                                          className={`w-8 h-8 rounded-full border flex items-center justify-center shrink-0 self-start mt-1 transition cursor-pointer ${
                                            dup.keep
                                              ? "bg-[#1F2937] border-[#1F2937] text-white"
                                              : "bg-slate-100 border-[#E5E7EB] text-[#6B7280] hover:border-[#3B82F6] hover:text-[#3B82F6]"
                                          }`}
                                          title={dup.keep ? "Sendo preservado!" : "Sendo descartado. Clique para preservar tambem."}
                                          id={`btn-toggle-keep-${dup.id}`}
                                        >
                                          {dup.keep ? <Check className="w-4.5 h-4.5" /> : <Trash2 className="w-4.5 h-4.5" />}
                                        </button>

                                        {/* Info Block */}
                                        <div className="flex-1 space-y-1.5 min-w-0">
                                          <div className="flex items-center gap-2 flex-wrap">
                                            <span className="bg-slate-100 text-rose-700 text-[10px] font-bold px-2 py-0.5 rounded font-sans">
                                              DUPLICADO ({pcent}% de similaridade)
                                            </span>
                                            <span className="text-[10px] bg-blue-50 text-[#3B82F6] border border-blue-100 px-2 py-0.5 rounded font-bold max-w-[150px] truncate" title={dup.sourceFile}>
                                              {dup.sourceFile || "N/A"}
                                            </span>
                                            <span className="text-xs font-semibold text-[#6B7280] font-mono">
                                              completeness: {dupCompleteness} pts {dup.keep && "(Preservado Manualmente!)"}
                                            </span>
                                            {dup.doi && (
                                              <span className="text-[10px] bg-slate-100 text-[#6B7280] px-2 py-0.5 rounded font-mono truncate">
                                                DOI: {dup.doi}
                                              </span>
                                            )}
                                          </div>
                                          <h3 className={`text-sm font-medium ${dup.keep ? "text-[#1F2937]" : "text-[#1F2937]/45 line-through"} leading-snug`}>
                                            {dup.title}
                                          </h3>
                                          <div className="flex items-center gap-x-4 gap-y-1 text-xs text-[#6B7280] flex-wrap">
                                            <span className="flex items-center gap-1">
                                              <Calendar className="w-3.5 h-3.5 text-slate-300" />
                                              Ano {dup.year}
                                            </span>
                                            <span className="flex items-center gap-1 truncate max-w-xs">
                                              <Users className="w-3.5 h-3.5 text-slate-300" />
                                              {dup.authors || "Sem autores"}
                                            </span>
                                          </div>
                                        </div>

                                        {/* Shift Action Buttons */}
                                        <div className="shrink-0 flex items-center gap-2 self-center">
                                          <button
                                            onClick={() => handlePromoteItem(group.id, dup.id)}
                                            className="text-xs font-bold px-3 py-1.5 bg-white hover:bg-[#F8F9FA] border border-[#E5E7EB] hover:border-[#3B82F6] text-[#1F2937] rounded-xl transition shrink-0 cursor-pointer font-sans"
                                            id={`btn-promote-${dup.id}`}
                                          >
                                            Manter Este no Lugar
                                          </button>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}

                    {/* All Raw Records list */}
                    {activeTab === "all" && (
                      <div className="bg-white rounded-2xl border border-[#E5E7EB] overflow-hidden shadow-sm" id="all-rows-view">
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="bg-[#F8F9FA] border-b border-[#E5E7EB] text-[10px] font-bold text-[#6B7280] uppercase tracking-wider font-sans">
                                <th className="py-3 px-4 w-20">ID</th>
                                <th className="py-3 px-4">Origem / Base</th>
                                <th className="py-3 px-4">Título Original</th>
                                <th className="py-3 px-3 w-28">Status</th>
                                <th className="py-3 px-4">Ações</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-xs font-sans text-[#1F2937]">
                              {filteredAllItems.map((item) => {
                                return (
                                  <tr key={item.id} className="hover:bg-slate-50/50 transition">
                                    <td className="py-3 px-4 font-mono font-medium text-[#6B7280]">
                                      {item.id}
                                    </td>
                                    <td className="py-3 px-4 flex items-center h-full my-auto self-center">
                                      <span className="bg-blue-50 text-[#3B82F6] border border-blue-100 text-[10px] font-bold px-2 py-0.5 rounded-lg inline-block truncate max-w-[140px]" title={item.sourceFile}>
                                        {item.sourceFile || "N/A"}
                                      </span>
                                    </td>
                                    <td className="py-3 px-4 pr-6 max-w-md">
                                      <div className="font-semibold text-[#1F2937]">{item.title}</div>
                                      <div className="text-[10px] text-[#6B7280] italic font-mono mt-0.5 truncate">
                                        ano: {item.year} | doi: {item.doi || "N/D"}
                                      </div>
                                    </td>
                                    <td className="py-3 px-3">
                                      {item.isDuplicate ? (
                                        <span className="bg-rose-50 text-rose-700 border border-rose-100 text-[10px] font-bold px-2 py-0.5 rounded-full inline-block">
                                          Duplicado
                                        </span>
                                      ) : (
                                        <span className="bg-[#D1FAE5] text-[#065F46] border border-[#10B981]/25 text-[10px] font-bold px-2 py-0.5 rounded-full inline-block">
                                          Registrado Único
                                        </span>
                                      )}
                                    </td>
                                    <td className="py-3 px-4">
                                      <button
                                        onClick={() => handleToggleKeepItem(item.id, !item.keep)}
                                        className={`px-3 py-1.5 text-[10px] font-bold rounded-xl transition shrink-0 cursor-pointer font-sans border ${
                                          item.keep
                                            ? "bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-100"
                                            : "bg-[#F3F4F6] hover:bg-[#E5E7EB] border-[#E5E7EB] text-[#1F2937]"
                                        }`}
                                        id={`btn-action-all-${item.id}`}
                                      >
                                        {item.keep ? "Descartar" : "Preservar"}
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* 5. DYNAMIC LLM BATCH PREPARER (POSICIONADO APÓS A DEDUPLICAÇÃO) */}
                {rawRows.length > 0 && (
                  <div className="mt-8 border-t border-[#E5E7EB] pt-6 animate-fade-in" id="batches-section">
                    <div className="bg-gradient-to-tr from-slate-50 to-blue-50/20 border border-[#E5E7EB] rounded-2xl p-6 space-y-6">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-blue-50 border border-blue-100 rounded-xl text-blue-600">
                          <Layers className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-[#1F2937] font-sans flex items-center gap-1.5">
                            Preparar Lotes de Texto para LLM (.ZIP)
                          </h3>
                          <p className="text-xs text-[#6B7280] leading-relaxed font-sans max-w-3xl">
                            Divida as referências finais/processadas em lotes de texto organizados em arquivos .TXT compactados em um arquivo .ZIP para ingestão e leitura facilitada em LLMs.
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {/* Data Source Selection */}
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-[#4B5563] font-sans">1. Origem dos Artigos</label>
                          <div className="grid grid-cols-2 gap-1.5 p-1 bg-white border border-[#E5E7EB] rounded-xl shadow-sm">
                            <button
                              type="button"
                              onClick={() => setBatchSourceSelect("cleaned")}
                              className={`text-[11px] font-bold py-2 rounded-lg transition cursor-pointer font-sans text-center ${
                                batchSourceSelect === "cleaned"
                                  ? "bg-blue-50 text-blue-700 font-extrabold border border-blue-150"
                                  : "text-[#6B7280] hover:text-[#1F2937]"
                              }`}
                            >
                              Limpas ({filteredCleanedItems.length})
                            </button>
                            <button
                              type="button"
                              onClick={() => setBatchSourceSelect("all")}
                              className={`text-[11px] font-bold py-2 rounded-lg transition cursor-pointer font-sans text-center ${
                                batchSourceSelect === "all"
                                  ? "bg-blue-50 text-blue-700 font-extrabold border border-blue-150"
                                  : "text-[#6B7280] hover:text-[#1F2937]"
                              }`}
                            >
                              Todas ({filteredAllItems.length})
                            </button>
                          </div>
                        </div>

                        {/* Division Mode choosing */}
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-[#4B5563] font-sans">2. Modo de Divisão</label>
                          <div className="grid grid-cols-2 gap-1.5 p-1 bg-white border border-[#E5E7EB] rounded-xl shadow-sm">
                            <button
                              type="button"
                              onClick={() => setBatchMode("size")}
                              className={`text-[11px] font-bold py-2 rounded-lg transition cursor-pointer font-sans text-center ${
                                batchMode === "size"
                                  ? "bg-blue-50 text-blue-700 font-extrabold border border-blue-150"
                                  : "text-[#6B7280] hover:text-[#1F2937]"
                              }`}
                            >
                              Artigos / Lote
                            </button>
                            <button
                              type="button"
                              onClick={() => setBatchMode("count")}
                              className={`text-[11px] font-bold py-2 rounded-lg transition cursor-pointer font-sans text-center ${
                                batchMode === "count"
                                  ? "bg-blue-50 text-blue-700 font-extrabold border border-blue-150"
                                  : "text-[#6B7280] hover:text-[#1F2937]"
                              }`}
                            >
                              Qtde. de Lotes
                            </button>
                          </div>
                        </div>

                        {/* Dynamic Inputs */}
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-[#4B5563] font-sans">3. Parâmetro de Divisão</label>
                          {batchMode === "size" ? (
                            <div className="space-y-1.5 bg-white border border-[#E5E7EB] rounded-xl p-2.5 shadow-sm">
                              <div className="flex items-center justify-between text-[11px] font-sans">
                                <span className="font-semibold text-[#1F2937]">Limite por Lote:</span>
                                <span className="font-mono font-extrabold text-[#3B82F6]">
                                  {batchSize} artigos
                                </span>
                              </div>
                              <input
                                type="range"
                                min="1"
                                max="100"
                                step="1"
                                value={batchSize}
                                onChange={(e) => setBatchSize(parseInt(e.target.value, 10))}
                                className="w-full accent-[#3B82F6] cursor-pointer"
                              />
                            </div>
                          ) : (
                            <div className="space-y-1.5 bg-white border border-[#E5E7EB] rounded-xl p-2.5 shadow-sm">
                              <div className="flex items-center justify-between text-[11px] font-sans">
                                <span className="font-semibold text-[#1F2937]">Lotes Totais:</span>
                                <span className="font-mono font-extrabold text-[#3B82F6]">
                                  {batchCount} arquivos
                                </span>
                              </div>
                              <input
                                type="range"
                                min="1"
                                max="50"
                                step="1"
                                value={batchCount}
                                onChange={(e) => setBatchCount(parseInt(e.target.value, 10))}
                                className="w-full accent-[#3B82F6] cursor-pointer"
                              />
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Calculations & Action wrapper */}
                      {(() => {
                        const totalRefs = batchSourceSelect === "cleaned" ? filteredCleanedItems.length : filteredAllItems.length;
                        let finalLotes = 0;
                        let finalArtigos = 0;

                        if (totalRefs > 0) {
                          if (batchMode === "size") {
                            finalArtigos = Math.max(1, batchSize);
                            finalLotes = Math.ceil(totalRefs / finalArtigos);
                          } else {
                            finalLotes = Math.max(1, Math.min(batchCount, totalRefs));
                            finalArtigos = Math.ceil(totalRefs / finalLotes);
                          }
                        }

                        return (
                          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white border border-[#E5E7EB] rounded-2xl p-4 shadow-sm">
                            <div className="flex items-center gap-6 text-xs font-sans">
                              <div className="text-left">
                                <p className="text-[10px] uppercase font-bold text-[#6B7280] tracking-wider font-mono">Total Selecionado</p>
                                <p className="text-lg font-extrabold text-[#1F2937] font-mono">{totalRefs}</p>
                              </div>
                              <div className="w-px h-8 bg-[#E5E7EB]" />
                              <div className="text-left">
                                <p className="text-[10px] uppercase font-bold text-[#6B7280] tracking-wider font-mono">Arquivos no ZIP</p>
                                <p className="text-lg font-extrabold text-[#3B82F6] font-mono">{finalLotes} txt</p>
                              </div>
                              <div className="w-px h-8 bg-[#E5E7EB]" />
                              <div className="text-left">
                                <p className="text-[10px] uppercase font-bold text-[#6B7280] tracking-wider font-mono">Tamanho Estimado</p>
                                <p className="text-xs font-bold text-emerald-600 font-sans">
                                  {finalLotes > 0 ? `~ ${finalArtigos} artigos/txt` : "N/D"}
                                </p>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={handleGenerateLLMBatches}
                              disabled={totalRefs === 0}
                              className="w-full sm:w-auto bg-[#3B82F6] hover:bg-[#2563EB] disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white text-xs font-bold py-3 px-6 rounded-xl transition flex items-center justify-center gap-2 cursor-pointer font-sans shadow-sm"
                            >
                              <Download className="w-4 h-4" />
                              <span>Gerar e Baixar Lotes (.ZIP)</span>
                            </button>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
