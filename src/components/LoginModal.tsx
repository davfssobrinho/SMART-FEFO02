import React, { useState } from 'react';
import {
  LogIn,
  UserPlus,
  ChevronRight,
  X,
  AlertCircle,
  CheckCircle2,
  Lock,
  Mail,
  User as UserIcon,
  Sparkles,
  Info,
  Loader2,
  KeyRound,
} from 'lucide-react';
import { ConferenteUser } from '../types';
import { signInWithSupabaseEmail, signUpWithSupabaseEmail } from '../services/supabaseClient';

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
  const [isRegisterMode, setIsRegisterMode] = useState<boolean>(false);
  const [emailInput, setEmailInput] = useState<string>('');
  const [passwordInput, setPasswordInput] = useState<string>('');
  const [nameInput, setNameInput] = useState<string>('');
  
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showSupabaseGuide, setShowSupabaseGuide] = useState<boolean>(false);

  if (!isOpen) return null;

  // Handle Form Submit (Login or Cadastrar)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanEmail = emailInput.trim();
    const cleanPass = passwordInput.trim();

    if (!cleanEmail || !cleanPass) {
      setErrorMessage('Por favor, preencha todos os campos.');
      return;
    }

    // 1. Check for legacy/master bypass login ("ambev" / "latas")
    if ((cleanEmail.toLowerCase() === 'ambev' || cleanEmail.toLowerCase() === 'admin') && cleanPass === 'latas') {
      const masterUser: ConferenteUser = {
        id: 'CONF-AMBEV',
        nome: 'Operador AMBEV (Master)',
        matricula: 'AMB-2026',
        turno: 'Geral / 24h',
        perfil: 'administrador',
        status: 'Ativo',
        areaProducao: 'Gestão de Estoque',
      };
      onSelectUser(masterUser);
      if (onClose) onClose();
      return;
    }

    // Check operator list match by matricula or name if password is 'latas'
    const foundOperator = conferentes.find(
      (c) =>
        c.matricula.toLowerCase() === cleanEmail.toLowerCase() ||
        c.nome.toLowerCase() === cleanEmail.toLowerCase()
    );

    if (foundOperator && cleanPass === 'latas') {
      onSelectUser(foundOperator);
      if (onClose) onClose();
      return;
    }

    setIsLoading(true);

    try {
      if (isRegisterMode) {
        // --- REGISTRATION FLOW ---
        const result = await signUpWithSupabaseEmail(cleanEmail, cleanPass, nameInput);
        
        if (!result.success) {
          setErrorMessage(result.message || 'Erro ao criar conta no Supabase Auth.');
          setShowSupabaseGuide(true);
        } else {
          setSuccessMessage(result.message || 'Conta criada com sucesso no Supabase!');
          
          if (result.user) {
            // Log in user
            setTimeout(() => {
              if (result.user) {
                onSelectUser(result.user);
                if (onClose) onClose();
              }
            }, 1200);
          }
        }
      } else {
        // --- LOGIN FLOW ---
        const result = await signInWithSupabaseEmail(cleanEmail, cleanPass);
        
        if (!result.success) {
          setErrorMessage(result.message || 'Falha ao autenticar.');
          setShowSupabaseGuide(true);
        } else if (result.user) {
          setSuccessMessage('Autenticado com sucesso! Redirecionando...');
          setTimeout(() => {
            if (result.user) {
              onSelectUser(result.user);
              if (onClose) onClose();
            }
          }, 800);
        }
      }
    } catch (err: any) {
      setErrorMessage(`Erro no Supabase: ${err?.message || 'Falha de comunicação'}`);
      setShowSupabaseGuide(true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 z-50 flex items-center justify-center p-4 backdrop-blur-md animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="bg-slate-900 text-white p-6 relative border-b border-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 border border-blue-400/30 flex items-center justify-center text-white shadow-md">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-black tracking-tight text-white flex items-center gap-2">
                  Smart FEFO
                </h2>
                <p className="text-xs text-slate-400 font-medium">
                  {isRegisterMode ? 'Criar nova conta no Supabase Auth' : 'Autenticação & Controle de Estoque'}
                </p>
              </div>
            </div>
            {canClose && onClose && (
              <button
                onClick={onClose}
                className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Tab Switcher (Entrar / Cadastrar) */}
        <div className="flex border-b border-slate-200 bg-slate-50 p-1">
          <button
            type="button"
            onClick={() => {
              setIsRegisterMode(false);
              setErrorMessage(null);
              setSuccessMessage(null);
            }}
            className={`flex-1 py-2.5 text-xs font-extrabold rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
              !isRegisterMode
                ? 'bg-white text-blue-600 shadow-sm border border-slate-200'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <LogIn className="w-4 h-4" />
            <span>Entrar</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setIsRegisterMode(true);
              setErrorMessage(null);
              setSuccessMessage(null);
            }}
            className={`flex-1 py-2.5 text-xs font-extrabold rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
              isRegisterMode
                ? 'bg-white text-blue-600 shadow-sm border border-slate-200'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            <span>Cadastrar-se</span>
          </button>
        </div>

        {/* Status Alerts */}
        {errorMessage && (
          <div className="mx-6 mt-4 p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">{errorMessage}</p>
            </div>
          </div>
        )}

        {successMessage && (
          <div className="mx-6 mt-4 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-medium flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">{successMessage}</p>
            </div>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
          
          {/* Nome Input (Only in Register mode) */}
          {isRegisterMode && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                Nome Completo
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <UserIcon className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required={isRegisterMode}
                  value={nameInput}
                  onChange={(e) => {
                    setNameInput(e.target.value);
                    setErrorMessage(null);
                  }}
                  placeholder="Ex: João Silva"
                  className="w-full bg-slate-50 border border-slate-300 text-slate-900 font-semibold text-sm pl-10 pr-3.5 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                />
              </div>
            </div>
          )}

          {/* Email Input */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
              Email
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Mail className="w-4 h-4" />
              </div>
              <input
                type="email"
                required
                value={emailInput}
                onChange={(e) => {
                  setEmailInput(e.target.value);
                  setErrorMessage(null);
                }}
                placeholder="Ex: usuario@empresa.com"
                className="w-full bg-slate-50 border border-slate-300 text-slate-900 font-semibold text-sm pl-10 pr-3.5 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
              />
            </div>
          </div>

          {/* Senha Input */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
              Senha
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type="password"
                required
                value={passwordInput}
                onChange={(e) => {
                  setPasswordInput(e.target.value);
                  setErrorMessage(null);
                }}
                placeholder="Sua senha secreta"
                className="w-full bg-slate-50 border border-slate-300 text-slate-900 font-semibold text-sm pl-10 pr-3.5 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-black text-xs py-3 px-4 rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 active:scale-98 cursor-pointer mt-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Processando...</span>
              </>
            ) : isRegisterMode ? (
              <>
                <UserPlus className="w-4 h-4 stroke-[2.5]" />
                <span>Cadastrar Usuário</span>
                <ChevronRight className="w-4 h-4 ml-auto" />
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4 stroke-[2.5]" />
                <span>Entrar</span>
                <ChevronRight className="w-4 h-4 ml-auto" />
              </>
            )}
          </button>
        </form>

        {/* Supabase Providers Guide Notice Box */}
        <div className="mx-6 mb-4 p-3.5 bg-slate-900 text-slate-200 rounded-xl border border-slate-800 text-[11px] leading-relaxed">
          <div className="flex items-center gap-2 font-bold text-blue-400 mb-1.5">
            <Info className="w-4 h-4" />
            <span>Configuração do Supabase Auth:</span>
          </div>
          <p className="text-slate-300 font-medium">
            Para permitir login e cadastro por e-mail, verifique no painel Supabase:
          </p>
          <div className="mt-2 bg-slate-950 p-2 rounded border border-slate-800 text-[10px] font-mono text-emerald-400 flex items-center gap-1.5 flex-wrap">
            <span className="text-slate-400">Authentication</span>
            <span>&rarr;</span>
            <span className="text-slate-400">Providers</span>
            <span>&rarr;</span>
            <span className="text-slate-400">Email</span>
            <span>&rarr;</span>
            <span className="bg-emerald-950 text-emerald-300 font-extrabold px-1.5 py-0.5 rounded border border-emerald-800/60">
              Enable
            </span>
          </div>
        </div>

        {/* Demo/Master Quick Login Footer */}
        <div className="bg-slate-100 border-t border-slate-200 px-6 py-3 flex items-center justify-between text-[11px] text-slate-600">
          <div className="flex items-center gap-1.5 font-semibold text-slate-700">
            <KeyRound className="w-3.5 h-3.5 text-slate-500" />
            <span>Acesso Rápido Master:</span>
          </div>
          <button
            type="button"
            onClick={() => {
              setEmailInput('ambev');
              setPasswordInput('latas');
            }}
            className="text-blue-600 hover:text-blue-800 font-bold hover:underline cursor-pointer"
          >
            Preencher ambev / latas
          </button>
        </div>

      </div>
    </div>
  );
};



