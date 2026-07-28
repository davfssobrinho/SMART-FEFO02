import React from 'react';
import { Search, Filter, RotateCcw, ChevronDown, CheckSquare, Square } from 'lucide-react';
import { FilterState, SapLoteItem } from '../types';

interface SidebarFiltersProps {
  filters: FilterState;
  onFilterChange: (newFilters: FilterState) => void;
  onResetFilters: () => void;
  lotes: SapLoteItem[];
  isOpenMobile: boolean;
  onToggleMobile: () => void;
}

export const SidebarFilters: React.FC<SidebarFiltersProps> = ({
  filters,
  onFilterChange,
  onResetFilters,
  lotes,
  isOpenMobile,
  onToggleMobile,
}) => {
  // Extract unique values for select dropdowns
  const uniqueMaterialCodes = Array.from(new Set(lotes.map((l) => l.materialCode))).sort();
  const uniqueDepositos = Array.from(new Set(lotes.map((l) => l.deposito))).sort();
  const uniqueCentros = Array.from(new Set(lotes.map((l) => l.centro))).sort();
  const uniqueGrupos = Array.from(new Set(lotes.map((l) => l.grupoMercadoriaDesc || l.grupoMercadoria))).sort();
  const uniqueTipos = Array.from(new Set(lotes.map((l) => l.tipoMaterialDesc || l.tipoMaterial))).sort();
  const uniqueFornecedores = Array.from(new Set(lotes.map((l) => l.fornecedor))).sort();

  const handleTextChange = (field: keyof FilterState, value: string | boolean) => {
    onFilterChange({
      ...filters,
      [field]: value,
    });
  };

  const activeFiltersCount = Object.entries(filters).filter(([key, val]) => {
    if (key === 'somenteComEstoque' && val === true) return false; // Default is true
    if (typeof val === 'boolean') return val === true;
    return Boolean(val);
  }).length;

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 bg-slate-900/60 z-20 md:hidden backdrop-blur-xs"
          onClick={onToggleMobile}
        />
      )}

      {/* Filter Sidebar Container */}
      <aside
        className={`bg-slate-50 text-slate-800 w-64 flex-shrink-0 border-r border-slate-200 p-4 flex flex-col gap-3 h-[calc(100vh-105px)] overflow-y-auto sticky top-[105px] transition-all z-20 ${
          isOpenMobile ? 'fixed left-0 top-[105px] bottom-0 z-30 shadow-2xl bg-white' : 'hidden md:flex'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-200">
          <div className="flex items-center gap-1.5">
            <Filter className="w-4 h-4 text-blue-600" />
            <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-700">Filtros Power BI</h2>
            {activeFiltersCount > 0 && (
              <span className="bg-blue-600 text-white font-extrabold text-[10px] px-1.5 py-0.2 rounded-full">
                {activeFiltersCount}
              </span>
            )}
          </div>
          <button
            onClick={onResetFilters}
            className="text-[11px] text-blue-600 hover:text-blue-800 flex items-center gap-1 transition-colors cursor-pointer font-medium"
            title="Limpar todos os filtros"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Limpar</span>
          </button>
        </div>

        {/* 1. Smart Search Box */}
        <div className="flex flex-col gap-1">
          <label className="text-[10px] uppercase font-bold text-slate-500">Pesquisa Rápida</label>
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Cód, Descrição, Lote SAP..."
              value={filters.searchTerm}
              onChange={(e) => handleTextChange('searchTerm', e.target.value)}
              className="w-full bg-white text-slate-800 placeholder-slate-400 text-xs pl-8 pr-2 py-1.5 rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-400"
            />
          </div>
        </div>

        {/* Checkbox Toggles */}
        <div className="flex flex-col gap-2 pt-2 border-t border-slate-200">
          <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={filters.somenteComEstoque}
              onChange={(e) => handleTextChange('somenteComEstoque', e.target.checked)}
              className="accent-blue-600 rounded w-3.5 h-3.5"
            />
            <span>Somente com estoque (&gt; 0)</span>
          </label>

          <label className="flex items-center gap-2 text-xs font-medium text-red-700 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={filters.somenteCriticos}
              onChange={(e) => handleTextChange('somenteCriticos', e.target.checked)}
              className="accent-red-600 rounded w-3.5 h-3.5"
            />
            <span>Somente críticos (&le; 30d / Vencidos)</span>
          </label>
        </div>

        {/* 2. Código Material */}
        <div className="flex flex-col gap-1">
          <label className="text-[10px] uppercase font-bold text-slate-500">Código Material</label>
          <select
            value={filters.materialCode}
            onChange={(e) => handleTextChange('materialCode', e.target.value)}
            className="bg-white text-slate-800 text-xs px-2 py-1.5 rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-400 cursor-pointer"
          >
            <option value="">Todos os Códigos</option>
            {uniqueMaterialCodes.map((code) => (
              <option key={code} value={code}>
                {code}
              </option>
            ))}
          </select>
        </div>

        {/* 3. Depósito */}
        <div className="flex flex-col gap-1">
          <label className="text-[10px] uppercase font-bold text-slate-500">Depósito</label>
          <select
            value={filters.deposito}
            onChange={(e) => handleTextChange('deposito', e.target.value)}
            className="bg-white text-slate-800 text-xs px-2 py-1.5 rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-400 cursor-pointer"
          >
            <option value="">Todos os Depósitos</option>
            {uniqueDepositos.map((dep) => (
              <option key={dep} value={dep}>
                {dep}
              </option>
            ))}
          </select>
        </div>

        {/* 5. Grupo Mercadoria */}
        <div className="flex flex-col gap-1">
          <label className="text-[10px] uppercase font-bold text-slate-500">Grupo Mercadoria</label>
          <select
            value={filters.grupoMercadoria}
            onChange={(e) => handleTextChange('grupoMercadoria', e.target.value)}
            className="bg-white text-slate-800 text-xs px-2 py-1.5 rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-400 cursor-pointer"
          >
            <option value="">Todos os Grupos</option>
            {uniqueGrupos.map((grp) => (
              <option key={grp} value={grp}>
                {grp}
              </option>
            ))}
          </select>
        </div>

        {/* 6. Tipo Material */}
        <div className="flex flex-col gap-1">
          <label className="text-[10px] uppercase font-bold text-slate-500">Tipo Material</label>
          <select
            value={filters.tipoMaterial}
            onChange={(e) => handleTextChange('tipoMaterial', e.target.value)}
            className="bg-white text-slate-800 text-xs px-2 py-1.5 rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-400 cursor-pointer"
          >
            <option value="">Todos os Tipos</option>
            {uniqueTipos.map((tp) => (
              <option key={tp} value={tp}>
                {tp}
              </option>
            ))}
          </select>
        </div>

        {/* 7. Fornecedor */}
        <div className="flex flex-col gap-1">
          <label className="text-[10px] uppercase font-bold text-slate-500">Fornecedor</label>
          <select
            value={filters.fornecedor}
            onChange={(e) => handleTextChange('fornecedor', e.target.value)}
            className="bg-white text-slate-800 text-xs px-2 py-1.5 rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-400 cursor-pointer"
          >
            <option value="">Todos os Fornecedores</option>
            {uniqueFornecedores.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </div>

        {/* 8. Lote SAP */}
        <div className="flex flex-col gap-1">
          <label className="text-[10px] uppercase font-bold text-slate-500">Nº Lote SAP</label>
          <input
            type="text"
            placeholder="Ex: 0002847190"
            value={filters.loteSAP}
            onChange={(e) => handleTextChange('loteSAP', e.target.value)}
            className="bg-white text-slate-800 text-xs px-2 py-1.5 rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-400"
          />
        </div>

        {/* Reset Action */}
        <div className="mt-auto pt-3 border-t border-slate-200">
          <button
            onClick={onResetFilters}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-2 rounded shadow-xs transition-colors cursor-pointer"
          >
            Redefinir Filtros
          </button>
        </div>
      </aside>
    </>
  );
};
