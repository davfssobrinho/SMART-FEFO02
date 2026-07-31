import React, { useState } from 'react';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  HelpCircle,
  Globe,
  ChevronDown,
  Layers,
  X,
  Loader2,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  User as UserIcon,
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
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [rememberMe, setRememberMe] = useState<boolean>(true);
  const [selectedLanguage, setSelectedLanguage] = useState<string>('Português');
  const [isLangDropdownOpen, setIsLangDropdownOpen] = useState<boolean>(false);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showHelpNotice, setShowHelpNotice] = useState<boolean>(false);

  if (!isOpen) return null;

  // Handle Form Submit (Login or Cadastrar)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanEmail = emailInput.trim();
    const cleanPass = passwordInput.trim();

    if (!cleanEmail || !cleanPass) {
      setErrorMessage('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    // 1. Check for master bypass login ("ambev" / "latas" or "admin" / "latas")
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
        } else {
          setSuccessMessage(result.message || 'Conta criada com sucesso no Supabase!');
          if (result.user) {
            setTimeout(() => {
              if (result.user) {
                onSelectUser(result.user);
                if (onClose) onClose();
              }
            }, 1000);
          }
        }
      } else {
        // --- LOGIN FLOW ---
        const result = await signInWithSupabaseEmail(cleanEmail, cleanPass);

        if (!result.success) {
          setErrorMessage(result.message || 'Falha ao autenticar credenciais.');
        } else if (result.user) {
          setSuccessMessage('Autenticado com sucesso! Entrando...');
          setTimeout(() => {
            if (result.user) {
              onSelectUser(result.user);
              if (onClose) onClose();
            }
          }, 800);
        }
      }
    } catch (err: any) {
      setErrorMessage(`Erro no servidor: ${err?.message || 'Falha de comunicação'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMicrosoftLogin = () => {
    setEmailInput('operador.ms@ambev.com.br');
    setPasswordInput('latas');
    setSuccessMessage('Ambiente Microsoft SSO ativado. Clique em Entrar.');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#F5F7FA] flex flex-col justify-between min-h-screen animate-fade-in font-sans">
      
      {/* HEADER SUPERIOR */}
      <header className="w-full bg-white h-[64px] border-b border-slate-200/80 px-6 md:px-12 flex items-center justify-between shrink-0 shadow-xs">
        {/* Lado Esquerdo - Logo & Nome */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#2563EB] flex items-center justify-center text-white shadow-sm">
            <Layers className="w-5 h-5 stroke-[2.2]" />
          </div>
          <span className="text-lg font-bold tracking-tight text-[#0F172A] font-sans">
            SMART <span className="text-[#2563EB]">FEFO</span>
          </span>
        </div>

        {/* Lado Direito - Dropdown de Idioma & Fechar */}
        <div className="flex items-center gap-4">
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsLangDropdownOpen(!isLangDropdownOpen)}
              className="flex items-center gap-1.5 text-sm font-medium text-[#475569] hover:text-[#0F172A] bg-slate-50 hover:bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 transition-colors cursor-pointer"
            >
              <Globe className="w-4 h-4 text-slate-500" />
              <span>{selectedLanguage}</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {isLangDropdownOpen && (
              <div className="absolute right-0 mt-1 w-36 bg-white border border-slate-200 rounded-lg shadow-lg py-1 z-50 text-xs text-[#0F172A]">
                {['Português', 'English', 'Español'].map((lang) => (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => {
                      setSelectedLanguage(lang);
                      setIsLangDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 hover:bg-slate-50 transition-colors ${
                      selectedLanguage === lang ? 'font-bold text-[#2563EB]' : 'font-medium'
                    }`}
                  >
                    {lang}
                  </button>
                ))}
              </div>
            )}
          </div>

          {canClose && onClose && (
            <button
              onClick={onClose}
              className="text-[#64748B] hover:text-[#0F172A] p-2 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              title="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </header>

      {/* CENTRO DA TELA - CARD CENTRALIZADO */}
      <main className="flex-1 flex items-center justify-center p-4 my-6">
        <div className="w-full max-w-[420px] bg-white rounded-[16px] shadow-xl border border-slate-200/90 p-8 md:p-10 transition-all">
          
          {/* TÍTULO & SUBTÍTULO */}
          <div className="mb-7">
            <h1 className="text-[28px] md:text-[32px] font-bold text-[#0F172A] leading-tight tracking-tight">
              {isRegisterMode ? 'Crie sua conta' : 'Acesse sua conta'}
            </h1>
            <p className="text-[15px] font-normal text-[#64748B] mt-1.5">
              {isRegisterMode
                ? 'Preencha seus dados corporativos para se cadastrar.'
                : 'Entre com suas credenciais para acessar o sistema.'}
            </p>
          </div>

          {/* STATUS ALERTS */}
          {errorMessage && (
            <div className="mb-5 p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="mb-5 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-medium flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* FORMULÁRIO */}
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* CAMPO NOME (Somente Cadastro) */}
            {isRegisterMode && (
              <div>
                <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
                  Nome Completo
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#64748B]">
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
                    placeholder="Digite seu nome completo"
                    className="w-full bg-white border border-slate-300 text-[#0F172A] text-sm pl-10 pr-3.5 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent transition-all"
                  />
                </div>
              </div>
            )}

            {/* CAMPO EMAIL */}
            <div>
              <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
                E-mail Corporativo
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#64748B]">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={emailInput}
                  onChange={(e) => {
                    setEmailInput(e.target.value);
                    setErrorMessage(null);
                  }}
                  placeholder="Digite seu e-mail"
                  className="w-full bg-white border border-slate-300 text-[#0F172A] text-sm pl-10 pr-3.5 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent transition-all"
                />
              </div>
            </div>

            {/* CAMPO SENHA */}
            <div>
              <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
                Senha
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#64748B]">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={passwordInput}
                  onChange={(e) => {
                    setPasswordInput(e.target.value);
                    setErrorMessage(null);
                  }}
                  placeholder="Digite sua senha"
                  className="w-full bg-white border border-slate-300 text-[#0F172A] text-sm pl-10 pr-10 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#64748B] hover:text-[#0F172A] cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* OPÇÕES: LEMBRAR-ME & ESQUECI MINHA SENHA */}
            {!isRegisterMode && (
              <div className="flex items-center justify-between pt-1 pb-1">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 text-[#2563EB] rounded border-slate-300 focus:ring-[#2563EB] cursor-pointer"
                  />
                  <span className="text-xs text-[#64748B]">Lembrar-me</span>
                </label>

                <button
                  type="button"
                  onClick={() => {
                    setErrorMessage('Para redefinir sua senha corporativa, entre em contato com o suporte de TI.');
                  }}
                  className="text-xs font-semibold text-[#2563EB] hover:text-[#1D4ED8] hover:underline cursor-pointer"
                >
                  Esqueci minha senha
                </button>
              </div>
            )}

            {/* BOTÃO PRINCIPAL */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-[52px] bg-[#2563EB] hover:bg-[#1D4ED8] disabled:bg-blue-300 text-white font-bold text-base rounded-[10px] shadow-sm hover:shadow transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Acessando...</span>
                </>
              ) : isRegisterMode ? (
                <span>Cadastrar</span>
              ) : (
                <span>Entrar</span>
              )}
            </button>
          </form>

          {/* DIVISOR */}
          <div className="relative my-6 flex items-center justify-center">
            <div className="w-full border-t border-slate-200"></div>
            <span className="absolute bg-white px-3 text-xs text-[#64748B] uppercase tracking-wider font-medium">
              ou
            </span>
          </div>

          {/* BOTÃO LOGIN MICROSOFT */}
          <button
            type="button"
            onClick={handleMicrosoftLogin}
            className="w-full h-[52px] bg-white hover:bg-slate-50 text-[#0F172A] font-semibold text-sm border border-slate-300 rounded-[10px] transition-all flex items-center justify-center gap-3 cursor-pointer shadow-xs"
          >
            {/* Ícone Microsoft 4 cores */}
            <svg className="w-5 h-5" viewBox="0 0 23 23">
              <path fill="#f35325" d="M1 1h10v10H1z" />
              <path fill="#81bc06" d="M12 1h10v10H12z" />
              <path fill="#05a6f0" d="M1 12h10v10H1z" />
              <path fill="#ffba08" d="M12 12h10v10H12z" />
            </svg>
            <span>Entrar com Microsoft</span>
          </button>

          {/* LINK DE ALTERNAR MODO DE CADASTRO OU MASTER ACCESSO */}
          <div className="mt-5 text-center flex flex-col gap-2">
            <button
              type="button"
              onClick={() => {
                setIsRegisterMode(!isRegisterMode);
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
              className="text-xs font-semibold text-[#2563EB] hover:text-[#1D4ED8] hover:underline cursor-pointer"
            >
              {isRegisterMode
                ? 'Já possui uma conta? Faça login aqui'
                : 'Não tem conta? Cadastre-se no sistema'}
            </button>

            {/* Quick Master Access */}
            <button
              type="button"
              onClick={() => {
                setEmailInput('ambev');
                setPasswordInput('latas');
              }}
              className="text-[11px] text-[#64748B] hover:text-[#0F172A] flex items-center justify-center gap-1 cursor-pointer mt-1"
            >
              <KeyRound className="w-3 h-3" />
              <span>Acesso Rápido Operador: <strong className="text-[#2563EB]">ambev / latas</strong></span>
            </button>
          </div>

          {/* LINK DE AJUDA */}
          <div className="mt-6 pt-4 border-t border-slate-100 text-center">
            <button
              type="button"
              onClick={() => setShowHelpNotice(!showHelpNotice)}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-[#2563EB] hover:text-[#1D4ED8] transition-colors cursor-pointer"
            >
              <HelpCircle className="w-4 h-4" />
              <span>Precisa de ajuda para acessar sua conta?</span>
            </button>

            {showHelpNotice && (
              <div className="mt-3 p-3 bg-slate-50 border border-slate-200 rounded-lg text-left text-xs text-[#64748B] space-y-1 animate-fade-in">
                <p className="font-semibold text-[#0F172A]">Canais de Suporte:</p>
                <p>• Suporte TI Interno: ramal 4040</p>
                <p>• E-mail: suporte.estoque@ambev.com.br</p>
                <p>• Dica: Você também pode usar as credenciais padrão de operador.</p>
              </div>
            )}
          </div>

        </div>
      </main>

      {/* FOOTER FIXADO */}
      <footer className="w-full bg-white h-12 border-t border-slate-200/80 px-6 flex items-center justify-center shrink-0">
        <p className="text-xs font-medium text-[#64748B]">
          © {new Date().getFullYear()} Smart FEFO • Criado por Davi Felipe
        </p>
      </footer>

    </div>
  );
};




