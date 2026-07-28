import React, { useState } from 'react';
import {
  LogIn,
  ChevronRight,
  X,
  AlertCircle,
  Building2,
} from 'lucide-react';
import { ConferenteUser } from '../types';

interface LoginModalProps {
  isOpen: boolean;
  conferentes: ConferenteUser[];
  currentLoggedUser: ConferenteUser | null;
  onSelectUser: (user: ConferenteUser) => void;
  onClose?: () => void;
  canClose?: boolean;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  conferentes,
  onSelectUser,
  onClose,
  canClose = false,
}) => {
  const [usernameInput, setUsernameInput] = useState<string>('ambev');
  const [passwordInput, setPasswordInput] = useState<string>('latas');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  // Handle Login Submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanUser = usernameInput.trim().toLowerCase();
    const cleanPass = passwordInput.trim();

    // 1. Standard Master Ambev Login
    if (cleanUser === 'ambev' && cleanPass === 'latas') {
      const ambevMasterUser: ConferenteUser = {
        id: 'CONF-AMBEV',
        nome: 'Operador AMBEV',
        matricula: 'AMB-2026',
        turno: 'Geral / 24h',
        perfil: 'administrador',
        status: 'Ativo',
        areaProducao: 'Gestão de Estoque',
      };
      onSelectUser(ambevMasterUser);
      if (onClose) onClose();
      return;
    }

    // 2. Search operator by matricula, name, or id with password 'latas'
    const foundOperator = conferentes.find(
      (c) =>
        c.matricula.toLowerCase() === cleanUser ||
        c.nome.toLowerCase().includes(cleanUser) ||
        c.id.toLowerCase() === cleanUser
    );

    if (foundOperator && cleanPass === 'latas') {
      onSelectUser(foundOperator);
      if (onClose) onClose();
      return;
    }

    setErrorMessage('Usuário ou senha incorretos.');
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-slate-900 text-white p-6 relative border-b border-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600/30 border border-blue-500/40 flex items-center justify-center text-blue-400">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-black tracking-tight text-white">Acesso ao Sistema</h2>
                <p className="text-xs text-slate-400">Controle de Estoque & Logística FEFO</p>
              </div>
            </div>
            {canClose && onClose && (
              <button
                onClick={onClose}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Error Alert Box */}
        {errorMessage && (
          <div className="mx-6 mt-5 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
              Usuário
            </label>
            <input
              type="text"
              required
              value={usernameInput}
              onChange={(e) => {
                setUsernameInput(e.target.value);
                setErrorMessage(null);
              }}
              placeholder="Ex: ambev"
              className="w-full bg-slate-50 border border-slate-300 text-slate-900 font-bold text-sm px-3.5 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
              Senha
            </label>
            <input
              type="password"
              required
              value={passwordInput}
              onChange={(e) => {
                setPasswordInput(e.target.value);
                setErrorMessage(null);
              }}
              placeholder="Ex: latas"
              className="w-full bg-slate-50 border border-slate-300 text-slate-900 font-bold text-sm px-3.5 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
            />
          </div>

          {/* Submit button */}
          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black text-xs py-3 px-4 rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 active:scale-98 cursor-pointer mt-2"
          >
            <LogIn className="w-4 h-4 stroke-[2.5]" />
            <span>Entrar no Sistema</span>
            <ChevronRight className="w-4 h-4 ml-auto" />
          </button>
        </form>

        {/* Footer */}
        <div className="bg-slate-100 border-t border-slate-200 px-6 py-2.5 flex items-center justify-between text-[11px] text-slate-500 font-medium">
          <span>AMBEV FEFO System</span>
          <span>Acesso Protegido</span>
        </div>
      </div>
    </div>
  );
};


