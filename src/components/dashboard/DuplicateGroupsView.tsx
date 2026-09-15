import React from "react";
import { CheckCircle, Sliders, Star, Check, Trash2, Calendar, Users } from "lucide-react";
import { DuplicateGroup } from "../../types";
import { Pagination } from "../common/Pagination";
import { usePagination } from "../../hooks/usePagination";

interface DuplicateGroupsViewProps {
  groups: DuplicateGroup[];
  sortOrder: "none" | "asc" | "desc";
  onSortOrderChange: (order: "none" | "asc" | "desc") => void;
  onToggleKeep: (itemId: string, keep: boolean) => void;
  onPromoteItem: (groupId: string, itemId: string) => void;
}

export const DuplicateGroupsView: React.FC<DuplicateGroupsViewProps> = ({
  groups,
  sortOrder,
  onSortOrderChange,
  onToggleKeep,
  onPromoteItem,
}) => {
  const {
    currentPage,
    setCurrentPage,
    itemsPerPage,
    setItemsPerPage,
    totalPages,
    paginatedItems,
    totalCount,
  } = usePagination(groups, 10);

  if (groups.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-[#E5E7EB] py-16 text-center text-[#6B7280] space-y-2 font-sans shadow-xs">
        <CheckCircle className="w-10 h-10 mx-auto text-[#10B981]" />
        <p className="text-sm font-semibold text-[#1F2937]">Nenhuma duplicata identificada!</p>
        <p className="text-xs text-[#6B7280]">
          Todas as referências são únicas para os parâmetros e filtros selecionados.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Sorting Bar */}
      <div className="flex items-center justify-between bg-white rounded-2xl border border-[#E5E7EB] p-4 shadow-xs font-sans">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-[#2563EB]" />
          <span className="text-xs font-bold text-[#1F2937]">Organização das Duplicatas</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-[#6B7280]">
          <span>Grau de similaridade:</span>
          <select
            value={sortOrder}
            onChange={(e) => onSortOrderChange(e.target.value as "none" | "asc" | "desc")}
            className="bg-[#F8F9FA] border border-[#E5E7EB] rounded-lg px-2.5 py-1 text-xs font-bold text-[#1F2937] focus:outline-none focus:border-[#2563EB] cursor-pointer"
          >
            <option value="none">Padrão (Ordem de leitura)</option>
            <option value="desc">Maior similaridade primeiro</option>
            <option value="asc">Menor similaridade primeiro</option>
          </select>
        </div>
      </div>

      {/* Duplicate Cluster Cards */}
      <div className="space-y-4">
        {paginatedItems.map((group) => (
          <div
            key={group.id}
            className="bg-white rounded-2xl border border-[#E5E7EB] overflow-hidden shadow-xs flex flex-col"
          >
            {/* Group Header */}
            <div className="bg-[#F8F9FA] px-5 py-3 border-b border-[#E5E7EB] flex flex-wrap items-center justify-between gap-3 font-sans">
              <div className="flex items-center gap-2">
                <span className="bg-[#1F2937] text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full font-mono uppercase">
                  Grupo {group.pivot.id}
                </span>
                <span className="text-xs font-semibold text-[#6B7280]">
                  {group.duplicates.length + 1} referências correlatas identificadas
                </span>
              </div>
            </div>

            {/* Pivot and Duplicates Container */}
            <div className="divide-y divide-[#E5E7EB]">
              {/* Pivot Record (Survivor) */}
              <div className="p-5 bg-blue-50/15 flex flex-col md:flex-row md:items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-amber-50 border border-amber-200 text-amber-500 flex items-center justify-center shrink-0 self-start mt-1">
                  <Star className="w-4 h-4 fill-amber-300 text-amber-500" />
                </div>

                <div className="flex-1 space-y-1.5 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="bg-amber-100 text-amber-900 text-[10px] font-extrabold px-2 py-0.5 rounded uppercase font-sans">
                      Representante Único (Preservado)
                    </span>
                    <span
                      className="text-[10px] bg-blue-50 text-[#2563EB] border border-blue-100 px-2 py-0.5 rounded font-bold max-w-[150px] truncate"
                      title={group.pivot.sourceFile}
                    >
                      {group.pivot.sourceFile || "N/A"}
                    </span>
                    <span className="text-xs font-bold text-[#6B7280] font-mono">
                      {group.pivot.completenessScore} pts metadados
                    </span>
                    {group.pivot.doi && (
                      <span className="text-[10px] bg-slate-100 text-[#1F2937] px-2 py-0.5 rounded font-mono truncate">
                        DOI: {group.pivot.doi}
                      </span>
                    )}
                  </div>

                  <h3 className="text-sm font-bold text-[#1F2937] leading-snug">
                    {group.pivot.title}
                  </h3>

                  <div className="flex items-center gap-x-4 gap-y-1 text-xs text-[#6B7280] flex-wrap font-sans">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-[#6B7280]" />
                      Ano {group.pivot.cleanYear}
                    </span>
                    <span className="flex items-center gap-1 truncate max-w-xs">
                      <Users className="w-3.5 h-3.5 text-[#6B7280]" />
                      {group.pivot.authors || "Sem autores informados"}
                    </span>
                  </div>
                </div>

                <div className="shrink-0 self-center">
                  <span className="bg-[#D1FAE5] text-[#065F46] text-xs px-3 py-1.5 rounded-full font-bold flex items-center gap-1.5 border border-[#10B981]/25">
                    <Check className="w-4 h-4" /> Ativo
                  </span>
                </div>
              </div>

              {/* Duplicates in Group */}
              {group.duplicates.map((dup) => {
                const pcent = (dup.similarityToParent * 100).toFixed(0);

                return (
                  <div
                    key={dup.id}
                    className="p-5 bg-white flex flex-col md:flex-row md:items-start gap-4 transition hover:bg-slate-50/30"
                  >
                    <button
                      onClick={() => onToggleKeep(dup.id, !dup.keep)}
                      className={`w-8 h-8 rounded-full border flex items-center justify-center shrink-0 self-start mt-1 transition cursor-pointer ${
                        dup.keep
                          ? "bg-[#1F2937] border-[#1F2937] text-white"
                          : "bg-slate-100 border-[#E5E7EB] text-[#6B7280] hover:border-[#2563EB] hover:text-[#2563EB]"
                      }`}
                      title={dup.keep ? "Registro preservado. Clique para descartar." : "Registro descartado. Clique para preservar."}
                      type="button"
                    >
                      {dup.keep ? <Check className="w-4 h-4" /> : <Trash2 className="w-4 h-4" />}
                    </button>

                    <div className="flex-1 space-y-1.5 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="bg-rose-50 text-rose-700 text-[10px] font-bold px-2 py-0.5 rounded font-sans border border-rose-100">
                          Duplicata ({pcent}% similaridade)
                        </span>
                        <span
                          className="text-[10px] bg-blue-50 text-[#2563EB] border border-blue-100 px-2 py-0.5 rounded font-bold max-w-[150px] truncate"
                          title={dup.sourceFile}
                        >
                          {dup.sourceFile || "N/A"}
                        </span>
                        <span className="text-xs font-semibold text-[#6B7280] font-mono">
                          {dup.completenessScore} pts {dup.keep && "(Preservado)"}
                        </span>
                        {dup.doi && (
                          <span className="text-[10px] bg-slate-100 text-[#6B7280] px-2 py-0.5 rounded font-mono truncate">
                            DOI: {dup.doi}
                          </span>
                        )}
                      </div>

                      <h3
                        className={`text-sm font-medium ${
                          dup.keep ? "text-[#1F2937]" : "text-[#1F2937]/40 line-through"
                        } leading-snug`}
                      >
                        {dup.title}
                      </h3>

                      <div className="flex items-center gap-x-4 gap-y-1 text-xs text-[#6B7280] flex-wrap font-sans">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-300" />
                          Ano {dup.cleanYear}
                        </span>
                        <span className="flex items-center gap-1 truncate max-w-xs">
                          <Users className="w-3.5 h-3.5 text-slate-300" />
                          {dup.authors || "Sem autores"}
                        </span>
                      </div>
                    </div>

                    <div className="shrink-0 self-center">
                      <button
                        onClick={() => onPromoteItem(group.id, dup.id)}
                        className="text-xs font-semibold px-3 py-1.5 bg-white hover:bg-[#F8F9FA] border border-[#E5E7EB] hover:border-[#2563EB] text-[#1F2937] rounded-xl transition cursor-pointer font-sans"
                        type="button"
                      >
                        Tornar Representante
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalCount={totalCount}
        itemsPerPage={itemsPerPage}
        onPageChange={setCurrentPage}
        onItemsPerPageChange={setItemsPerPage}
        itemLabel="grupos de duplicatas"
      />
    </div>
  );
};
