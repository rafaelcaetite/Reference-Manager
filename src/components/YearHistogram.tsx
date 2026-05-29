/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";

interface YearHistogramProps {
  yearCounts: { [year: string]: number };
  selectedYears: string[];
  onToggleYear: (year: string) => void;
  onSelectAllYears: () => void;
  onClearAllYears: () => void;
}

export default function YearHistogram({
  yearCounts,
  selectedYears,
  onToggleYear,
  onSelectAllYears,
  onClearAllYears,
}: YearHistogramProps) {
  const sortedYears = Object.keys(yearCounts).sort((a, b) => {
    const numA = parseInt(a, 10);
    const numB = parseInt(b, 10);
    if (isNaN(numA)) return 1;
    if (isNaN(numB)) return -1;
    return numA - numB;
  });

  const maxCount = Math.max(...Object.values(yearCounts), 1);

  if (sortedYears.length === 0) {
    return (
      <div className="text-center py-6 text-slate-400 text-sm font-sans" id="no-years-display">
        Nenhum dado de ano disponível. Carregue um arquivo para visualizar a distribuição temporal.
      </div>
    );
  }

  return (
    <div className="space-y-4" id="year-histogram-container">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider font-sans">
          Filtro e Distribuição por Ano
        </label>
        <div className="flex gap-2">
          <button
            onClick={onSelectAllYears}
            className="text-[11px] font-semibold text-[#3B82F6] hover:text-[#2563EB] transition font-sans cursor-pointer"
            type="button"
            id="btn-select-all-years"
          >
            Todos
          </button>
          <span className="text-[#E5E7EB] text-xs">|</span>
          <button
            onClick={onClearAllYears}
            className="text-[11px] font-semibold text-[#6B7280] hover:text-[#1F2937] transition font-sans cursor-pointer"
            type="button"
            id="btn-clear-all-years"
          >
            Nenhum
          </button>
        </div>
      </div>

      <div className="flex items-end gap-1.5 h-28 pt-2 overflow-x-auto border-b border-slate-100 pb-1" id="years-chart-row">
        {sortedYears.map((year) => {
          const count = yearCounts[year];
          const heightPercent = (count / maxCount) * 100;
          const isSelected = selectedYears.includes(year);

          return (
            <div
              key={year}
              className="flex-1 flex flex-col items-center min-w-[36px] cursor-pointer group"
              onClick={() => onToggleYear(year)}
              id={`year-bar-${year}`}
            >
              <div className="relative w-full flex items-end justify-center h-20">
                <div
                  style={{ height: `${heightPercent}%` }}
                  className={`w-full rounded-t transition-all duration-300 ${
                    isSelected
                      ? "bg-[#3B82F6] hover:bg-[#2563EB]"
                      : "bg-[#E5E7EB] hover:bg-[#D1D5DB]"
                  }`}
                />
                <span className="absolute bottom-full mb-1 text-[10px] font-bold font-mono px-1.5 py-0.5 rounded bg-[#1F2937] text-white opacity-0 group-hover:opacity-100 transition duration-150 pointer-events-none z-10 shadow-sm">
                  {count}
                </span>
              </div>
              <span
                className={`text-[10px] font-mono mt-1 px-1 py-0.5 rounded transition ${
                  isSelected ? "font-bold text-[#1F2937] bg-slate-100" : "text-[#6B7280]"
                }`}
              >
                {year}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
