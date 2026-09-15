import React, { useRef } from "react";

interface YearHistogramProps {
  yearCounts: Record<string, number>;
  selectedYears: string[];
  onToggleYear: (year: string) => void;
  onSelectAllYears: () => void;
  onClearAllYears: () => void;
}

export const YearHistogram: React.FC<YearHistogramProps> = ({
  yearCounts,
  selectedYears,
  onToggleYear,
  onSelectAllYears,
  onClearAllYears,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

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
      <div className="text-center py-6 text-slate-400 text-xs font-sans">
        Nenhum dado temporal disponível.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider font-sans">
          Distribuição por Ano
        </label>
        <div className="flex items-center gap-2">
          <button
            onClick={onSelectAllYears}
            className="text-[11px] font-semibold text-[#2563EB] hover:text-[#1D4ED8] transition font-sans cursor-pointer"
            type="button"
          >
            Todos
          </button>
          <span className="text-[#E5E7EB] text-xs">|</span>
          <button
            onClick={onClearAllYears}
            className="text-[11px] font-semibold text-[#6B7280] hover:text-[#1F2937] transition font-sans cursor-pointer"
            type="button"
          >
            Nenhum
          </button>
        </div>
      </div>

      <div
        ref={scrollContainerRef}
        className="flex items-end gap-1.5 h-28 pt-2 overflow-x-auto border-b border-slate-100 pb-1 scroll-smooth"
      >
        {sortedYears.map((year) => {
          const count = yearCounts[year];
          const heightPercent = (count / maxCount) * 100;
          const isSelected = selectedYears.includes(year);

          return (
            <div
              key={year}
              className="flex-1 flex flex-col items-center min-w-[36px] cursor-pointer group select-none"
              onClick={() => onToggleYear(year)}
            >
              <div className="relative w-full flex items-end justify-center h-20">
                <div
                  style={{ height: `${heightPercent}%` }}
                  className={`w-full rounded-t transition-all duration-200 ${
                    isSelected
                      ? "bg-[#2563EB] hover:bg-[#1D4ED8]"
                      : "bg-[#E5E7EB] hover:bg-[#D1D5DB]"
                  }`}
                />
                <span className="absolute bottom-full mb-1 text-[10px] font-bold font-mono px-1.5 py-0.5 rounded bg-[#1F2937] text-white opacity-0 group-hover:opacity-100 transition duration-150 pointer-events-none z-10 shadow-xs">
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
};

export default YearHistogram;
