import { useState, useEffect } from "react";
import { ColumnMapping } from "./types";
import { autoDetectColumnMapping } from "./core/detection";
import { exportCleanedCsv } from "./core/exportService";
import { exportToBibtex } from "./core/bibtexExporter";

import { useToast } from "./hooks/useToast";
import { useReferenceWorkspace } from "./hooks/useReferenceWorkspace";
import { useDeduplication } from "./hooks/useDeduplication";
import { useClusterManager } from "./hooks/useClusterManager";
import { useReferenceFilters } from "./hooks/useReferenceFilters";

import { Header } from "./components/Header";
import { ToastContainer } from "./components/ToastContainer";
import { FileUploaderCard } from "./components/sidebar/FileUploaderCard";
import { ColumnMappingCard } from "./components/sidebar/ColumnMappingCard";
import { SettingsCard } from "./components/sidebar/SettingsCard";
import { TemporalFilterCard } from "./components/sidebar/TemporalFilterCard";
import { StatsBar } from "./components/dashboard/StatsBar";
import { SearchBar } from "./components/dashboard/SearchBar";
import { EmptyState } from "./components/dashboard/EmptyState";
import { CleanedTable } from "./components/dashboard/CleanedTable";
import { DuplicateGroupsView } from "./components/dashboard/DuplicateGroupsView";
import { AllRecordsTable } from "./components/dashboard/AllRecordsTable";
import { LLMBatchSection } from "./components/dashboard/LLMBatchSection";
import { RefreshCw } from "lucide-react";

export default function App() {
  const { notifications, showNotification, dismissNotification } = useToast();

  // Deduplication options state
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({
    titleColumn: "",
    yearColumn: "",
    authorsColumn: "",
    doiColumn: "",
    abstractColumn: "",
  });
  const [threshold, setThreshold] = useState<number>(0.95);
  const [matchDoi, setMatchDoi] = useState<boolean>(true);
  const [parentRule, setParentRule] = useState<"first" | "completeness">("completeness");
  const [activeTab, setActiveTab] = useState<"cleaned" | "duplicates" | "all">("cleaned");
  const [duplicateSortOrder, setDuplicateSortOrder] = useState<"none" | "asc" | "desc">("none");

  // File workspace management hook
  const {
    uploadedFiles,
    rawRows,
    headers,
    fileName,
    isParsing,
    handleFileUpload,
    handleLoadSample,
    handleDeleteFile,
    handleClearAll,
  } = useReferenceWorkspace({
    onNotify: showNotification,
    onResetOverrides: () => resetOverrides(),
  });

  // Automatically detect column mappings when headers change
  useEffect(() => {
    if (headers.length > 0) {
      const detected = autoDetectColumnMapping(headers);
      setColumnMapping(detected);
    }
  }, [headers]);

  // Background Web Worker deduplication hook
  const { baseItems, baseGroups, loading } = useDeduplication({
    rawRows,
    columnMapping,
    threshold,
    matchDoi,
    parentRule,
    onNotify: showNotification,
  });

  // In-memory manual keep and survivor promotion manager
  const {
    resolvedItems,
    resolvedGroups,
    handleToggleKeep,
    handlePromoteItem,
    resetOverrides,
  } = useClusterManager(baseItems, baseGroups);

  // Multi-criteria filtering (search term, year period, histogram)
  const {
    searchTerm,
    setSearchTerm,
    startYear,
    setStartYear,
    endYear,
    setEndYear,
    clearYearRange,
    selectedYears,
    yearCounts,
    handleToggleYear,
    handleSelectAllYears,
    handleClearAllYears,
    filteredCleanedItems,
    filteredDuplicateGroups,
    filteredAllItems,
  } = useReferenceFilters({
    items: resolvedItems,
    groups: resolvedGroups,
    duplicateSortOrder,
  });

  // Export CSV with sanitization and memory safety
  const handleExport = () => {
    if (filteredCleanedItems.length === 0) {
      showNotification("warning", "Nenhuma referência única encontrada para exportação.");
      return;
    }

    try {
      exportCleanedCsv(filteredCleanedItems, fileName);
      showNotification(
        "success",
        `Exportadas ${filteredCleanedItems.length} referências limpas com sucesso.`
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Falha na exportação";
      showNotification("error", `Erro ao exportar CSV: ${msg}`);
    }
  };

  // Export BibTeX with standardized keys and full attribute retention
  const handleExportBibtex = () => {
    if (filteredCleanedItems.length === 0) {
      showNotification("warning", "Nenhuma referência única encontrada para exportação.");
      return;
    }

    try {
      const records = filteredCleanedItems.map((item) => ({
        row: item.originalRow as Record<string, string>,
        originalId: item.id,
      }));
      const bibContent = exportToBibtex(records);
      const blob = new Blob([bibContent], { type: "application/x-bibtex;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const baseName = fileName.replace(/\.(csv|bib|tex|bibtex)$/i, "");
      link.href = url;
      link.setAttribute("download", `${baseName || "referencias"}_unicas.bib`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 100);

      showNotification(
        "success",
        `Exportadas ${filteredCleanedItems.length} referências em BibTeX (.bib) com sucesso.`
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Falha na exportação BibTeX";
      showNotification("error", `Erro ao exportar BibTeX: ${msg}`);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#1F2937] flex flex-col font-sans selection:bg-[#E5E7EB]">
      <ToastContainer notifications={notifications} onDismiss={dismissNotification} />

      <Header
        onClearAll={handleClearAll}
        hasFiles={uploadedFiles.length > 0}
      />

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left Sidebar Control Panel */}
        <aside className="w-full lg:w-[420px] bg-white border-b lg:border-b-0 lg:border-r border-[#E5E7EB] overflow-y-auto p-5 space-y-5 shrink-0">
          <FileUploaderCard
            uploadedFiles={uploadedFiles}
            isParsing={isParsing}
            onFileUpload={handleFileUpload}
            onLoadSample={handleLoadSample}
            onDeleteFile={handleDeleteFile}
          />

          {rawRows.length > 0 && (
            <>
              <ColumnMappingCard
                headers={headers}
                mapping={columnMapping}
                onChangeMapping={setColumnMapping}
              />

              <SettingsCard
                threshold={threshold}
                matchDoi={matchDoi}
                parentRule={parentRule}
                onChangeThreshold={setThreshold}
                onChangeMatchDoi={setMatchDoi}
                onChangeParentRule={setParentRule}
              />

              <TemporalFilterCard
                startYear={startYear}
                endYear={endYear}
                onStartYearChange={setStartYear}
                onEndYearChange={setEndYear}
                onClearRange={clearYearRange}
                yearCounts={yearCounts}
                selectedYears={selectedYears}
                onToggleYear={handleToggleYear}
                onSelectAllYears={handleSelectAllYears}
                onClearAllYears={handleClearAllYears}
              />
            </>
          )}
        </aside>

        {/* Right Dashboard Area */}
        <main className="flex-1 flex flex-col min-w-0 bg-[#F8F9FA]">
          {rawRows.length === 0 ? (
            <EmptyState onLoadSample={handleLoadSample} />
          ) : (
            <>
              <StatsBar
                totalCount={filteredAllItems.length}
                uniqueCount={filteredCleanedItems.length}
                duplicateCount={filteredAllItems.filter((i) => i.isDuplicate).length}
                activeTab={activeTab}
                onTabChange={setActiveTab}
                duplicateGroupsCount={filteredDuplicateGroups.length}
                startYear={startYear}
                endYear={endYear}
                onExportCsv={handleExport}
                onExportBibtex={handleExportBibtex}
                isExportDisabled={filteredCleanedItems.length === 0}
              />

              <SearchBar
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                selectedYearsCount={selectedYears.length}
                totalYearsCount={Object.keys(yearCounts).length}
              />

              <div className="flex-1 overflow-y-auto p-6">
                {loading ? (
                  <div className="h-full flex flex-col items-center justify-center space-y-3 py-16">
                    <RefreshCw className="w-8 h-8 text-[#2563EB] animate-spin" />
                    <p className="text-sm font-semibold text-[#6B7280] font-sans">
                      Analisando similaridades em segundo plano...
                    </p>
                  </div>
                ) : (
                  <>
                    {activeTab === "cleaned" && <CleanedTable items={filteredCleanedItems} />}

                    {activeTab === "duplicates" && (
                      <DuplicateGroupsView
                        groups={filteredDuplicateGroups}
                        sortOrder={duplicateSortOrder}
                        onSortOrderChange={setDuplicateSortOrder}
                        onToggleKeep={handleToggleKeep}
                        onPromoteItem={handlePromoteItem}
                      />
                    )}

                    {activeTab === "all" && (
                      <AllRecordsTable
                        items={filteredAllItems}
                        onToggleKeep={handleToggleKeep}
                      />
                    )}

                    <LLMBatchSection
                      cleanedItems={filteredCleanedItems}
                      allItems={filteredAllItems}
                      abstractColumn={columnMapping.abstractColumn}
                      onNotify={showNotification}
                    />
                  </>
                )}
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
