import React, { useState } from 'react';
import {
  Settings,
  Shield,
  Key,
  QrCode,
  Sparkles,
  MessageSquare,
  Building2,
  Lock,
  Boxes,
  Cpu,
  CheckCircle2,
  Trash2,
  RefreshCw,
  Database,
  History,
} from 'lucide-react';
import { UserRole } from '../types';
import { ConfirmModal } from '../components/ConfirmModal';

interface ConfiguracoesViewProps {
  activeRole: UserRole;
  onRoleChange: (role: UserRole) => void;
  onClearLotes?: () => void;
  onClearHistorico?: () => void;
  onResetDemoData?: () => void;
}

export const ConfiguracoesView: React.FC<ConfiguracoesViewProps> = ({
  activeRole,
  onRoleChange,
  onClearLotes,
  onClearHistorico,
  onResetDemoData,
}) => {
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
  const futureCapabilities = [
    {
      title: 'Single Sign-On (SSO) Microsoft Azure AD',
      status: 'Pronto para Conectar',
      desc: 'Autenticação corporativa integrada com as credenciais de rede dos funcionários Ambev.',
      icon: Key,
      color: 'text-blue-600 bg-blue-50',
    },
    {
      title: 'Integração Direta SAP RFC / Webhook API',
      status: 'Módulo de Integração',
      desc: 'Sincronização em tempo real das movimentações de estoque sem necessidade de arquivo Excel manual.',
      icon: Cpu,
      color: 'text-purple-600 bg-purple-50',
    },
    {
      title: 'SDK de Leitores Industriais Zebra & Honeywell',
      status: 'Emulador Habilitado',
      desc: 'Suporte nativo para coletores de dados e leitores robustos de códigos de barras de alta velocidade.',
      icon: QrCode,
      color: 'text-amber-600 bg-amber-50',
    },
    {
      title: 'IA de Recomendação de Substituição (Gemini AI)',
      status: 'Ativo',
      desc: 'Recomendação preditiva de lotes e substituição inteligente quando o lote #1 está inacessível.',
      icon: Sparkles,
      color: 'text-emerald-600 bg-emerald-50',
    },
    {
      title: 'Painéis Power BI Embedded Interativos',
      status: 'Compatível',
      desc: 'Incorporação de relatórios gerenciais nativos do Microsoft Power BI com atualização em tempo real.',
      icon: Boxes,
      color: 'text-indigo-600 bg-indigo-50',
    },
    {
      title: 'Notificações Automáticas WhatsApp & Microsoft Teams',
      status: 'Módulo de Alerta',
      desc: 'Alertas automáticos para a equipe de qualidade e supervisores quando um lote estiver a <= 15 dias do vencimento.',
      icon: MessageSquare,
      color: 'text-teal-600 bg-teal-50',
    },
    {
      title: 'Arquitetura Multi-Unidade & SaaS Multi-tenant',
      status: 'Ativo',
      desc: 'Suporte para isolamento de dados entre diferentes plantas de produção Ambev (ex: Jacareí, Brasília, Agudos).',
      icon: Building2,
      color: 'text-slate-700 bg-slate-100',
    },
  ];

  return (
    <div className="flex flex-col gap-6 max-w-[1920px] mx-auto p-4 sm:p-6">
      {/* Title */}
      <div className="bg-slate-900 text-white p-5 rounded-xl border border-slate-800 shadow-md flex items-center gap-3">
        <Settings className="w-6 h-6 text-amber-400" />
        <div>
          <h2 className="text-lg font-black tracking-tight">Configurações & Roadmap do Sistema</h2>
          <p className="text-xs text-slate-300">
            Gerenciamento de permissões, parâmetros de cálculo FEFO e arquitetura preparada para escala enterprise.
          </p>
        </div>
      </div>

      {/* Role Manager Card */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-4">
        <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider flex items-center gap-2">
          <Shield className="w-4 h-4 text-amber-500" />
          Controle de Perfis e Permissões do Usuário Ativo
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          {/* Conferente */}
          <div
            onClick={() => onRoleChange('conferente')}
            className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${
              activeRole === 'conferente'
                ? 'border-amber-500 bg-amber-50/50 shadow-md'
                : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="font-extrabold text-sm text-slate-900 flex justify-between items-center mb-1">
              <span>Conferente de Armazém</span>
              {activeRole === 'conferente' && <CheckCircle2 className="w-4 h-4 text-amber-600" />}
            </div>
            <p className="text-slate-500 text-[11px] leading-relaxed">
              Permissão para atendimento de reservas, leitura de código de barras e seleção operacional de lotes.
            </p>
          </div>

          {/* Supervisor */}
          <div
            onClick={() => onRoleChange('supervisor')}
            className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${
              activeRole === 'supervisor'
                ? 'border-amber-500 bg-amber-50/50 shadow-md'
                : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="font-extrabold text-sm text-slate-900 flex justify-between items-center mb-1">
              <span>Supervisor Logístico</span>
              {activeRole === 'supervisor' && <CheckCircle2 className="w-4 h-4 text-amber-600" />}
            </div>
            <p className="text-slate-500 text-[11px] leading-relaxed">
              Permissão de conferência, aprovação de desvios FEFO, consulta a indicadores e relatórios gerenciais.
            </p>
          </div>

          {/* Administrador */}
          <div
            onClick={() => onRoleChange('administrador')}
            className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${
              activeRole === 'administrador'
                ? 'border-amber-500 bg-amber-50/50 shadow-md'
                : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="font-extrabold text-sm text-slate-900 flex justify-between items-center mb-1">
              <span>Administrador SAP</span>
              {activeRole === 'administrador' && <CheckCircle2 className="w-4 h-4 text-amber-600" />}
            </div>
            <p className="text-slate-500 text-[11px] leading-relaxed">
              Acesso irrestrito a carga de dados Excel SAP, parametrização do recálculo FEFO e auditoria completa.
            </p>
          </div>
        </div>
      </div>

      {/* Data Management Section */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-4">
        <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider flex items-center gap-2">
          <Database className="w-4 h-4 text-blue-600" />
          Gestão de Dados e Limpeza do Histórico
        </h3>
        <p className="text-xs text-slate-500 leading-relaxed">
          Gerencie a base de dados ativa e o histórico de logs. Você pode zerar a base atual de lotes ou apagar todo o histórico de reservas e arquivos importados a qualquer momento.
        </p>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          {onClearLotes && (
            <button
              onClick={() => {
                setConfirmModal({
                  isOpen: true,
                  title: 'Zerar Base de Dados de Estoque',
                  message: 'Tem certeza de que deseja apagar todos os lotes de estoque da base de dados? Esta ação deixará a base limpa para uma nova carga SAP.',
                  onConfirm: () => {
                    onClearLotes();
                  },
                });
              }}
              className="px-4 py-2.5 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold rounded-lg border border-red-200 transition-colors flex items-center gap-2 cursor-pointer"
            >
              <Trash2 className="w-4 h-4 text-red-600" />
              <span>Zerar Base de Dados de Estoque</span>
            </button>
          )}

          {onClearHistorico && (
            <button
              onClick={() => {
                setConfirmModal({
                  isOpen: true,
                  title: 'Limpar Histórico de Atendimentos',
                  message: 'Tem certeza de que deseja apagar TODO o histórico de atendimentos de reservas e movimentações salvas?',
                  onConfirm: () => {
                    onClearHistorico();
                  },
                });
              }}
              className="px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-lg border border-rose-200 transition-colors flex items-center gap-2 cursor-pointer"
            >
              <History className="w-4 h-4 text-rose-600" />
              <span>Limpar Histórico de Atendimentos</span>
            </button>
          )}

          {onResetDemoData && (
            <button
              onClick={() => {
                setConfirmModal({
                  isOpen: true,
                  title: 'Restaurar Dados de Demonstração',
                  message: 'Deseja recarregar o conjunto de dados fictícios originais de teste do SAP?',
                  onConfirm: () => {
                    onResetDemoData();
                  },
                });
              }}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-lg border border-slate-300 transition-colors flex items-center gap-2 cursor-pointer"
            >
              <RefreshCw className="w-4 h-4 text-slate-600" />
              <span>Restaurar Dados de Exemplo</span>
            </button>
          )}
        </div>
      </div>

      {/* Future Capabilities Grid */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-4">
        <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider flex items-center gap-2">
          <Cpu className="w-4 h-4 text-purple-600" />
          Módulos de Arquitetura & Integrações Futuras (Smart FEFO Micro SaaS)
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {futureCapabilities.map((cap) => {
            const Icon = cap.icon;
            return (
              <div
                key={cap.title}
                className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col justify-between gap-3 hover:border-slate-300 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className={`p-2.5 rounded-lg ${cap.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-slate-900 leading-snug">{cap.title}</h4>
                    <span className="inline-block mt-1 bg-slate-200 text-slate-800 text-[9px] font-extrabold px-2 py-0.5 rounded uppercase">
                      {cap.status}
                    </span>
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">{cap.desc}</p>
              </div>
            );
          })}
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
