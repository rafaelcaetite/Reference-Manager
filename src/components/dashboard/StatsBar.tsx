import React from "react";
import { Download, Filter } from "lucide-react";

interface StatsBarProps {
  totalCount: number;
  uniqueCount: number;
  duplicateCount: number;
  activeTab: "cleaned" | "duplicates" | "all";
  onTabChange: (tab: "cleaned" | "duplicates" | "all") => void;
  duplicateGroupsCount: number;
  startYear?: string;
  endYear?: string;
  onExportCsv: () => void;
  onExportBibtex?: () => void;
  isExportDisabled: boolean;
}

export const StatsBar: React.FC<StatsBarProps> = ({
  totalCount,
  uniqueCount,
  duplicateCount,
  activeTab,
  onTabChange,
  duplicateGroupsCount,
  startYear,
  endYear,
  onExportCsv,
  onExportBibtex,
  isExportDisabled,
}) => {
  return (
    <div className="bg-white border-b border-[#E5E7EB] px-6 py-4 flex flex-wrap items-center justify-between gap-4 select-none shrink-0 shadow-xs">
      <div className="flex flex-col gap-2">
        {(startYear || endYear) && (
          <div className="flex items-center gap-2">
            <span className="bg-blue-50 text-[#2563EB] border border-blue-100 text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 font-mono">
              <Filter className="w-3 h-3 text-[#2563EB]" />
              {startYear || "Mín"}-{endYear || "Máx"}
            </span>
            <span className="text-[10px] text-[#6B7280] font-sans font-medium">
              (Filtro temporal ativo)
            </span>
          </div>
        )}

        <div className="flex gap-4 sm:gap-6">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider font-sans">
              Registros Totais
            </span>
            <span className="text-lg font-extrabold text-[#1F2937] font-mono">{totalCount}</span>
          </div>

          <div className="w-px h-8 bg-[#E5E7EB]" />

          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider font-sans">
              Registros Únicos
            </span>
            <span className="text-lg font-extrabold text-[#2563EB] font-mono">{uniqueCount}</span>
          </div>

          <div className="w-px h-8 bg-[#E5E7EB]" />

          <div className="flex flex-col text-[#6B7280]">
            <span className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider font-sans">
              Duplicatas
            </span>
            <span className="text-lg font-extrabold text-rose-600 font-mono">{duplicateCount}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="bg-[#F3F4F6] p-0.5 rounded-xl flex">
          <button
            onClick={() => onTabChange("cleaned")}
            className={`text-xs font-bold px-3 py-1.5 rounded-lg transition cursor-pointer font-sans ${
              activeTab === "cleaned"
                ? "bg-white text-[#1F2937] shadow-xs"
                : "text-[#6B7280] hover:text-[#1F2937]"
            }`}
            type="button"
          >
            Únicas ({uniqueCount})
          </button>
          <button
            onClick={() => onTabChange("duplicates")}
            className={`text-xs font-bold px-3 py-1.5 rounded-lg transition cursor-pointer font-sans ${
              activeTab === "duplicates"
                ? "bg-white text-[#1F2937] shadow-xs"
                : "text-[#6B7280] hover:text-[#1F2937]"
            }`}
            type="button"
          >
            Duplicatas ({duplicateGroupsCount} grupos)
          </button>
          <button
            onClick={() => onTabChange("all")}
            className={`text-xs font-bold px-3 py-1.5 rounded-lg transition cursor-pointer font-sans ${
              activeTab === "all"
                ? "bg-white text-[#1F2937] shadow-xs"
                : "text-[#6B7280] hover:text-[#1F2937]"
            }`}
            type="button"
          >
            Todos ({totalCount})
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onExportCsv}
            disabled={isExportDisabled}
            className="bg-[#2563EB] hover:bg-[#1D4ED8] disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white text-xs font-bold px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 shadow-xs cursor-pointer font-sans"
            type="button"
            title="Exportar referências únicas em formato CSV sanitizado"
          >
            <Download className="w-4 h-4" />
            <span>Exportar CSV</span>
          </button>

          {onExportBibtex && (
            <button
              onClick={onExportBibtex}
              disabled={isExportDisabled}
              className="bg-white hover:bg-slate-50 border border-[#E5E7EB] hover:border-slate-300 disabled:bg-slate-100 disabled:text-slate-400 disabled:border-slate-200 disabled:cursor-not-allowed text-[#1F2937] text-xs font-bold px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 shadow-xs cursor-pointer font-sans"
              type="button"
              title="Exportar referências únicas em formato BibTeX padronizado (.bib)"
            >
              <Download className="w-4 h-4 text-purple-600" />
              <span>Exportar .bib</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
