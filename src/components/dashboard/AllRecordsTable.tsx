import React from "react";
import { BookOpen } from "lucide-react";
import { ReferenceItem } from "../../types";
import { Pagination } from "../common/Pagination";
import { usePagination } from "../../hooks/usePagination";

interface AllRecordsTableProps {
  items: ReferenceItem[];
  onToggleKeep: (itemId: string, keep: boolean) => void;
}

export const AllRecordsTable: React.FC<AllRecordsTableProps> = ({
  items,
  onToggleKeep,
}) => {
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
        <p className="text-sm font-semibold text-[#1F2937]">Nenhuma referência encontrada para os filtros ativos.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-[#E5E7EB] overflow-hidden shadow-xs">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#F8F9FA] border-b border-[#E5E7EB] text-[10px] font-bold text-[#6B7280] uppercase tracking-wider font-sans">
              <th className="py-3 px-4 w-20">ID</th>
              <th className="py-3 px-4 w-36">Origem / Base</th>
              <th className="py-3 px-4">Título</th>
              <th className="py-3 px-3 w-32">Status</th>
              <th className="py-3 px-4 w-28">Ação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs font-sans text-[#1F2937]">
            {paginatedItems.map((item) => (
              <tr key={item.id} className="hover:bg-slate-50/50 transition">
                <td className="py-3 px-4 font-mono font-medium text-[#6B7280]">
                  {item.id}
                </td>
                <td className="py-3 px-4">
                  <span
                    className="bg-blue-50 text-[#2563EB] border border-blue-100 text-[10px] font-bold px-2 py-0.5 rounded-lg inline-block truncate max-w-[140px]"
                    title={item.sourceFile}
                  >
                    {item.sourceFile || "N/A"}
                  </span>
                </td>
                <td className="py-3 px-4 pr-6 max-w-md">
                  <div className="font-semibold text-[#1F2937]">{item.title}</div>
                  <div className="text-[10px] text-[#6B7280] font-mono mt-0.5 truncate">
                    ano: {item.cleanYear} | doi: {item.doi || "N/D"}
                  </div>
                </td>
                <td className="py-3 px-3">
                  {item.isDuplicate ? (
                    <span className="bg-rose-50 text-rose-700 border border-rose-100 text-[10px] font-bold px-2 py-0.5 rounded-full inline-block">
                      Duplicata
                    </span>
                  ) : (
                    <span className="bg-[#D1FAE5] text-[#065F46] border border-[#10B981]/25 text-[10px] font-bold px-2 py-0.5 rounded-full inline-block">
                      Único
                    </span>
                  )}
                </td>
                <td className="py-3 px-4">
                  <button
                    onClick={() => onToggleKeep(item.id, !item.keep)}
                    className={`px-3 py-1.5 text-[10px] font-bold rounded-xl transition shrink-0 cursor-pointer font-sans border ${
                      item.keep
                        ? "bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-100"
                        : "bg-[#F3F4F6] hover:bg-[#E5E7EB] border-[#E5E7EB] text-[#1F2937]"
                    }`}
                    type="button"
                  >
                    {item.keep ? "Descartar" : "Preservar"}
                  </button>
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
        itemLabel="registros totais"
      />
    </div>
  );
};
