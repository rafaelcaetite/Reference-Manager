import React from "react";
import { Upload, FileText, Trash2, Database, RefreshCw } from "lucide-react";
import { UploadedFile } from "../../types";

interface FileUploaderCardProps {
  uploadedFiles: UploadedFile[];
  isParsing: boolean;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onLoadSample: (type: "acm" | "ieee" | "scopus") => void;
  onDeleteFile: (id: string) => void;
}

export const FileUploaderCard: React.FC<FileUploaderCardProps> = ({
  uploadedFiles,
  isParsing,
  onFileUpload,
  onLoadSample,
  onDeleteFile,
}) => {
  return (
    <div className="rounded-2xl border border-[#E5E7EB] p-4 space-y-4 bg-[#F8F9FA]">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-bold text-[#6B7280] uppercase tracking-wider font-sans">
          1. Importar Bases Bibliográficas (.csv)
        </h2>
        {isParsing && <RefreshCw className="w-3.5 h-3.5 text-[#2563EB] animate-spin" />}
      </div>

      {/* Active Files List */}
      {uploadedFiles.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280] font-mono">
            Bases carregadas ({uploadedFiles.length}):
          </p>
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {uploadedFiles.map((file) => (
              <div
                key={file.id}
                className="bg-white rounded-xl border border-[#E5E7EB] p-2.5 flex items-center justify-between gap-3 shadow-xs relative group"
              >
                <div className="flex items-center gap-2.5 overflow-hidden">
                  <FileText className="w-4 h-4 text-[#2563EB] shrink-0" />
                  <div className="overflow-hidden">
                    <p className="text-xs font-bold text-[#1F2937] truncate font-mono" title={file.name}>
                      {file.name}
                    </p>
                    <p className="text-[10px] text-[#6B7280] font-mono">
                      {(file.size / 1024).toFixed(1)} KB | {file.rowCount} registros
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => onDeleteFile(file.id)}
                  className="p-1 text-[#6B7280] hover:text-rose-600 rounded-lg hover:bg-rose-50 transition cursor-pointer shrink-0"
                  title="Remover arquivo"
                  type="button"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* File Dropzone */}
      <div className={`border border-dashed border-[#D1D5DB] hover:border-[#2563EB] rounded-2xl text-center bg-white transition cursor-pointer relative group ${
        uploadedFiles.length > 0 ? "p-3.5" : "p-6"
      }`}>
        <input
          type="file"
          multiple
          accept=".csv"
          onChange={onFileUpload}
          disabled={isParsing}
          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full disabled:cursor-not-allowed"
        />
        <Upload className={`mx-auto text-[#6B7280] group-hover:text-[#2563EB] transition ${
          uploadedFiles.length > 0 ? "w-5 h-5 mb-1" : "w-8 h-8 mb-2"
        }`} />
        <p className={`${uploadedFiles.length > 0 ? "text-xs" : "text-sm"} font-semibold text-[#1F2937] font-sans`}>
          {uploadedFiles.length > 0 ? "Importar outra base (.CSV)" : "Carregar arquivos .CSV"}
        </p>
        <p className="text-[10px] text-[#6B7280] mt-0.5 font-sans">
          Arraste arquivos ou clique para selecionar
        </p>
      </div>

      {/* Pre-packaged Sample Datasets */}
      <div className="pt-2 border-t border-[#E5E7EB]/80 space-y-2">
        <p className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider font-sans flex items-center gap-1">
          <Database className="w-3 h-3 text-[#2563EB]" />
          Ou teste com amostras de literatura:
        </p>
        <div className="grid grid-cols-3 gap-1.5">
          <button
            onClick={() => onLoadSample("acm")}
            disabled={isParsing}
            className="text-[11px] font-semibold py-1.5 px-2 bg-white hover:bg-slate-50 border border-[#E5E7EB] hover:border-slate-300 text-[#1F2937] rounded-lg transition cursor-pointer disabled:opacity-50 text-center font-sans"
            type="button"
          >
            ACM
          </button>
          <button
            onClick={() => onLoadSample("ieee")}
            disabled={isParsing}
            className="text-[11px] font-semibold py-1.5 px-2 bg-white hover:bg-slate-50 border border-[#E5E7EB] hover:border-slate-300 text-[#1F2937] rounded-lg transition cursor-pointer disabled:opacity-50 text-center font-sans"
            type="button"
          >
            IEEE
          </button>
          <button
            onClick={() => onLoadSample("scopus")}
            disabled={isParsing}
            className="text-[11px] font-semibold py-1.5 px-2 bg-white hover:bg-slate-50 border border-[#E5E7EB] hover:border-slate-300 text-[#1F2937] rounded-lg transition cursor-pointer disabled:opacity-50 text-center font-sans"
            type="button"
          >
            Scopus
          </button>
        </div>
      </div>
    </div>
  );
};
