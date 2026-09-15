import React, { useState } from "react";
import { Layers, Download, RefreshCw } from "lucide-react";
import { ReferenceItem } from "../../types";
import { generateLlmBatchesZip } from "../../core/exportService";

interface LLMBatchSectionProps {
  cleanedItems: ReferenceItem[];
  allItems: ReferenceItem[];
  abstractColumn: string;
  onNotify: (type: "success" | "warning" | "error", message: string) => void;
}

export const LLMBatchSection: React.FC<LLMBatchSectionProps> = ({
  cleanedItems,
  allItems,
  abstractColumn,
  onNotify,
}) => {
  const [sourceSelect, setSourceSelect] = useState<"cleaned" | "all">("cleaned");
  const [batchMode, setBatchMode] = useState<"size" | "count">("size");
  const [batchSize, setBatchSize] = useState<number>(10);
  const [batchCount, setBatchCount] = useState<number>(5);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  const targetItems = sourceSelect === "cleaned" ? cleanedItems : allItems;
  const totalRefs = targetItems.length;

  let finalLotes = 0;
  let finalArtigos = 0;

  if (totalRefs > 0) {
    if (batchMode === "size") {
      finalArtigos = Math.max(1, batchSize);
      finalLotes = Math.ceil(totalRefs / finalArtigos);
    } else {
      finalLotes = Math.max(1, Math.min(batchCount, totalRefs));
      finalArtigos = Math.ceil(totalRefs / finalLotes);
    }
  }

  const handleGenerate = async () => {
    if (targetItems.length === 0) {
      onNotify("warning", "Nenhuma referência disponível para gerar os lotes.");
      return;
    }

    setIsExporting(true);
    try {
      const batchesCreated = await generateLlmBatchesZip({
        items: targetItems,
        abstractColumn,
        batchMode,
        batchSize,
        batchCount,
      });

      onNotify(
        "success",
        `Sucesso! Arquivo "batches_para_llm.zip" gerado com ${batchesCreated} lotes de texto.`
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Falha ao gerar lotes";
      onNotify("error", `Erro ao gerar ZIP: ${msg}`);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="mt-8 border-t border-[#E5E7EB] pt-6">
      <div className="bg-gradient-to-tr from-slate-50 to-blue-50/20 border border-[#E5E7EB] rounded-2xl p-6 space-y-6">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-blue-50 border border-blue-100 rounded-xl text-[#2563EB]">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#1F2937] font-sans flex items-center gap-1.5">
              Preparar Lotes de Texto para LLM (.ZIP)
            </h3>
            <p className="text-xs text-[#6B7280] leading-relaxed font-sans max-w-3xl">
              Divide as referências em arquivos .TXT estruturados e compactados em um .ZIP para
              facilitar triagens temáticas, sínteses de literatura e prompts em Modelos de Linguagem.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* 1. Source */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-[#4B5563] font-sans">1. Origem dos Artigos</label>
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-white border border-[#E5E7EB] rounded-xl shadow-xs">
              <button
                type="button"
                onClick={() => setSourceSelect("cleaned")}
                className={`text-[11px] font-bold py-2 rounded-lg transition cursor-pointer font-sans text-center ${
                  sourceSelect === "cleaned"
                    ? "bg-blue-50 text-[#2563EB] border border-blue-150"
                    : "text-[#6B7280] hover:text-[#1F2937]"
                }`}
              >
                Limpas ({cleanedItems.length})
              </button>
              <button
                type="button"
                onClick={() => setSourceSelect("all")}
                className={`text-[11px] font-bold py-2 rounded-lg transition cursor-pointer font-sans text-center ${
                  sourceSelect === "all"
                    ? "bg-blue-50 text-[#2563EB] border border-blue-150"
                    : "text-[#6B7280] hover:text-[#1F2937]"
                }`}
              >
                Todas ({allItems.length})
              </button>
            </div>
          </div>

          {/* 2. Mode */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-[#4B5563] font-sans">2. Modo de Divisão</label>
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-white border border-[#E5E7EB] rounded-xl shadow-xs">
              <button
                type="button"
                onClick={() => setBatchMode("size")}
                className={`text-[11px] font-bold py-2 rounded-lg transition cursor-pointer font-sans text-center ${
                  batchMode === "size"
                    ? "bg-blue-50 text-[#2563EB] border border-blue-150"
                    : "text-[#6B7280] hover:text-[#1F2937]"
                }`}
              >
                Artigos / Lote
              </button>
              <button
                type="button"
                onClick={() => setBatchMode("count")}
                className={`text-[11px] font-bold py-2 rounded-lg transition cursor-pointer font-sans text-center ${
                  batchMode === "count"
                    ? "bg-blue-50 text-[#2563EB] border border-blue-150"
                    : "text-[#6B7280] hover:text-[#1F2937]"
                }`}
              >
                Quantidade de Lotes
              </button>
            </div>
          </div>

          {/* 3. Parameter Slider */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-[#4B5563] font-sans">3. Parâmetro de Divisão</label>
            {batchMode === "size" ? (
              <div className="space-y-1.5 bg-white border border-[#E5E7EB] rounded-xl p-2.5 shadow-xs">
                <div className="flex items-center justify-between text-[11px] font-sans">
                  <span className="font-semibold text-[#1F2937]">Artigos por Lote:</span>
                  <span className="font-mono font-bold text-[#2563EB]">{batchSize}</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="100"
                  step="1"
                  value={batchSize}
                  onChange={(e) => setBatchSize(parseInt(e.target.value, 10))}
                  className="w-full accent-[#2563EB] cursor-pointer"
                />
              </div>
            ) : (
              <div className="space-y-1.5 bg-white border border-[#E5E7EB] rounded-xl p-2.5 shadow-xs">
                <div className="flex items-center justify-between text-[11px] font-sans">
                  <span className="font-semibold text-[#1F2937]">Lotes Totais:</span>
                  <span className="font-mono font-bold text-[#2563EB]">{batchCount}</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="50"
                  step="1"
                  value={batchCount}
                  onChange={(e) => setBatchCount(parseInt(e.target.value, 10))}
                  className="w-full accent-[#2563EB] cursor-pointer"
                />
              </div>
            )}
          </div>
        </div>

        {/* Calculation Summary & Download */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white border border-[#E5E7EB] rounded-2xl p-4 shadow-xs">
          <div className="flex items-center gap-6 text-xs font-sans">
            <div className="text-left">
              <p className="text-[10px] uppercase font-bold text-[#6B7280] tracking-wider font-mono">
                Total Selecionado
              </p>
              <p className="text-lg font-extrabold text-[#1F2937] font-mono">{totalRefs}</p>
            </div>
            <div className="w-px h-8 bg-[#E5E7EB]" />
            <div className="text-left">
              <p className="text-[10px] uppercase font-bold text-[#6B7280] tracking-wider font-mono">
                Arquivos no ZIP
              </p>
              <p className="text-lg font-extrabold text-[#2563EB] font-mono">{finalLotes} txt</p>
            </div>
            <div className="w-px h-8 bg-[#E5E7EB]" />
            <div className="text-left">
              <p className="text-[10px] uppercase font-bold text-[#6B7280] tracking-wider font-mono">
                Estimativa
              </p>
              <p className="text-xs font-semibold text-emerald-600 font-sans">
                {finalLotes > 0 ? `~ ${finalArtigos} artigos/lote` : "N/D"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleGenerate}
            disabled={totalRefs === 0 || isExporting}
            className="w-full sm:w-auto bg-[#2563EB] hover:bg-[#1D4ED8] disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white text-xs font-bold py-3 px-6 rounded-xl transition flex items-center justify-center gap-2 cursor-pointer font-sans shadow-xs"
          >
            {isExporting ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            <span>{isExporting ? "Gerando Pacote..." : "Gerar e Baixar Lotes (.ZIP)"}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
