import React from 'react';
import { Filter, Check } from 'lucide-react';
import { DashboardKpis, FilterState } from '../types';
import { formatNumberBR } from '../services/fefoEngine';

interface DashboardKpiCardsProps {
  kpis: DashboardKpis;
  filteredCount: number;
  totalCount: number;
  filters?: FilterState;
  onFilterChange?: React.Dispatch<React.SetStateAction<FilterState>>;
  onResetFilters?: () => void;
  onNavigateTab?: (tab: 'dashboard' | 'historico' | 'importacao') => void;
}

export const DashboardKpiCards: React.FC<DashboardKpiCardsProps> = ({
  kpis,
  filteredCount,
  totalCount,
  filters,
  onFilterChange,
  onResetFilters,
  onNavigateTab,
}) => {
  const isFiltered = filteredCount !== totalCount;

  const handleToggleStatusFilter = (targetStatus: 'all' | 'com_estoque' | 'criticos' | 'vencendo30' | 'vencidos') => {
    if (!filters || !onFilterChange) return;

    if (targetStatus === 'all') {
      onFilterChange((prev) => ({
        ...prev,
        statusFilter: 'all',
        somenteCriticos: false,
        somenteComEstoque: false,
      }));
      return;
    }

    if (filters.statusFilter === targetStatus) {
      // Toggle off
      onFilterChange((prev) => ({
        ...prev,
        statusFilter: 'all',
      }));
    } else {
      // Toggle on
      onFilterChange((prev) => ({
        ...prev,
        statusFilter: targetStatus,
      }));
    }
  };

  const handleToggleEstoqueLivre = () => {
    if (!filters || !onFilterChange) return;
    onFilterChange((prev) => ({
      ...prev,
      somenteComEstoque: !prev.somenteComEstoque,
      statusFilter: prev.somenteComEstoque ? 'all' : 'com_estoque',
    }));
  };

  const currentFilter = filters?.statusFilter || 'all';
  const isComEstoqueActive = filters?.somenteComEstoque || currentFilter === 'com_estoque';
  const isCriticosActive = filters?.somenteCriticos || currentFilter === 'criticos';
  const isVencendo30Active = currentFilter === 'vencendo30';
  const isVencidosActive = currentFilter === 'vencidos';
  const isAllActive = currentFilter === 'all' && !filters?.somenteComEstoque && !filters?.somenteCriticos;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-2 mb-4 p-3 bg-white border border-slate-200 rounded-lg shadow-xs select-none">
      {/* 1. Total Materiais */}
      <div
        onClick={() => handleToggleStatusFilter('all')}
        title="Clique para mostrar todos os materiais"
        className={`p-2.5 rounded flex flex-col justify-between cursor-pointer transition-all active:scale-95 border ${
          isAllActive
            ? 'bg-slate-100 border-slate-400 ring-2 ring-slate-400/50 shadow-xs'
            : 'bg-slate-50 border-slate-200 hover:border-slate-300 hover:bg-slate-100/70'
        }`}
      >
        <div className="flex items-center justify-between text-[10px] uppercase font-bold text-slate-500 mb-1">
          <span>Total Materiais</span>
          {isAllActive && <Check className="w-3 h-3 text-slate-600" />}
        </div>
        <div className="text-xl font-black text-slate-800">{kpis.totalMateriais}</div>
        <span className="text-[9px] text-slate-500 font-medium mt-0.5 flex items-center gap-1">
          <span>SKUs cadastrados</span>
        </span>
      </div>

      {/* 2. Total Lotes */}
      <div
        onClick={() => handleToggleStatusFilter('all')}
        title="Clique para limpar o filtro de status e ver todos os lotes"
        className={`p-2.5 rounded flex flex-col justify-between cursor-pointer transition-all active:scale-95 border ${
          isAllActive
            ? 'bg-slate-100 border-slate-400 ring-2 ring-slate-400/50 shadow-xs'
            : 'bg-slate-50 border-slate-200 hover:border-slate-300 hover:bg-slate-100/70'
        }`}
      >
        <div className="flex items-center justify-between text-[10px] uppercase font-bold text-slate-500 mb-1">
          <span>Total Lotes</span>
          {isAllActive && <Check className="w-3 h-3 text-slate-600" />}
        </div>
        <div className="text-xl font-black text-slate-800 flex items-baseline gap-1">
          {kpis.totalLotes}
          {isFiltered && <span className="text-xs font-bold text-blue-600">({filteredCount})</span>}
        </div>
        <span className="text-[9px] text-slate-500 font-medium mt-0.5">Lotes rastreados</span>
      </div>

      {/* 3. Estoque Livre Total */}
      <div
        onClick={handleToggleEstoqueLivre}
        title="Clique para filtrar apenas lotes com estoque utilizável livre (> 0)"
        className={`p-2.5 rounded flex flex-col justify-between cursor-pointer transition-all active:scale-95 border ${
          isComEstoqueActive
            ? 'bg-blue-50 border-blue-400 ring-2 ring-blue-500 shadow-xs'
            : 'bg-slate-50 border-slate-200 hover:border-blue-300 hover:bg-blue-50/40'
        }`}
      >
        <div className="flex items-center justify-between text-[10px] uppercase font-bold text-slate-600 mb-1">
          <span>Estoque Livre</span>
          {isComEstoqueActive ? (
            <span className="text-[9px] font-black bg-blue-600 text-white px-1 rounded">ATIVO</span>
          ) : (
            <Filter className="w-3 h-3 text-slate-400" />
          )}
        </div>
        <div className="text-xl font-black text-slate-900 truncate" title={formatNumberBR(kpis.estoqueLivreTotal, 0)}>
          {formatNumberBR(kpis.estoqueLivreTotal, 0)}
        </div>
        <span className="text-[9px] text-slate-500 font-medium mt-0.5">Apenas estoque &gt; 0</span>
      </div>

      {/* 4. Materiais Críticos */}
      <div
        onClick={() => handleToggleStatusFilter('criticos')}
        title="Clique para filtrar lotes críticos (vencimento <= 30 dias ou vencidos)"
        className={`p-2.5 rounded flex flex-col justify-between cursor-pointer transition-all active:scale-95 border ${
          isCriticosActive
            ? 'bg-red-100 border-red-500 ring-2 ring-red-600 shadow-xs'
            : 'bg-red-50/80 border-red-200 hover:border-red-400 hover:bg-red-100/60'
        }`}
      >
        <div className="flex items-center justify-between text-[10px] uppercase font-bold text-red-700 mb-1">
          <span>Críticos</span>
          {isCriticosActive ? (
            <span className="text-[9px] font-black bg-red-600 text-white px-1 rounded">ATIVO</span>
          ) : (
            <Filter className="w-3 h-3 text-red-400" />
          )}
        </div>
        <div className="text-xl font-black text-red-800">{kpis.materiaisCriticos}</div>
        <span className="text-[9px] text-red-700 font-bold mt-0.5">&le; 30d / Vencidos</span>
      </div>

      {/* 5. Vencendo em 30 Dias */}
      <div
        onClick={() => handleToggleStatusFilter('vencendo30')}
        title="Clique para filtrar lotes a vencer entre 0 e 30 dias"
        className={`p-2.5 rounded flex flex-col justify-between cursor-pointer transition-all active:scale-95 border ${
          isVencendo30Active
            ? 'bg-orange-100 border-orange-500 ring-2 ring-orange-600 shadow-xs'
            : 'bg-orange-50/80 border-orange-200 hover:border-orange-400 hover:bg-orange-100/60'
        }`}
      >
        <div className="flex items-center justify-between text-[10px] uppercase font-bold text-orange-800 mb-1">
          <span>Venc. 30 Dias</span>
          {isVencendo30Active ? (
            <span className="text-[9px] font-black bg-orange-600 text-white px-1 rounded">ATIVO</span>
          ) : (
            <Filter className="w-3 h-3 text-orange-400" />
          )}
        </div>
        <div className="text-xl font-black text-orange-900">{kpis.lotesVencendo30Dias}</div>
        <span className="text-[9px] text-orange-800 font-bold mt-0.5">Uso prioritário</span>
      </div>

      {/* 6. Lotes Vencidos */}
      <div
        onClick={() => handleToggleStatusFilter('vencidos')}
        title="Clique para filtrar apenas lotes vencidos"
        className={`p-2.5 rounded flex flex-col justify-between cursor-pointer transition-all active:scale-95 border ${
          isVencidosActive
            ? 'bg-red-200 border-red-700 ring-2 ring-red-800 shadow-xs'
            : 'bg-red-100/80 border-red-300 hover:border-red-500 hover:bg-red-200/60'
        }`}
      >
        <div className="flex items-center justify-between text-[10px] uppercase font-bold text-red-900 mb-1">
          <span>Vencidos</span>
          {isVencidosActive ? (
            <span className="text-[9px] font-black bg-red-900 text-white px-1 rounded">ATIVO</span>
          ) : (
            <Filter className="w-3 h-3 text-red-600" />
          )}
        </div>
        <div className="text-xl font-black text-red-950">{kpis.lotesVencidos}</div>
        <span className="text-[9px] text-red-900 font-bold mt-0.5">Bloqueados</span>
      </div>

      {/* 7. Total Importações */}
      <div
        onClick={() => onNavigateTab && onNavigateTab('importacao')}
        title="Clique para ir à aba de importação de dados SAP"
        className="p-2.5 border border-slate-200 rounded bg-slate-50 hover:bg-slate-100/80 hover:border-slate-300 flex flex-col justify-between cursor-pointer transition-all active:scale-95"
      >
        <div className="text-[10px] uppercase font-bold text-slate-500 mb-1">Importações</div>
        <div className="text-xl font-black text-slate-800">{kpis.totalImportacoes}</div>
        <span className="text-[9px] text-blue-600 font-bold mt-0.5">Ver Cargas SAP &rarr;</span>
      </div>

      {/* 8. Última Atualização */}
      <div
        onClick={() => onResetFilters && onResetFilters()}
        title="Clique para redefinir todos os filtros de busca"
        className="p-2.5 border border-slate-200 rounded bg-slate-50 hover:bg-slate-100/80 hover:border-slate-300 flex flex-col justify-between cursor-pointer transition-all active:scale-95"
      >
        <div className="text-[10px] uppercase font-bold text-slate-500 mb-1">Última Sync</div>
        <div className="text-xs font-bold text-slate-800 truncate" title={kpis.ultimaAtualizacao}>
          {kpis.ultimaAtualizacao}
        </div>
        <span className="text-[9px] text-blue-600 font-bold mt-0.5">Limpar Filtros</span>
      </div>
    </div>
  );
};

