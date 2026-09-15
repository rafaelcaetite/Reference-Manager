import React, { useState } from "react";
import { Layers, Download, RefreshCw, MessageSquarePlus, Copy, Check, X, Lightbulb } from "lucide-react";
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
  const [showContextTip, setShowContextTip] = useState<boolean>(false);
  const [copiedPrompt, setCopiedPrompt] = useState<boolean>(false);

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

      setShowContextTip(true);
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

  const handleCopyPrompt = () => {
    const promptText = `Você é um pesquisador sênior conduzindo uma Revisão Sistemática da Literatura (RSL).
Por favor, analise a lista de referências a seguir (Título e Resumo) e avalie a elegibilidade de cada artigo.

Critérios de Inclusão:
1. [Inserir critério 1]
2. [Inserir critério 2]

Critérios de Exclusão:
1. [Inserir critério 1]

Para cada artigo, responda no formato:
- [ID]: INCLUÍDO ou EXCLUÍDO (Justificativa concisa baseada nos critérios).

Aqui está o lote de referências para triagem:`;

    navigator.clipboard.writeText(promptText);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2500);
    onNotify("success", "Prompt de triagem copiado para a área de transferência.");
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

        {/* Tip trigger */}
        <div className="flex items-center justify-between pt-1">
          <button
            type="button"
            onClick={() => setShowContextTip(true)}
            className="text-[11px] font-semibold text-[#2563EB] hover:text-[#1D4ED8] flex items-center gap-1.5 cursor-pointer font-sans"
          >
            <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
            <span>Dica de Janela de Contexto: Por que usar uma nova conversa para cada lote?</span>
          </button>
        </div>

        {/* Floating Context Window Guidance Modal */}
        {showContextTip && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-2xl max-w-lg w-full p-6 space-y-4 relative">
              <button
                type="button"
                onClick={() => setShowContextTip(false)}
                className="absolute top-4 right-4 text-[#9CA3AF] hover:text-[#4B5563] p-1 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                title="Fechar recomendação"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-[#2563EB] shrink-0">
                  <MessageSquarePlus className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[#1F2937] font-sans">
                    Recomendação: Abra um Novo Chat para Cada Lote
                  </h4>
                  <p className="text-[11px] text-[#6B7280] font-sans">
                    Preservação de fidelidade da janela de contexto em LLMs
                  </p>
                </div>
              </div>

              <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-3.5 space-y-2 text-xs text-amber-900 font-sans leading-relaxed">
                <p className="font-semibold flex items-center gap-1.5 text-amber-950">
                  <Lightbulb className="w-4 h-4 text-amber-600 shrink-0" />
                  Por que reiniciar o chat a cada lote de referências?
                </p>
                <p>
                  Modelos de Linguagem (ChatGPT, Claude, Gemini, DeepSeek) operam com janelas de atenção que se saturam com históricos extensos. Conforme a conversa acumula centenas de resumos de lotes anteriores, a IA sofre de <strong>prompt drift</strong> e redução de precisão (&quot;lost in the middle&quot;).
                </p>
                <p>
                  <strong>Diretriz Sênior:</strong> Envie cada arquivo <code>.txt</code> gerado em uma <strong>nova conversa (novo chat)</strong>, acompanhado do seu prompt com os critérios de inclusão e exclusão. Isso assegura que cada lote seja avaliado com 100% de consistência metodológica e zero viés cumulativo.
                </p>
              </div>

              <div className="pt-2 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={handleCopyPrompt}
                  className="text-xs font-semibold px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-[#1F2937] rounded-xl transition flex items-center gap-1.5 cursor-pointer font-sans"
                >
                  {copiedPrompt ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-[#6B7280]" />}
                  <span>{copiedPrompt ? "Copiado!" : "Copiar Prompt Padrão"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowContextTip(false)}
                  className="text-xs font-bold px-5 py-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-xl transition cursor-pointer font-sans shadow-xs"
                >
                  Entendido
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
