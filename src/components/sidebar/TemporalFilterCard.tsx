import React from "react";
import { Trash2 } from "lucide-react";
import { YearHistogram } from "../YearHistogram";

interface TemporalFilterCardProps {
  startYear: string;
  endYear: string;
  onStartYearChange: (val: string) => void;
  onEndYearChange: (val: string) => void;
  onClearRange: () => void;
  yearCounts: Record<string, number>;
  selectedYears: string[];
  onToggleYear: (year: string) => void;
  onSelectAllYears: () => void;
  onClearAllYears: () => void;
}

export const TemporalFilterCard: React.FC<TemporalFilterCardProps> = ({
  startYear,
  endYear,
  onStartYearChange,
  onEndYearChange,
  onClearRange,
  yearCounts,
  selectedYears,
  onToggleYear,
  onSelectAllYears,
  onClearAllYears,
}) => {
  return (
    <div className="rounded-2xl border border-[#E5E7EB] p-4 bg-white space-y-4">
      {/* Year Inputs Range Filter */}
      <div className="space-y-2 border-b border-[#F3F4F6] pb-3">
        <label className="text-xs font-bold text-[#6B7280] uppercase tracking-wider font-sans block">
          4. Filtrar por Período de Publicação
        </label>
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <input
              type="text"
              maxLength={4}
              placeholder="Ano Início"
              value={startYear}
              onChange={(e) => onStartYearChange(e.target.value.replace(/\D/g, ""))}
              className="w-full text-xs border border-[#E5E7EB] rounded-xl px-2.5 py-1.5 bg-white text-[#1F2937] focus:border-[#2563EB] focus:outline-none font-mono text-center placeholder-[#9CA3AF]"
            />
          </div>
          <span className="text-xs text-[#6B7280] font-sans font-medium">até</span>
          <div className="flex-1">
            <input
              type="text"
              maxLength={4}
              placeholder="Ano Fim"
              value={endYear}
              onChange={(e) => onEndYearChange(e.target.value.replace(/\D/g, ""))}
              className="w-full text-xs border border-[#E5E7EB] rounded-xl px-2.5 py-1.5 bg-white text-[#1F2937] focus:border-[#2563EB] focus:outline-none font-mono text-center placeholder-[#9CA3AF]"
            />
          </div>
          {(startYear || endYear) && (
            <button
              onClick={onClearRange}
              className="p-1.5 text-[#6B7280] hover:text-rose-600 rounded-lg hover:bg-rose-50 transition cursor-pointer"
              title="Limpar período"
              type="button"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
        {(startYear || endYear) && (
          <p className="text-[10px] text-[#2563EB] font-semibold font-sans">
            * Filtrando: {startYear || "Início"} até {endYear || "Atualidade"}
          </p>
        )}
      </div>

      <YearHistogram
        yearCounts={yearCounts}
        selectedYears={selectedYears}
        onToggleYear={onToggleYear}
        onSelectAllYears={onSelectAllYears}
        onClearAllYears={onClearAllYears}
      />
    </div>
  );
};
