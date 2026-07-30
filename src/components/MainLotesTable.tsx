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
  Trash2,
} from 'lucide-react';
import { SapLoteItem } from '../types';
import { formatDateBR, formatNumberBR } from '../services/fefoEngine';
import { ConfirmModal } from './ConfirmModal';

interface MainLotesTableProps {
  lotes: SapLoteItem[];
  selectedLoteId: string | null;
  onSelectLote: (lote: SapLoteItem) => void;
  onOpenAtendimentoModal: (lote: SapLoteItem) => void;
  onDeleteLote?: (id: string) => void;
  onClearAllLotes?: () => void;
}

type SortField =
  | 'prioridadeFEFO'
  | 'materialCode'
  | 'centro'
  | 'deposito'
  | 'posicaoDeposito'
  | 'loteSAP'
  | 'centroDesc'
  | 'materialDesc'
  | 'unidadeMedida'
  | 'tipoAvaliacao'
  | 'loteFornecedor'
  | 'dataCriacaoLote'
  | 'dataFabricacao'
  | 'dataReferencia'
  | 'dataVencimento'
  | 'faixaEtaria'
  | 'diasParaVencer'
  | 'estoqueLivre';

export const MainLotesTable: React.FC<MainLotesTableProps> = ({
  lotes,
  selectedLoteId,
  onSelectLote,
  onOpenAtendimentoModal,
  onDeleteLote,
  onClearAllLotes,
}) => {
  const [sortField, setSortField] = useState<SortField>('prioridadeFEFO');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(25);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

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

        {/* Page size controller & Clear All */}
        <div className="flex items-center gap-3 text-xs text-slate-600">
          {lotes.length > 0 && onClearAllLotes && (
            <button
              onClick={() => {
                setConfirmModal({
                  isOpen: true,
                  title: 'Zerar Tabela de Lotes SAP',
                  message: 'Tem certeza de que deseja apagar TODOS os lotes exibidos na tabela de estoque? Esta ação deixará a base de lotes limpa.',
                  onConfirm: () => {
                    onClearAllLotes();
                  },
                });
              }}
              className="text-xs font-extrabold text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 px-2.5 py-1 rounded border border-rose-200 transition-all cursor-pointer flex items-center gap-1"
              title="Apagar todos os lotes da tabela"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Zerar Lotes</span>
            </button>
          )}

          <div className="flex items-center gap-1.5">
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
                  <span>Classificação FEFO</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>

              {/* 1. Nº Material */}
              <th
                onClick={() => handleSort('materialCode')}
                className="p-2.5 cursor-pointer hover:bg-slate-200/70 transition-colors whitespace-nowrap font-bold"
              >
                <div className="flex items-center gap-1">
                  <span>Nº Material</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>

              {/* 2. Centro */}
              <th
                onClick={() => handleSort('centro')}
                className="p-2.5 cursor-pointer hover:bg-slate-200/70 transition-colors whitespace-nowrap"
              >
                <div className="flex items-center gap-1">
                  <span>Centro</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>

              {/* 3. Depósito */}
              <th
                onClick={() => handleSort('deposito')}
                className="p-2.5 cursor-pointer hover:bg-slate-200/70 transition-colors whitespace-nowrap"
              >
                <div className="flex items-center gap-1">
                  <span>Depósito</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>

              {/* 4. Nº Lote */}
              <th
                onClick={() => handleSort('loteSAP')}
                className="p-2.5 cursor-pointer hover:bg-slate-200/70 transition-colors whitespace-nowrap"
              >
                <div className="flex items-center gap-1">
                  <span>Nº Lote</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>

              {/* 5. Desc. Centro */}
              <th
                onClick={() => handleSort('centroDesc')}
                className="p-2.5 cursor-pointer hover:bg-slate-200/70 transition-colors whitespace-nowrap"
              >
                <div className="flex items-center gap-1">
                  <span>Desc. Centro</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>

              {/* 6. Desc. Material */}
              <th
                onClick={() => handleSort('materialDesc')}
                className="p-2.5 cursor-pointer hover:bg-slate-200/70 transition-colors whitespace-nowrap min-w-[200px]"
              >
                <div className="flex items-center gap-1">
                  <span>Desc. Material</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>

              {/* 7. Unidade Medida */}
              <th
                onClick={() => handleSort('unidadeMedida')}
                className="p-2.5 cursor-pointer hover:bg-slate-200/70 transition-colors whitespace-nowrap text-center"
              >
                <div className="flex items-center justify-center gap-1">
                  <span>Unidade Medida</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>

              {/* 8. Tipo Avaliação */}
              <th
                onClick={() => handleSort('tipoAvaliacao')}
                className="p-2.5 cursor-pointer hover:bg-slate-200/70 transition-colors whitespace-nowrap"
              >
                <div className="flex items-center gap-1">
                  <span>Tipo Avaliação</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>

              {/* 9. Nº Lote Fornecedor */}
              <th
                onClick={() => handleSort('loteFornecedor')}
                className="p-2.5 cursor-pointer hover:bg-slate-200/70 transition-colors whitespace-nowrap"
              >
                <div className="flex items-center gap-1">
                  <span>Nº Lote Fornecedor</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>

              {/* 10. Data Criação Lote */}
              <th
                onClick={() => handleSort('dataCriacaoLote')}
                className="p-2.5 cursor-pointer hover:bg-slate-200/70 transition-colors whitespace-nowrap"
              >
                <div className="flex items-center gap-1">
                  <span>Data Criação Lote</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>

              {/* 11. Data Fabricação */}
              <th
                onClick={() => handleSort('dataFabricacao')}
                className="p-2.5 cursor-pointer hover:bg-slate-200/70 transition-colors whitespace-nowrap"
              >
                <div className="flex items-center gap-1">
                  <span>Data Fabricação</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>

              {/* 12. Data Referência */}
              <th
                onClick={() => handleSort('dataReferencia')}
                className="p-2.5 cursor-pointer hover:bg-slate-200/70 transition-colors whitespace-nowrap"
              >
                <div className="flex items-center gap-1">
                  <span>Data Referência</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>

              {/* 13. Data Vencimento (SLED) */}
              <th
                onClick={() => handleSort('dataVencimento')}
                className="p-2.5 cursor-pointer hover:bg-slate-200/70 transition-colors whitespace-nowrap text-amber-900 bg-amber-50/50"
              >
                <div className="flex items-center gap-1">
                  <span>Data Vencimento (SLED)</span>
                  <ArrowUpDown className="w-3 h-3 text-amber-600" />
                </div>
              </th>

              {/* 14. Faixa Etária */}
              <th
                onClick={() => handleSort('faixaEtaria')}
                className="p-2.5 cursor-pointer hover:bg-slate-200/70 transition-colors whitespace-nowrap text-center"
              >
                <div className="flex items-center justify-center gap-1">
                  <span>Faixa Etária</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>

              {/* Estoque Livre */}
              <th
                onClick={() => handleSort('estoqueLivre')}
                className="p-2.5 cursor-pointer hover:bg-slate-200/70 transition-colors whitespace-nowrap text-right font-black"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Estoque Livre</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>

              {/* Status */}
              <th className="p-2.5 whitespace-nowrap text-center">Status FEFO / Validade</th>

              {/* Ação */}
              <th className="p-2.5 whitespace-nowrap text-center">Ação</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {paginatedLotes.length === 0 ? (
              <tr>
                <td colSpan={18} className="p-8 text-center text-slate-400 italic">
                  Nenhum lote encontrado na base de estoque.
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
                        ? 'bg-green-50/80 border-green-100 hover:bg-green-100/80 font-medium text-slate-900'
                        : lote.diasParaVencer <= 30
                        ? 'bg-red-50/40 hover:bg-red-50/80 border-slate-100 text-slate-800'
                        : lote.diasParaVencer <= 60
                        ? 'bg-amber-50/40 hover:bg-amber-50/80 border-slate-100 text-slate-800'
                        : 'hover:bg-slate-50 border-slate-100 text-slate-800'
                    }`}
                  >
                    {/* Classificação FEFO */}
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

                    {/* 1. Nº Material */}
                    <td className="p-2.5 font-extrabold text-slate-900 font-mono tracking-tight whitespace-nowrap">
                      {lote.materialCode}
                    </td>

                    {/* 2. Centro */}
                    <td className="p-2.5 whitespace-nowrap font-semibold text-slate-700">
                      {lote.centro || '-'}
                    </td>

                    {/* 3. Depósito */}
                    <td className="p-2.5 whitespace-nowrap font-bold text-slate-800">
                      {lote.deposito || '-'}
                    </td>

                    {/* 4. Nº Lote */}
                    <td className="p-2.5 font-mono font-bold text-slate-900 whitespace-nowrap">
                      {lote.loteSAP}
                    </td>

                    {/* 5. Desc. Centro */}
                    <td className="p-2.5 whitespace-nowrap text-slate-600 text-[11px]">
                      {lote.centroDesc || '-'}
                    </td>

                    {/* 6. Desc. Material */}
                    <td className="p-2.5">
                      <div className="font-bold text-slate-800 text-xs line-clamp-2" title={lote.materialDesc}>
                        {lote.materialDesc}
                      </div>
                    </td>

                    {/* 7. Unidade Medida */}
                    <td className="p-2.5 text-center font-bold text-slate-700 whitespace-nowrap">
                      {lote.unidadeMedida || 'UN'}
                    </td>

                    {/* 8. Tipo Avaliação */}
                    <td className="p-2.5 whitespace-nowrap text-slate-600 text-xs">
                      {lote.tipoAvaliacao || '-'}
                    </td>

                    {/* 9. Nº Lote Fornecedor */}
                    <td className="p-2.5 font-mono text-slate-600 whitespace-nowrap">
                      {lote.loteFornecedor || '-'}
                    </td>

                    {/* 10. Data Criação Lote */}
                    <td className="p-2.5 text-slate-600 whitespace-nowrap">
                      {formatDateBR(lote.dataCriacaoLote)}
                    </td>

                    {/* 11. Data Fabricação */}
                    <td className="p-2.5 text-slate-700 font-medium whitespace-nowrap">
                      {formatDateBR(lote.dataFabricacao)}
                    </td>

                    {/* 12. Data Referência */}
                    <td className="p-2.5 text-slate-600 whitespace-nowrap">
                      {formatDateBR(lote.dataReferencia)}
                    </td>

                    {/* 13. Data Vencimento (SLED) */}
                    <td className="p-2.5 font-bold text-amber-950 bg-amber-50/50 whitespace-nowrap">
                      {formatDateBR(lote.dataVencimento)}
                    </td>

                    {/* 14. Faixa Etária */}
                    <td className="p-2.5 text-center whitespace-nowrap font-medium text-slate-700">
                      {lote.faixaEtaria || 'NORMAL'}
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
                      <div className="flex items-center justify-center gap-1.5">
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

                        {onDeleteLote && (
                          <button
                            onClick={() => {
                              setConfirmModal({
                                isOpen: true,
                                title: 'Apagar Lote do Estoque',
                                message: `Deseja realmente remover o lote ${lote.loteSAP} (Material ${lote.materialCode}) da tabela de estoque?`,
                                onConfirm: () => {
                                  onDeleteLote(lote.id);
                                },
                              });
                            }}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                            title="Apagar este lote do estoque"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
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

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onClose={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};
