import React from "react";
import { BookOpen } from "lucide-react";

interface HeaderProps {
  onClearAll: () => void;
  hasFiles: boolean;
}

export const Header: React.FC<HeaderProps> = ({ onClearAll, hasFiles }) => {
  return (
    <header className="bg-white border-b border-[#E5E7EB] px-6 py-4 shrink-0 flex items-center justify-between shadow-xs">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-[#2563EB] rounded-xl flex items-center justify-center text-white shadow-xs">
          <BookOpen className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-base font-bold text-[#1F2937] tracking-tight flex items-center gap-1.5 font-sans">
            Reference Manager <span className="text-[#2563EB] text-xs font-semibold px-2 py-0.5 bg-blue-50 border border-blue-100 rounded-md">Pro</span>
          </h1>
          <p className="text-xs text-[#6B7280] font-sans">
            Deduplicação e Padronização Bibliográfica para Revisões Sistemáticas
          </p>
        </div>
      </div>

      {hasFiles && (
        <button
          onClick={onClearAll}
          className="text-xs font-semibold text-[#6B7280] hover:text-rose-600 px-3 py-1.5 rounded-lg border border-[#E5E7EB] hover:border-rose-200 hover:bg-rose-50/50 transition cursor-pointer font-sans"
          type="button"
          title="Limpar todos os arquivos e redefinir a área de trabalho"
        >
          Limpar Tudo
        </button>
      )}
    </header>
  );
};
