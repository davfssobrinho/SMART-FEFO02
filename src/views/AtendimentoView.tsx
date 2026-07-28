import React, { useState } from 'react';
import {
  Search,
  CheckSquare,
  QrCode,
  ShieldCheck,
  Package,
  Layers,
  MapPin,
  Clock,
  Sparkles,
  AlertTriangle,
  Send,
  Barcode,
} from 'lucide-react';
import { SapLoteItem, UserRole } from '../types';
import { formatDateBR, formatNumberBR } from '../services/fefoEngine';

interface AtendimentoViewProps {
  lotes: SapLoteItem[];
  activeRole: UserRole;
  onOpenAtendimentoModal: (lote: SapLoteItem) => void;
}

export const AtendimentoView: React.FC<AtendimentoViewProps> = ({
  lotes,
  activeRole,
  onOpenAtendimentoModal,
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [scannedBarcode, setScannedBarcode] = useState<string>('');
  const [scannerActive, setScannerActive] = useState<boolean>(false);

  // Filter lotes for picking view
  const searchLower = (searchTerm || scannedBarcode).toLowerCase().trim();

  const filteredLotes = lotes.filter((l) => {
    if (l.estoqueLivre <= 0) return false; // Picking considers available free stock > 0
    if (!searchLower) return true;

    return (
      l.materialCode.toLowerCase().includes(searchLower) ||
      l.materialDesc.toLowerCase().includes(searchLower) ||
      l.loteSAP.toLowerCase().includes(searchLower) ||
      l.loteFornecedor.toLowerCase().includes(searchLower) ||
      l.fornecedor.toLowerCase().includes(searchLower)
    );
  });

  // Group by material to show material headers with all individual lotes listed below
  const materialGroups = new Map<string, SapLoteItem[]>();
  filteredLotes.forEach((l) => {
    if (!materialGroups.has(l.materialCode)) {
      materialGroups.set(l.materialCode, []);
    }
    materialGroups.get(l.materialCode)!.push(l);
  });

  // Simulate Barcode Scanner Trigger
  const handleSimulateScan = (code: string) => {
    setScannedBarcode(code);
    setSearchTerm('');
    setScannerActive(true);
    setTimeout(() => setScannerActive(false), 1200);
  };

  return (
    <div className="flex flex-col gap-4 max-w-[1920px] mx-auto p-4 sm:p-6">
      {/* Page Title & Barcode Scanner Bar */}
      <div className="bg-slate-900 text-white p-5 rounded-xl border border-slate-800 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <CheckSquare className="w-6 h-6 text-blue-400" />
            <h2 className="text-lg font-black tracking-tight">Fazer Reserva Logística</h2>
          </div>
          <p className="text-xs text-slate-300 mt-0.5">
            Módulo operacional: localize o material por código SAP, descrição ou leitor de código de barras para realizar a reserva.
          </p>
        </div>

        {/* Scanner Barcode Simulation Widget */}
        <div className="flex items-center gap-2 bg-slate-800 p-2 rounded-lg border border-slate-700">
          <div className="flex items-center gap-1.5 text-xs text-slate-300 font-medium px-2">
            <Barcode className="w-5 h-5 text-amber-400" />
            <span className="hidden sm:inline">Simulador Zebra Scanner:</span>
          </div>
          <button
            onClick={() => handleSimulateScan('30017870')}
            className="bg-slate-700 hover:bg-slate-600 text-white font-mono text-xs px-2.5 py-1 rounded transition-colors cursor-pointer"
            title="Scan Malte Pilsen"
          >
            30017870
          </button>
          <button
            onClick={() => handleSimulateScan('0003112990')}
            className="bg-slate-700 hover:bg-slate-600 text-white font-mono text-xs px-2.5 py-1 rounded transition-colors cursor-pointer"
            title="Scan Lote Lúpulo"
          >
            0003112990
          </button>
          <button
            onClick={() => {
              setScannedBarcode('');
              setSearchTerm('');
            }}
            className="text-xs text-amber-400 hover:underline px-1 cursor-pointer"
          >
            Limpar
          </button>
        </div>
      </div>

      {/* Realtime Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
        <Search className="w-5 h-5 text-slate-400" />
        <input
          type="text"
          placeholder="Digite o Código SAP, parte da Descrição, Lote SAP ou Lote Fornecedor..."
          value={searchTerm || scannedBarcode}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setScannedBarcode('');
          }}
          className="w-full text-sm font-medium text-slate-900 focus:outline-none placeholder-slate-400"
        />
        {(searchTerm || scannedBarcode) && (
          <button
            onClick={() => {
              setSearchTerm('');
              setScannedBarcode('');
            }}
            className="text-xs font-semibold text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            Limpar
          </button>
        )}
      </div>

      {/* Scanner feedback banner */}
      {scannerActive && (
        <div className="p-3 bg-emerald-500 text-slate-950 font-black text-xs rounded-lg flex items-center gap-2 animate-bounce">
          <QrCode className="w-5 h-5" />
          <span>Código lido com sucesso pelo leitor! Filtrando lotes em tempo real...</span>
        </div>
      )}

      {/* Materials Pick List */}
      <div className="flex flex-col gap-6">
        {materialGroups.size === 0 ? (
          <div className="bg-white p-12 rounded-xl border border-slate-200 text-center text-slate-400 font-medium">
            Nenhum material com lote disponível encontrado para o termo pesquisado.
          </div>
        ) : (
          Array.from(materialGroups.entries()).map(([materialCode, groupLotes]) => {
            const firstItem = groupLotes[0];
            const fefo1Lote = groupLotes.find((l) => l.prioridadeFEFO === 1) || groupLotes[0];

            return (
              <div
                key={materialCode}
                className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden"
              >
                {/* Material Header */}
                <div className="bg-slate-900 text-white p-4 flex flex-wrap items-center justify-between gap-2 border-b border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-500 text-slate-950 rounded-lg font-black font-mono">
                      {materialCode}
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-white">{firstItem.materialDesc}</h3>
                      <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                        <span>Grupo: {firstItem.grupoMercadoriaDesc}</span>
                        <span>•</span>
                        <span>Tipo: {firstItem.tipoMaterialDesc}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="bg-slate-800 text-amber-400 border border-slate-700 text-xs px-3 py-1 rounded-full font-bold">
                      {groupLotes.length} lotes individuais
                    </span>
                  </div>
                </div>

                {/* FEFO #1 Highlight Banner */}
                {fefo1Lote && (
                  <div className="bg-emerald-50 p-3 px-4 border-b border-emerald-200 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-5 h-5 text-emerald-600 fill-emerald-100" />
                      <div>
                        <span className="text-[10px] uppercase font-black text-emerald-800 tracking-wider">
                          RECOMENDADO FEFO #1 (MENOR VALIDADE)
                        </span>
                        <div className="text-xs font-bold text-emerald-950">
                          Lote SAP: <span className="font-mono">{fefo1Lote.loteSAP}</span> | Vencimento:{' '}
                          {formatDateBR(fefo1Lote.dataVencimento)} ({fefo1Lote.diasParaVencer}d) | Saldo:{' '}
                          {formatNumberBR(fefo1Lote.estoqueLivre, 0)} {fefo1Lote.unidadeMedida}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => onOpenAtendimentoModal(fefo1Lote)}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs px-4 py-2 rounded-lg shadow-md transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer"
                    >
                      <Send className="w-4 h-4" />
                      <span>Fazer Reserva Lote #1</span>
                    </button>
                  </div>
                )}

                {/* Individual Lotes Table for this material */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[10px] border-b border-slate-200">
                      <tr>
                        <th className="p-2.5 text-center">Prioridade</th>
                        <th className="p-2.5">Lote SAP</th>
                        <th className="p-2.5">Lote Fornecedor</th>
                        <th className="p-2.5">Fornecedor</th>
                        <th className="p-2.5">Depósito / Posição</th>
                        <th className="p-2.5">Data Fab.</th>
                        <th className="p-2.5">Data Venc. (SLED)</th>
                        <th className="p-2.5 text-center">Dias p/ Vencer</th>
                        <th className="p-2.5 text-right">Estoque Livre</th>
                        <th className="p-2.5 text-center">Ação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {groupLotes.map((lote) => {
                        const isFefo1 = lote.prioridadeFEFO === 1;

                        return (
                          <tr
                            key={lote.id}
                            className={`hover:bg-slate-50 transition-colors ${
                              isFefo1 ? 'bg-emerald-50/20 font-medium' : ''
                            }`}
                          >
                            <td className="p-2.5 text-center">
                              {isFefo1 ? (
                                <span className="bg-emerald-600 text-white font-black text-[10px] px-2 py-0.5 rounded-full">
                                  #1 FEFO
                                </span>
                              ) : (
                                <span className="bg-blue-100 text-blue-800 font-bold text-[10px] px-2 py-0.5 rounded-full">
                                  #{lote.prioridadeFEFO}
                                </span>
                              )}
                            </td>

                            <td className="p-2.5 font-mono font-bold text-slate-900">{lote.loteSAP}</td>
                            <td className="p-2.5 font-mono text-slate-600">{lote.loteFornecedor}</td>
                            <td className="p-2.5 font-semibold text-slate-800">{lote.fornecedor}</td>
                            <td className="p-2.5 text-slate-700">
                              {lote.deposito} <span className="text-slate-400 font-mono">({lote.posicaoDeposito})</span>
                            </td>
                            <td className="p-2.5 text-slate-600">{formatDateBR(lote.dataFabricacao)}</td>
                            <td className="p-2.5 font-bold text-amber-950 bg-amber-50/40">
                              {formatDateBR(lote.dataVencimento)}
                            </td>

                            <td className="p-2.5 text-center">
                              <span
                                className={`font-black text-xs px-2 py-0.5 rounded ${
                                  lote.diasParaVencer < 0
                                    ? 'bg-rose-600 text-white'
                                    : lote.diasParaVencer <= 30
                                    ? 'bg-orange-500 text-white'
                                    : 'bg-slate-100 text-slate-800'
                                }`}
                              >
                                {lote.diasParaVencer}d
                              </span>
                            </td>

                            <td className="p-2.5 text-right font-black text-slate-900">
                              {formatNumberBR(lote.estoqueLivre, 0)} {lote.unidadeMedida}
                            </td>

                            <td className="p-2.5 text-center">
                              <button
                                onClick={() => onOpenAtendimentoModal(lote)}
                                className={`px-3 py-1 rounded text-xs font-bold transition-all shadow-xs cursor-pointer ${
                                  isFefo1
                                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                                    : 'bg-slate-800 hover:bg-slate-700 text-white'
                                }`}
                              >
                                Selecionar
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
