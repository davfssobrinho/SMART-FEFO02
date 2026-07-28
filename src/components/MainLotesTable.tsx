import React, { useState } from 'react';
import {
  ArrowUpDown,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  Clock,
  Layers,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Building2,
  Box,
} from 'lucide-react';
import { SapLoteItem } from '../types';
import { formatDateBR, formatNumberBR } from '../services/fefoEngine';

interface MainLotesTableProps {
  lotes: SapLoteItem[];
  selectedLoteId: string | null;
  onSelectLote: (lote: SapLoteItem) => void;
  onOpenAtendimentoModal: (lote: SapLoteItem) => void;
}

type SortField = 'prioridadeFEFO' | 'materialCode' | 'materialDesc' | 'deposito' | 'loteSAP' | 'dataFabricacao' | 'dataVencimento' | 'diasParaVencer' | 'estoqueLivre';

export const MainLotesTable: React.FC<MainLotesTableProps> = ({
  lotes,
  selectedLoteId,
  onSelectLote,
  onOpenAtendimentoModal,
}) => {
  const [sortField, setSortField] = useState<SortField>('prioridadeFEFO');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(25);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  // Sort lotes
  const sortedLotes = [...lotes].sort((a, b) => {
    let aVal: unknown = a[sortField];
    let bVal: unknown = b[sortField];

    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return sortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    }
    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
    }
    return 0;
  });

  // Pagination calculation
  const totalItems = sortedLotes.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedLotes = sortedLotes.slice(startIndex, startIndex + pageSize);

  // Status Badge Renderer according to Professional Polish specification
  const renderStatusBadge = (lote: SapLoteItem) => {
    const { prioridadeFEFO, diasParaVencer, estoqueLivre } = lote;

    if (estoqueLivre <= 0) {
      return (
        <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-600 border border-slate-200 text-[10px] font-semibold px-2 py-0.5 rounded-full">
          <Box className="w-3 h-3 text-slate-400" />
          Sem Estoque
        </span>
      );
    }

    if (diasParaVencer < 0) {
      return (
        <span className="inline-flex items-center gap-1 bg-red-100 text-red-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
          <AlertOctagon className="w-3 h-3 text-red-600" />
          Vencido ({Math.abs(diasParaVencer)}d)
        </span>
      );
    }

    if (diasParaVencer <= 30) {
      return (
        <span className="inline-flex items-center gap-1 bg-red-100 text-red-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
          <AlertTriangle className="w-3 h-3 text-red-600" />
          Crítico (&le; 30d)
        </span>
      );
    }

    if (diasParaVencer <= 60) {
      return (
        <span className="inline-flex items-center gap-1 bg-orange-100 text-orange-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
          <Clock className="w-3 h-3 text-orange-600" />
          Atenção (&le; 60d)
        </span>
      );
    }

    if (prioridadeFEFO === 1) {
      return (
        <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
          <Sparkles className="w-3 h-3 text-green-600 fill-green-600" />
          Recomendado FEFO
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
        <CheckCircle2 className="w-3 h-3 text-blue-600" />
        Lote Regular
      </span>
    );
  };

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm flex flex-col h-full overflow-hidden">
      {/* Table Bar Header */}
      <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-amber-600" />
          <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
            Tabela Principal de Lotes (Estoque Individual por Lote SAP)
          </h3>
          <span className="text-xs text-slate-500 bg-slate-200/80 px-2 py-0.5 rounded-full font-semibold">
            {totalItems} lotes encontrados
          </span>
        </div>

        {/* Page size controller */}
        <div className="flex items-center gap-2 text-xs text-slate-600">
          <span>Exibir por página:</span>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="bg-white border border-slate-300 rounded px-2 py-1 text-xs font-medium focus:outline-none focus:border-amber-500"
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="flex-1 overflow-x-auto overflow-y-auto min-h-[400px]">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-slate-100/90 text-slate-700 font-bold uppercase tracking-wider text-[11px] sticky top-0 z-10 border-b border-slate-200">
            <tr>
              {/* Prioridade FEFO */}
              <th
                onClick={() => handleSort('prioridadeFEFO')}
                className="p-2.5 cursor-pointer hover:bg-slate-200/70 transition-colors whitespace-nowrap text-center w-28"
              >
                <div className="flex items-center justify-center gap-1">
                  <span>Prioridade FEFO</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>

              {/* Nº Material */}
              <th
                onClick={() => handleSort('materialCode')}
                className="p-2.5 cursor-pointer hover:bg-slate-200/70 transition-colors whitespace-nowrap font-bold"
              >
                <div className="flex items-center gap-1">
                  <span>Nº Material</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>

              {/* Desc. Material */}
              <th
                onClick={() => handleSort('materialDesc')}
                className="p-2.5 cursor-pointer hover:bg-slate-200/70 transition-colors whitespace-nowrap min-w-[180px]"
              >
                <div className="flex items-center gap-1">
                  <span>Desc. Material</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>

              {/* Depósito */}
              <th
                onClick={() => handleSort('deposito')}
                className="p-2.5 cursor-pointer hover:bg-slate-200/70 transition-colors whitespace-nowrap"
              >
                <div className="flex items-center gap-1">
                  <span>Depósito</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>

              {/* Nº Lote (SAP) */}
              <th
                onClick={() => handleSort('loteSAP')}
                className="p-2.5 cursor-pointer hover:bg-slate-200/70 transition-colors whitespace-nowrap"
              >
                <div className="flex items-center gap-1">
                  <span>Nº Lote (SAP)</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>

              {/* Nº Lote Fornecedor */}
              <th className="p-2.5 whitespace-nowrap">Nº Lote Fornecedor</th>

              {/* Data Fabricação */}
              <th
                onClick={() => handleSort('dataFabricacao')}
                className="p-2.5 cursor-pointer hover:bg-slate-200/70 transition-colors whitespace-nowrap"
              >
                <div className="flex items-center gap-1">
                  <span>Data Fabricação</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>

              {/* Data Vencimento (Sled) */}
              <th
                onClick={() => handleSort('dataVencimento')}
                className="p-2.5 cursor-pointer hover:bg-slate-200/70 transition-colors whitespace-nowrap text-amber-900 bg-amber-50/50"
              >
                <div className="flex items-center gap-1">
                  <span>Data Vencimento (Sled)</span>
                  <ArrowUpDown className="w-3 h-3 text-amber-600" />
                </div>
              </th>

              {/* Dias p/ Vencer */}
              <th
                onClick={() => handleSort('diasParaVencer')}
                className="p-2.5 cursor-pointer hover:bg-slate-200/70 transition-colors whitespace-nowrap text-center"
              >
                <div className="flex items-center justify-center gap-1">
                  <span>Dias p/ Vencer</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>

              {/* Estoque Utiliz. Livre */}
              <th
                onClick={() => handleSort('estoqueLivre')}
                className="p-2.5 cursor-pointer hover:bg-slate-200/70 transition-colors whitespace-nowrap text-right font-black"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Estoque Utiliz. Livre</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>

              {/* Status */}
              <th className="p-2.5 whitespace-nowrap text-center">Status</th>

              {/* Ação */}
              <th className="p-2.5 whitespace-nowrap text-center">Ação</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {paginatedLotes.length === 0 ? (
              <tr>
                <td colSpan={12} className="p-8 text-center text-slate-400 italic">
                  Nenhum lote encontrado com os filtros atuais.
                </td>
              </tr>
            ) : (
              paginatedLotes.map((lote) => {
                const isSelected = selectedLoteId === lote.id;
                const isFefo1 = lote.prioridadeFEFO === 1;

                return (
                  <tr
                    key={lote.id}
                    onClick={() => onSelectLote(lote)}
                    className={`transition-colors cursor-pointer text-[12px] border-b ${
                      isSelected
                        ? 'bg-blue-100/80 ring-2 ring-blue-500 ring-inset font-semibold'
                        : isFefo1
                        ? 'bg-green-50 border-green-100 hover:bg-green-100/80 font-bold text-green-800'
                        : lote.prioridadeFEFO === 2
                        ? 'bg-blue-50/60 border-blue-100 hover:bg-blue-100/60 text-blue-800'
                        : 'hover:bg-slate-50 border-slate-100 text-slate-800'
                    }`}
                  >
                    {/* Prioridade FEFO */}
                    <td className="p-2.5 text-center">
                      {isFefo1 ? (
                        <span className="inline-flex items-center gap-1 bg-green-600 text-white font-extrabold text-[10px] px-2 py-0.5 rounded-full shadow-xs">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          #1 FEFO
                        </span>
                      ) : (
                        <span className="inline-flex items-center justify-center bg-slate-100 text-slate-700 font-bold text-[10px] px-2 py-0.5 rounded-full border border-slate-200">
                          #{lote.prioridadeFEFO}
                        </span>
                      )}
                    </td>

                    {/* Nº Material */}
                    <td className="p-2.5 font-extrabold text-slate-900 font-mono tracking-tight whitespace-nowrap">
                      {lote.materialCode}
                    </td>

                    {/* Desc. Material */}
                    <td className="p-2.5">
                      <div className="font-medium text-slate-800 text-xs line-clamp-2" title={lote.materialDesc}>
                        {lote.materialDesc}
                      </div>
                    </td>

                    {/* Depósito */}
                    <td className="p-2.5 whitespace-nowrap">
                      <div className="font-bold text-slate-800">{lote.deposito}</div>
                      {lote.posicaoDeposito && !lote.deposito.includes(lote.posicaoDeposito) && (
                        <div className="text-[10px] text-slate-500 font-mono">{lote.posicaoDeposito}</div>
                      )}
                    </td>

                    {/* Nº Lote (SAP) */}
                    <td className="p-2.5 font-mono font-bold text-slate-900 whitespace-nowrap">
                      {lote.loteSAP}
                    </td>

                    {/* Nº Lote Fornecedor */}
                    <td className="p-2.5 font-mono text-slate-600 whitespace-nowrap">
                      {lote.loteFornecedor || '-'}
                    </td>

                    {/* Data Fabricação */}
                    <td className="p-2.5 text-slate-700 font-medium whitespace-nowrap">
                      {formatDateBR(lote.dataFabricacao)}
                    </td>

                    {/* Data Vencimento (Sled) */}
                    <td className="p-2.5 font-bold text-amber-950 bg-amber-50/30 whitespace-nowrap">
                      {formatDateBR(lote.dataVencimento)}
                    </td>

                    {/* Dias p/ Vencer */}
                    <td className="p-2.5 text-center whitespace-nowrap">
                      <span
                        className={`font-black text-xs px-2 py-0.5 rounded ${
                          lote.diasParaVencer < 0
                            ? 'bg-rose-600 text-white'
                            : lote.diasParaVencer <= 30
                            ? 'bg-orange-500 text-white'
                            : lote.diasParaVencer <= 60
                            ? 'bg-amber-400 text-slate-950'
                            : 'bg-slate-100 text-slate-800'
                        }`}
                      >
                        {lote.diasParaVencer}d
                      </span>
                    </td>

                    {/* Estoque Utiliz. Livre */}
                    <td className="p-2.5 text-right font-black text-slate-900 text-xs whitespace-nowrap">
                      {formatNumberBR(lote.estoqueLivre, 0)}{' '}
                      <span className="text-[10px] text-slate-500 font-normal uppercase">{lote.unidadeMedida}</span>
                    </td>

                    {/* Status */}
                    <td className="p-2.5 text-center whitespace-nowrap">
                      {renderStatusBadge(lote)}
                    </td>

                    {/* Ação */}
                    <td className="p-2.5 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => onOpenAtendimentoModal(lote)}
                        className={`px-3 py-1.5 rounded text-xs font-extrabold transition-all shadow-xs cursor-pointer active:scale-95 ${
                          isFefo1
                            ? 'bg-green-600 hover:bg-green-700 text-white'
                            : 'bg-slate-800 hover:bg-black text-white'
                        }`}
                      >
                        Dar Baixa em Reserva
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Table Footer Pagination */}
      <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between text-xs text-slate-600 gap-2">
        <div>
          Exibindo <strong className="text-slate-800">{startIndex + 1}</strong> até{' '}
          <strong className="text-slate-800">{Math.min(startIndex + pageSize, totalItems)}</strong> de{' '}
          <strong className="text-slate-800">{totalItems}</strong> lotes individuais
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="p-1 rounded border border-slate-300 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="px-2 font-medium">
            Página {currentPage} de {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="p-1 rounded border border-slate-300 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
