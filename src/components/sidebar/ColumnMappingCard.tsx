import React, { useState } from "react";
import { Check, ChevronDown, ChevronUp, Layers } from "lucide-react";
import { ColumnMapping } from "../../types";

interface ColumnMappingCardProps {
  headers: string[];
  mapping: ColumnMapping;
  onChangeMapping: (updated: ColumnMapping) => void;
}

export const ColumnMappingCard: React.FC<ColumnMappingCardProps> = ({
  headers,
  mapping,
  onChangeMapping,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (headers.length === 0) return null;

  const handleFieldChange = (field: keyof ColumnMapping, value: string) => {
    onChangeMapping({
      ...mapping,
      [field]: value,
    });
  };

  const fields: { key: keyof ColumnMapping; label: string; required?: boolean }[] = [
    { key: "titleColumn", label: "Título do Artigo", required: true },
    { key: "yearColumn", label: "Ano de Publicação" },
    { key: "authorsColumn", label: "Autores" },
    { key: "doiColumn", label: "DOI" },
    { key: "abstractColumn", label: "Resumo / Abstract" },
  ];

  return (
    <div className="rounded-2xl border border-[#E5E7EB] p-4 space-y-3 bg-white">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-[#2563EB]" />
          <h2 className="text-xs font-bold text-[#6B7280] uppercase tracking-wider font-sans">
            2. Mapeamento de Colunas
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="bg-[#D1FAE5] text-[#065F46] text-[10px] font-semibold px-2 py-0.5 rounded-full font-mono flex items-center gap-1">
            <Check className="w-3 h-3" /> Auto
          </span>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 text-[#6B7280] hover:text-[#1F2937] transition cursor-pointer"
            type="button"
            title={isExpanded ? "Recolher mapeamento" : "Ajustar mapeamento de colunas"}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <p className="text-[11px] text-[#6B7280] font-sans leading-relaxed">
        Colunas identificadas heuristicamente. Clique para revisar ou alterar associações.
      </p>

      {isExpanded && (
        <div className="space-y-3 pt-2 border-t border-[#E5E7EB]">
          {fields.map(({ key, label, required }) => (
            <div key={key} className="space-y-1">
              <label className="text-xs font-semibold text-[#1F2937] flex items-center justify-between font-sans">
                <span>
                  {label} {required && <span className="text-rose-500">*</span>}
                </span>
                <span className="text-[10px] text-[#6B7280] font-mono truncate max-w-[150px]">
                  Atual: {mapping[key] || "Não mapeado"}
                </span>
              </label>
              <select
                value={mapping[key] || ""}
                onChange={(e) => handleFieldChange(key, e.target.value)}
                className="w-full text-xs bg-white border border-[#E5E7EB] rounded-xl px-2.5 py-1.5 text-[#1F2937] focus:border-[#2563EB] focus:outline-none cursor-pointer font-sans"
              >
                <option value="">-- Não Mapeado --</option>
                {headers.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
