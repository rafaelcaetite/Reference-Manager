import React from "react";
import { BookOpen } from "lucide-react";
import { ReferenceItem } from "../../types";
import { Pagination } from "../common/Pagination";
import { usePagination } from "../../hooks/usePagination";

interface CleanedTableProps {
  items: ReferenceItem[];
}

export const CleanedTable: React.FC<CleanedTableProps> = ({ items }) => {
  const {
    currentPage,
    setCurrentPage,
    itemsPerPage,
    setItemsPerPage,
    totalPages,
    paginatedItems,
    totalCount,
  } = usePagination(items, 10);

  if (items.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-[#E5E7EB] py-16 text-center text-[#6B7280] space-y-2 font-sans shadow-xs">
        <BookOpen className="w-10 h-10 mx-auto text-[#D1D5DB]" />
        <p className="text-sm font-semibold text-[#1F2937]">Nenhum registro único atende à busca ou aos filtros.</p>
        <p className="text-xs text-[#6B7280]">Tente ajustar a busca ou ampliar a seleção temporal.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-[#E5E7EB] overflow-hidden shadow-xs">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#F8F9FA] border-b border-[#E5E7EB] text-[10px] font-bold text-[#6B7280] uppercase tracking-wider font-sans">
              <th className="py-3 px-4 w-20">Ano</th>
              <th className="py-3 px-4 w-36">Origem / Base</th>
              <th className="py-3 px-4">Título Original</th>
              <th className="py-3 px-4 w-48">Autores</th>
              <th className="py-3 px-4 w-40">DOI</th>
              <th className="py-3 px-4 w-28">Metadados</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs font-sans text-[#1F2937]">
            {paginatedItems.map((item) => (
              <tr key={item.id} className="hover:bg-slate-50/50 transition">
                <td className="py-3 px-4 font-mono font-semibold text-[#6B7280]">
                  {item.cleanYear}
                </td>
                <td className="py-3 px-4">
                  <span
                    className="bg-blue-50 text-[#2563EB] border border-blue-100 text-[10px] font-bold px-2 py-0.5 rounded-lg inline-block truncate max-w-[140px]"
                    title={item.sourceFile}
                  >
                    {item.sourceFile || "N/A"}
                  </span>
                </td>
                <td className="py-3 px-4 pr-6 max-w-sm">
                  <div className="font-semibold text-[#1F2937] leading-snug">{item.title}</div>
                  {item.normalizedTitle !== item.title.toLowerCase().trim() && (
                    <div
                      className="text-[10px] text-[#6B7280] font-mono mt-0.5 truncate"
                      title="Título normalizado"
                    >
                      norm: {item.normalizedTitle}
                    </div>
                  )}
                </td>
                <td className="py-3 px-4 text-[#6B7280] italic max-w-[180px] break-words">
                  {item.authors || <span className="text-slate-300">N/A</span>}
                </td>
                <td className="py-3 px-4 font-mono text-[#6B7280] max-w-[150px] truncate">
                  {item.doi ? (
                    <span className="text-[#2563EB] hover:underline cursor-pointer" title={item.doi}>
                      {item.doi}
                    </span>
                  ) : (
                    <span className="text-slate-300">N/A</span>
                  )}
                </td>
                <td className="py-3 px-4">
                  <span className="bg-slate-100 text-[#1F2937] text-[10px] font-bold px-2 py-0.5 rounded-full font-mono">
                    {item.completenessScore} pts
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalCount={totalCount}
        itemsPerPage={itemsPerPage}
        onPageChange={setCurrentPage}
        onItemsPerPageChange={setItemsPerPage}
        itemLabel="referências únicas"
      />
    </div>
  );
};
