import React from "react";
import { Database, CheckCircle, ArrowRight } from "lucide-react";

interface EmptyStateProps {
  onLoadSample: (type: "acm" | "ieee" | "scopus") => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ onLoadSample }) => {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center max-w-xl mx-auto space-y-6">
      <div className="w-16 h-16 bg-white border border-[#E5E7EB] rounded-2xl flex items-center justify-center text-[#2563EB] shadow-xs">
        <Database className="w-8 h-8" />
      </div>

      <div className="space-y-2">
        <h2 className="text-xl font-bold text-[#1F2937] tracking-tight font-sans">
          Deduplicação e Normalização de Referências Bibliográficas
        </h2>
        <p className="text-sm text-[#6B7280] leading-relaxed font-sans">
          Projetado para revisões sistemáticas da literatura acadêmica. Executa algoritmos matemáticos
          de similaridade de cadeias (Gestalt Pattern Matching) com total privacidade no seu navegador.
        </p>
      </div>

      <div className="bg-blue-50/50 text-[#1F2937] border border-blue-100 text-xs rounded-2xl p-5 flex items-start gap-3 text-left font-sans shadow-xs w-full">
        <CheckCircle className="w-5 h-5 text-[#2563EB] shrink-0 mt-0.5" />
        <div className="space-y-1.5">
          <p className="font-bold text-[#1F2937]">Capacidades e Garantias:</p>
          <ul className="list-disc pl-4 space-y-1 text-[#6B7280]">
            <li>Processamento 100% no cliente (client-side): nenhum dado é enviado a servidores externos.</li>
            <li>Preservação garantida de 100% das colunas originais do CSV na exportação.</li>
            <li>Proteção ativa contra vulnerabilidades de injeção de fórmulas CSV (CWE-1236).</li>
            <li>Geração automatizada de lotes em arquivos compactados (.ZIP) prontos para análise por LLMs.</li>
          </ul>
        </div>
      </div>

      <div className="pt-2 flex flex-col items-center gap-3">
        <p className="text-xs text-[#6B7280] font-sans">
          Importe seus arquivos .CSV no painel lateral ou explore uma amostra:
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onLoadSample("acm")}
            className="text-xs font-semibold px-3 py-1.5 bg-white border border-[#E5E7EB] hover:border-slate-300 text-[#1F2937] rounded-xl shadow-xs transition cursor-pointer flex items-center gap-1 font-sans"
            type="button"
          >
            <span>Amostra ACM</span>
            <ArrowRight className="w-3.5 h-3.5 text-[#6B7280]" />
          </button>
          <button
            onClick={() => onLoadSample("ieee")}
            className="text-xs font-semibold px-3 py-1.5 bg-white border border-[#E5E7EB] hover:border-slate-300 text-[#1F2937] rounded-xl shadow-xs transition cursor-pointer flex items-center gap-1 font-sans"
            type="button"
          >
            <span>Amostra IEEE</span>
            <ArrowRight className="w-3.5 h-3.5 text-[#6B7280]" />
          </button>
          <button
            onClick={() => onLoadSample("scopus")}
            className="text-xs font-semibold px-3 py-1.5 bg-white border border-[#E5E7EB] hover:border-slate-300 text-[#1F2937] rounded-xl shadow-xs transition cursor-pointer flex items-center gap-1 font-sans"
            type="button"
          >
            <span>Amostra Scopus</span>
            <ArrowRight className="w-3.5 h-3.5 text-[#6B7280]" />
          </button>
        </div>
      </div>
    </div>
  );
};
