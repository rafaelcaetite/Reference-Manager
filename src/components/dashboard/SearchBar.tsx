import React from "react";
import { Search, Filter, X } from "lucide-react";

interface SearchBarProps {
  searchTerm: string;
  onSearchChange: (query: string) => void;
  selectedYearsCount: number;
  totalYearsCount: number;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  searchTerm,
  onSearchChange,
  selectedYearsCount,
  totalYearsCount,
}) => {
  return (
    <div className="bg-[#F8F9FA] px-6 py-3 shrink-0 flex items-center justify-between border-b border-[#E5E7EB]">
      <div className="relative w-full max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B7280]" />
        <input
          type="text"
          placeholder="Pesquisar por título, autor, DOI ou base de origem..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-9 pr-8 py-1.5 text-xs bg-white border border-[#E5E7EB] rounded-xl focus:border-[#2563EB] focus:outline-none font-sans text-[#1F2937] placeholder-[#6B7280]"
        />
        {searchTerm && (
          <button
            onClick={() => onSearchChange("")}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#6B7280] hover:text-[#1F2937] p-0.5 cursor-pointer"
            type="button"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <div className="text-xs text-[#6B7280] flex items-center gap-1.5 font-sans">
        <Filter className="w-3.5 h-3.5 text-[#6B7280]" />
        <span>
          Anos:{" "}
          <strong className="text-[#1F2937]">
            {selectedYearsCount === totalYearsCount ? "Todos" : `${selectedYearsCount}/${totalYearsCount}`}
          </strong>
        </span>
      </div>
    </div>
  );
};
