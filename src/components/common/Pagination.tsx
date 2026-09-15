import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange: (count: number) => void;
  itemLabel?: string;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  totalCount,
  itemsPerPage,
  onPageChange,
  onItemsPerPageChange,
  itemLabel = "registros",
}) => {
  if (totalCount === 0) return null;

  const startIdx = (currentPage - 1) * itemsPerPage + 1;
  const endIdx = Math.min(currentPage * itemsPerPage, totalCount);

  const renderPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push("...");

      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        if (!pages.includes(i)) pages.push(i);
      }

      if (currentPage < totalPages - 2) pages.push("...");
      if (!pages.includes(totalPages)) pages.push(totalPages);
    }

    return pages.map((page, idx) => {
      if (page === "...") {
        return (
          <span key={`ellipsis-${idx}`} className="px-1.5 text-xs text-[#6B7280] font-sans">
            ...
          </span>
        );
      }
      return (
        <button
          key={`page-${page}`}
          onClick={() => onPageChange(page as number)}
          className={`w-7 h-7 text-xs font-bold rounded-lg transition cursor-pointer ${
            currentPage === page
              ? "bg-[#2563EB] text-white shadow-xs"
              : "border border-[#E5E7EB] text-[#6B7280] hover:bg-slate-50 hover:text-[#1F2937]"
          }`}
          type="button"
        >
          {page}
        </button>
      );
    });
  };

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 bg-white border-t border-[#E5E7EB] select-none font-sans">
      <div className="text-xs text-[#6B7280]">
        Mostrando <span className="font-semibold text-[#1F2937]">{startIdx}</span> a{" "}
        <span className="font-semibold text-[#1F2937]">{endIdx}</span> de{" "}
        <span className="font-semibold text-[#1F2937]">{totalCount}</span> {itemLabel}
      </div>

      <div className="flex flex-wrap items-center gap-4 sm:gap-6">
        <div className="flex items-center gap-2 text-xs text-[#6B7280]">
          <span>Por página:</span>
          <select
            value={itemsPerPage}
            onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
            className="bg-white border border-[#E5E7EB] rounded-lg px-2 py-1 text-xs font-semibold text-[#1F2937] focus:outline-none focus:border-[#2563EB] cursor-pointer"
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="p-1.5 rounded-lg border border-[#E5E7EB] text-[#6B7280] hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-transparent disabled:cursor-not-allowed transition cursor-pointer"
            type="button"
            aria-label="Página anterior"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {renderPageNumbers()}

          <button
            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="p-1.5 rounded-lg border border-[#E5E7EB] text-[#6B7280] hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-transparent disabled:cursor-not-allowed transition cursor-pointer"
            type="button"
            aria-label="Próxima página"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
