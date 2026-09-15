import React from "react";
import { Settings, HelpCircle } from "lucide-react";

interface SettingsCardProps {
  threshold: number;
  matchDoi: boolean;
  parentRule: "first" | "completeness";
  onChangeThreshold: (val: number) => void;
  onChangeMatchDoi: (val: boolean) => void;
  onChangeParentRule: (rule: "first" | "completeness") => void;
}

export const SettingsCard: React.FC<SettingsCardProps> = ({
  threshold,
  matchDoi,
  parentRule,
  onChangeThreshold,
  onChangeMatchDoi,
  onChangeParentRule,
}) => {
  return (
    <div className="rounded-2xl border border-[#E5E7EB] p-4 space-y-4 bg-white">
      <h2 className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider font-sans flex items-center gap-1.5">
        <Settings className="w-4 h-4 text-[#6B7280]" />
        3. Configurações de Deduplicação
      </h2>

      <div className="space-y-4">
        {/* Similarity threshold range */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-[#1F2937] font-sans">Limite de Similaridade</span>
            <span className="font-mono font-bold bg-blue-50 text-[#2563EB] px-2 py-0.5 rounded border border-blue-100">
              {(threshold * 100).toFixed(0)}%
            </span>
          </div>
          <input
            type="range"
            min="0.5"
            max="1.0"
            step="0.01"
            value={threshold}
            onChange={(e) => onChangeThreshold(parseFloat(e.target.value))}
            className="w-full accent-[#2563EB] cursor-pointer"
          />
          <div className="flex items-center justify-between text-[10px] text-[#6B7280] font-mono">
            <span>0.50 (Amplo)</span>
            <span>0.95 (Padrão)</span>
            <span>1.00 (Exato)</span>
          </div>
        </div>

        {/* Match DOI toggle */}
        <label className="flex items-center gap-2.5 cursor-pointer group">
          <input
            type="checkbox"
            checked={matchDoi}
            onChange={(e) => onChangeMatchDoi(e.target.checked)}
            className="w-4 h-4 rounded border-[#D1D5DB] text-[#2563EB] focus:ring-[#2563EB] cursor-pointer"
          />
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-[#1F2937] font-sans group-hover:text-[#2563EB] transition">
              Mesclar por DOI Idêntico
            </span>
            <span className="text-[10px] text-[#6B7280] font-sans">
              DOIs correspondentes são considerados duplicatas automáticas.
            </span>
          </div>
        </label>

        {/* Parent Rule selector */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-[#1F2937] font-sans flex items-center justify-between">
            <span>Registro Sobrevivente do Grupo</span>
            <span title="Qual registro deve ser promovido a representante único?">
              <HelpCircle className="w-3.5 h-3.5 text-[#6B7280]" />
            </span>
          </label>
          <div className="grid grid-cols-1 gap-2">
            <label
              className={`border rounded-xl p-2.5 flex items-start gap-2 cursor-pointer transition ${
                parentRule === "completeness"
                  ? "bg-slate-50 border-[#2563EB] text-[#1F2937]"
                  : "bg-white border-[#E5E7EB] text-[#6B7280] hover:border-[#D1D5DB]"
              }`}
            >
              <input
                type="radio"
                name="parentRule"
                value="completeness"
                checked={parentRule === "completeness"}
                onChange={() => onChangeParentRule("completeness")}
                className="mt-0.5 w-4 h-4 text-[#2563EB] cursor-pointer focus:ring-[#2563EB]"
              />
              <div className="flex flex-col">
                <span className="text-xs font-bold font-sans">Metadados Completos</span>
                <span className="text-[10px] opacity-85 leading-relaxed font-sans">
                  Promove automaticamente o artigo com maior riqueza de campos e resumos preenchidos.
                </span>
              </div>
            </label>

            <label
              className={`border rounded-xl p-2.5 flex items-start gap-2 cursor-pointer transition ${
                parentRule === "first"
                  ? "bg-slate-50 border-[#2563EB] text-[#1F2937]"
                  : "bg-white border-[#E5E7EB] text-[#6B7280] hover:border-[#D1D5DB]"
              }`}
            >
              <input
                type="radio"
                name="parentRule"
                value="first"
                checked={parentRule === "first"}
                onChange={() => onChangeParentRule("first")}
                className="mt-0.5 w-4 h-4 text-[#2563EB] cursor-pointer focus:ring-[#2563EB]"
              />
              <div className="flex flex-col">
                <span className="text-xs font-bold font-sans">Ordem de Aparição (Primeiro)</span>
                <span className="text-[10px] opacity-85 leading-relaxed font-sans">
                  Preserva a primeira ocorrência encontrada nos arquivos de entrada.
                </span>
              </div>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};
