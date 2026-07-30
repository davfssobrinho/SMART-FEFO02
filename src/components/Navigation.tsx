import React from 'react';
import {
  LayoutDashboard,
  FileSpreadsheet,
  History,
  BarChart3,
} from 'lucide-react';

export type TabType =
  | 'dashboard'
  | 'indicadores'
  | 'historico'
  | 'importacao'
  | 'configuracoes';

interface NavigationProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  criticalCount: number;
}

export const Navigation: React.FC<NavigationProps> = ({ activeTab, onTabChange, criticalCount }) => {
  const navItems: {
    id: TabType;
    label: string;
    icon: React.ElementType;
    badge?: string | null;
  }[] = [
    {
      id: 'dashboard',
      label: 'Visão Geral FEFO',
      icon: LayoutDashboard,
      badge: null,
    },
    {
      id: 'indicadores',
      label: 'Indicadores',
      icon: BarChart3,
      badge: null,
    },
    {
      id: 'historico',
      label: 'Histórico & Baixas',
      icon: History,
      badge: null,
    },
    {
      id: 'importacao',
      label: 'Importar SAP',
      icon: FileSpreadsheet,
      badge: null,
    },
  ];

  return (
    <nav className="bg-[#1A202C] text-slate-300 border-b border-slate-700 shadow-xs">
      <div className="max-w-[1920px] mx-auto px-4 flex items-center gap-4 overflow-x-auto scrollbar-none h-12">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`flex items-center gap-2 text-xs font-medium h-12 border-b-2 transition-all whitespace-nowrap cursor-pointer px-1 ${
                isActive
                  ? 'border-blue-400 text-blue-400 font-semibold'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-blue-400' : 'text-slate-400'}`} />
              <span>{item.label}</span>

              {item.id === 'dashboard' && criticalCount > 0 && (
                <span className="bg-red-500/20 text-red-300 text-[10px] px-1.5 py-0.2 rounded font-bold border border-red-500/30">
                  {criticalCount}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};

