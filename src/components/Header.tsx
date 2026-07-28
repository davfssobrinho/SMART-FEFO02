import React from 'react';
import { Layers, RefreshCw, UploadCloud, Database, UserCheck, LogOut } from 'lucide-react';
import { ConferenteUser } from '../types';

interface HeaderProps {
  lastUpdate: string;
  onOpenImport: () => void;
  onOpenSupabaseSql?: () => void;
  loggedUser?: ConferenteUser | null;
  onOpenLogin?: () => void;
  onLogout?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  lastUpdate,
  onOpenImport,
  onOpenSupabaseSql,
  loggedUser,
  onOpenLogin,
  onLogout,
}) => {
  return (
    <header className="h-14 bg-[#1A202C] text-white border-b border-slate-700/80 sticky top-0 z-30 shadow-md">
      <div className="max-w-[1920px] mx-auto px-4 h-full flex items-center justify-between gap-3">
        {/* Brand logo & title */}
        <div className="flex items-center gap-3">
          <div className="bg-blue-500 p-1.5 rounded shadow-sm text-white flex items-center justify-center">
            <Layers className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold tracking-tight text-white font-sans">
              SMART <span className="text-blue-400">FEFO</span>
            </h1>
            <span className="text-xs bg-slate-700 px-2 py-0.5 rounded text-slate-300 font-medium hidden sm:inline-block">
              Gestão de Reservas Logísticas
            </span>
          </div>
        </div>

        {/* Right action group */}
        <div className="flex items-center gap-2.5">
          {/* Last update indicator */}
          <div className="hidden lg:flex items-center gap-2 bg-slate-800/80 px-3 py-1.5 rounded text-xs text-slate-300 border border-slate-700">
            <RefreshCw className="w-3.5 h-3.5 text-blue-400" />
            <span>SAP: <strong className="text-white font-medium">{lastUpdate}</strong></span>
          </div>

          {/* User Badge if logged in */}
          {loggedUser && (
            <div
              onClick={onOpenLogin}
              title="Clique para alterar usuário"
              className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-800 hover:bg-slate-700/80 text-xs text-slate-200 rounded border border-slate-700 cursor-pointer transition-all"
            >
              <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span className="font-semibold">{loggedUser.nome.split(' ')[0]}</span>
            </div>
          )}



          {/* Quick Import SAP button */}
          <button
            onClick={onOpenImport}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-3.5 py-1.5 rounded shadow-sm transition-all active:scale-95 cursor-pointer"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Importar Dados</span>
          </button>
        </div>
      </div>
    </header>
  );
};



