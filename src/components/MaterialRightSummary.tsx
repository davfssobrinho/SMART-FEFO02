import React from 'react';
import {
  Package,
  Building,
  Factory,
  Calendar,
  Clock,
  ShieldCheck,
  AlertTriangle,
  Send,
  X,
  Boxes,
  Tag,
  MapPin,
  CheckCircle,
} from 'lucide-react';
import { SapLoteItem } from '../types';
import { formatDateBR, formatNumberBR } from '../services/fefoEngine';

interface MaterialRightSummaryProps {
  selectedLote: SapLoteItem | null;
  onClose: () => void;
  onOpenAtendimentoModal: (lote: SapLoteItem) => void;
}

export const MaterialRightSummary: React.FC<MaterialRightSummaryProps> = ({
  selectedLote,
  onClose,
  onOpenAtendimentoModal,
}) => {
  if (!selectedLote) {
    return (
      <aside className="bg-slate-50 border-l border-slate-200 w-full lg:w-80 flex-shrink-0 p-6 flex flex-col items-center justify-center text-center text-slate-400 min-h-[300px]">
        <Boxes className="w-12 h-12 text-slate-300 mb-3 stroke-[1.5]" />
        <h4 className="text-sm font-bold text-slate-600">Nenhum Lote Selecionado</h4>
        <p className="text-xs text-slate-400 mt-1 max-w-[200px]">
          Clique em qualquer linha da tabela principal para visualizar o resumo detalhado do lote.
        </p>
      </aside>
    );
  }

  const isFefo1 = selectedLote.prioridadeFEFO === 1;

  return (
    <aside className="bg-white border-l border-slate-200 w-full lg:w-80 flex-shrink-0 flex flex-col h-full overflow-y-auto shadow-sm">
      {/* Header */}
      <div className="p-4 bg-slate-900 text-white flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <Package className="w-4 h-4 text-amber-400" />
          <h3 className="text-xs font-extrabold uppercase tracking-wider">Resumo do Material</h3>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white p-1 rounded transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col gap-4">
        {/* Banner Prioridade FEFO */}
        <div
          className={`p-3 rounded-lg border flex items-center justify-between shadow-2xs ${
            isFefo1
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-950'
              : 'bg-blue-50 border-blue-200 text-blue-950'
          }`}
        >
          <div className="flex items-center gap-2">
            <ShieldCheck className={`w-5 h-5 ${isFefo1 ? 'text-emerald-600' : 'text-blue-600'}`} />
            <div>
              <div className="text-[10px] font-semibold text-slate-500 uppercase">Prioridade FEFO</div>
              <div className="text-base font-black">
                {isFefo1 ? '#1 - Lote Recomendado' : `#${selectedLote.prioridadeFEFO} de Atendimento`}
              </div>
            </div>
          </div>
        </div>

        {/* Material Title */}
        <div className="border-b border-slate-100 pb-3">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Nº Material</div>
          <div className="text-lg font-black text-slate-900 font-mono tracking-tight">{selectedLote.materialCode}</div>
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-2">Desc. Material</div>
          <div className="text-xs font-semibold text-slate-700 leading-snug">{selectedLote.materialDesc}</div>
        </div>

        {/* Key Attributes List */}
        <div className="space-y-3 text-xs">
          {/* Lote SAP & Fornecedor */}
          <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded border border-slate-200">
            <div>
              <div className="text-[10px] text-slate-400 font-medium">Nº Lote (SAP)</div>
              <div className="font-mono font-bold text-slate-900">{selectedLote.loteSAP}</div>
            </div>
            <div>
              <div className="text-[10px] text-slate-400 font-medium">Nº Lote Fornecedor</div>
              <div className="font-mono font-semibold text-slate-700">{selectedLote.loteFornecedor || '-'}</div>
            </div>
          </div>

          {/* Depósito */}
          <div className="flex items-start gap-2">
            <MapPin className="w-4 h-4 text-slate-400 mt-0.5" />
            <div>
              <div className="text-[10px] text-slate-400 font-medium">Depósito</div>
              <div className="font-semibold text-slate-800">
                {selectedLote.deposito} <span className="text-slate-400 font-mono">({selectedLote.posicaoDeposito})</span>
              </div>
            </div>
          </div>

          {/* Datas Fabricação e Vencimento */}
          <div className="grid grid-cols-2 gap-2 bg-amber-50/50 p-2.5 rounded border border-amber-200/60">
            <div>
              <div className="text-[10px] text-amber-800 font-medium flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                Data Fabricação
              </div>
              <div className="font-bold text-amber-950 mt-0.5">{formatDateBR(selectedLote.dataFabricacao)}</div>
            </div>
            <div>
              <div className="text-[10px] text-amber-800 font-medium flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Data Vencimento (Sled)
              </div>
              <div className="font-bold text-amber-950 mt-0.5">{formatDateBR(selectedLote.dataVencimento)}</div>
            </div>
          </div>

          {/* Dias Restantes Progress Gauge */}
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-slate-500 font-medium">Dias Restantes para Vencer:</span>
              <span
                className={`font-black text-xs px-2 py-0.5 rounded ${
                  selectedLote.diasParaVencer < 0
                    ? 'bg-rose-600 text-white'
                    : selectedLote.diasParaVencer <= 30
                    ? 'bg-orange-500 text-white'
                    : selectedLote.diasParaVencer <= 60
                    ? 'bg-amber-400 text-slate-950'
                    : 'bg-emerald-100 text-emerald-800'
                }`}
              >
                {selectedLote.diasParaVencer} dias
              </span>
            </div>
          </div>

          {/* Estoque Utiliz. Livre */}
          <div className="p-3 bg-slate-900 text-white rounded-lg flex flex-col gap-1 shadow-md">
            <span className="text-[10px] text-slate-400 uppercase font-semibold">Estoque Utiliz. Livre</span>
            <div className="text-2xl font-black text-amber-400 flex items-baseline gap-1">
              {formatNumberBR(selectedLote.estoqueLivre, 0)}
              <span className="text-xs text-white font-normal uppercase">{selectedLote.unidadeMedida}</span>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={() => onOpenAtendimentoModal(selectedLote)}
          className={`w-full py-3 px-4 rounded font-extrabold text-xs flex items-center justify-center gap-2 transition-all shadow-sm cursor-pointer active:scale-95 mt-2 ${
            isFefo1
              ? 'bg-green-600 hover:bg-green-700 text-white'
              : 'bg-slate-800 hover:bg-black text-white'
          }`}
        >
          <Send className="w-4 h-4" />
          <span>Dar Baixa em Reserva</span>
        </button>
      </div>
    </aside>
  );
};
