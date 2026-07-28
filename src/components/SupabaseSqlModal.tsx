import React, { useState } from 'react';
import {
  Database,
  Copy,
  Check,
  Download,
  Upload,
  RefreshCw,
  X,
  FileCode,
  Server,
  Layers,
  ShieldCheck,
  Zap,
  Globe,
  HardDrive,
  CloudUpload,
  CloudDownload,
  AlertCircle,
  Sparkles,
  Bot,
} from 'lucide-react';
import { SapLoteItem, AtendimentoHistorico, ImportacaoRegistro, ConferenteUser } from '../types';
import {
  testSupabaseConnection,
  saveSupabaseCredentials,
  pushDataToSupabase,
  pullDataFromSupabase,
  getSupabaseCredentials,
} from '../services/supabaseClient';

interface SupabaseSqlModalProps {
  isOpen: boolean;
  onClose: () => void;
  lotes: SapLoteItem[];
  historico: AtendimentoHistorico[];
  importacoes: ImportacaoRegistro[];
  conferentes: ConferenteUser[];
  onImportBackupJSON?: (data: {
    lotes?: SapLoteItem[];
    historico?: AtendimentoHistorico[];
    importacoes?: ImportacaoRegistro[];
    conferentes?: ConferenteUser[];
  }) => void;
}

export const SupabaseSqlModal: React.FC<SupabaseSqlModalProps> = ({
  isOpen,
  onClose,
  lotes,
  historico,
  importacoes,
  conferentes,
  onImportBackupJSON,
}) => {
  const [activeTab, setActiveTab] = useState<'schema' | 'data' | 'backup' | 'api'>('api');
  const [copied, setCopied] = useState<boolean>(false);
  const [supabaseUrl, setSupabaseUrl] = useState<string>(
    getSupabaseCredentials().url
  );
  const [supabaseKey, setSupabaseKey] = useState<string>(
    getSupabaseCredentials().key
  );
  const [syncStatus, setSyncStatus] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  if (!isOpen) return null;

  // 1. GENERATE SUPABASE DDL SCHEMA SCRIPT
  const supabaseSchemaSql = `-- =====================================================================
-- SMART FEFO - SCHEMA DE TABELAS SUPABASE / POSTGRESQL (LOGIN VINCULADO)
-- Copie este código e cole no SQL Editor do seu projeto Supabase
-- Todos os dados salvos ficam vinculados ao login 'ambev' e senha 'latas'
-- =====================================================================

-- 1. TABELA DE USUÁRIOS E CREDENCIAIS (LOGIN AMBEV / SENHA LATAS)
CREATE TABLE IF NOT EXISTS public.usuarios_sistema (
  id TEXT PRIMARY KEY DEFAULT 'CONF-AMBEV',
  usuario TEXT UNIQUE NOT NULL DEFAULT 'ambev',
  senha TEXT NOT NULL DEFAULT 'latas',
  nome TEXT DEFAULT 'Operador AMBEV',
  matricula TEXT DEFAULT 'AMB-2026',
  turno TEXT DEFAULT 'Geral / 24h',
  perfil TEXT DEFAULT 'administrador',
  ativo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inserir conta mestre padrão 'ambev' com senha 'latas'
INSERT INTO public.usuarios_sistema (id, usuario, senha, nome, matricula, turno, perfil)
VALUES ('CONF-AMBEV', 'ambev', 'latas', 'Operador AMBEV', 'AMB-2026', 'Geral / 24h', 'administrador')
ON CONFLICT (usuario) DO NOTHING;

-- 2. TABELA DE ARQUIVOS IMPORTADOS (VINCULADA AO LOGIN AMBEV)
CREATE TABLE IF NOT EXISTS public.arquivos_importados (
  id TEXT PRIMARY KEY,
  data_hora TIMESTAMPTZ DEFAULT NOW(),
  nome_arquivo TEXT NOT NULL,
  total_linhas_lidas INT DEFAULT 0,
  total_lotes_importados INT DEFAULT 0,
  total_estoque_livre_sum NUMERIC(15, 3) DEFAULT 0,
  usuario TEXT DEFAULT 'ambev',
  usuario_login TEXT DEFAULT 'ambev',
  status TEXT DEFAULT 'sucesso',
  mensagem TEXT,
  dados_json JSONB
);

-- 3. TABELA DE LOTES SAP ATIVOS (ESTOQUE)
CREATE TABLE IF NOT EXISTS public.lotes_sap (
  id TEXT PRIMARY KEY,
  material_code TEXT NOT NULL,
  material_desc TEXT,
  centro TEXT DEFAULT 'BRV4',
  centro_desc TEXT DEFAULT 'FÁBRICA BRV4',
  deposito TEXT DEFAULT 'TINT MR01 A062',
  posicao_deposito TEXT DEFAULT 'A062',
  lote_sap TEXT NOT NULL,
  lote_fornecedor TEXT,
  tipo_material TEXT,
  grupo_mercadoria TEXT,
  unidade_medida TEXT DEFAULT 'UN',
  fornecedor TEXT,
  data_fabricacao DATE,
  data_vencimento DATE NOT NULL,
  estoque_livre NUMERIC(15, 3) NOT NULL DEFAULT 0,
  prioridade_fefo INT DEFAULT 1,
  dias_para_vencer INT DEFAULT 0,
  status_fefo TEXT,
  is_critical BOOLEAN DEFAULT FALSE,
  usuario_login TEXT DEFAULT 'ambev',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. TABELA DE BAIXAS DE RESERVA E ATENDIMENTOS (REGISTROS)
CREATE TABLE IF NOT EXISTS public.baixas_reserva (
  id TEXT PRIMARY KEY,
  data_hora TIMESTAMPTZ DEFAULT NOW(),
  numero_reserva TEXT,
  linha_reserva TEXT,
  solicitante_producao TEXT,
  conferente_id TEXT,
  conferente_nome TEXT,
  conferente_matricula TEXT,
  conferente_turno TEXT,
  usuario_role TEXT DEFAULT 'administrador',
  usuario_login TEXT DEFAULT 'ambev',
  material_code TEXT NOT NULL,
  material_desc TEXT,
  lote_sap TEXT NOT NULL,
  lote_fornecedor TEXT,
  fornecedor TEXT,
  deposito TEXT,
  quantidade_atendida NUMERIC(15, 3) NOT NULL,
  unidade_medida TEXT DEFAULT 'UN',
  foi_fefo_1 BOOLEAN DEFAULT TRUE,
  justificativa_desvio TEXT,
  status_controle TEXT DEFAULT 'Pendente',
  usuario_controle TEXT,
  data_hora_controle TIMESTAMPTZ,
  observacao_controle TEXT
);

-- 5. TABELA DE CONFERENTES E OPERADORES DE ARMAZÉM
CREATE TABLE IF NOT EXISTS public.conferentes (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  matricula TEXT,
  turno TEXT,
  perfil TEXT DEFAULT 'conferente',
  status TEXT DEFAULT 'Ativo',
  area_producao TEXT,
  usuario_login TEXT DEFAULT 'ambev',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- MIGRAÇÕES / ALTERAÇÕES SEGURAS PARA TABELAS JÁ EXISTENTES NO SUPABASE
ALTER TABLE public.arquivos_importados ADD COLUMN IF NOT EXISTS usuario_login TEXT DEFAULT 'ambev';
ALTER TABLE public.lotes_sap ADD COLUMN IF NOT EXISTS usuario_login TEXT DEFAULT 'ambev';
ALTER TABLE public.baixas_reserva ADD COLUMN IF NOT EXISTS usuario_login TEXT DEFAULT 'ambev';
ALTER TABLE public.conferentes ADD COLUMN IF NOT EXISTS usuario_login TEXT DEFAULT 'ambev';

-- ÍNDICES DE DESEMPENHO E CONSISTÊNCIA
CREATE INDEX IF NOT EXISTS idx_usuarios_login ON public.usuarios_sistema(usuario);
CREATE INDEX IF NOT EXISTS idx_lotes_material ON public.lotes_sap(material_code);
CREATE INDEX IF NOT EXISTS idx_lotes_vencimento ON public.lotes_sap(data_vencimento);
CREATE INDEX IF NOT EXISTS idx_lotes_usuario ON public.lotes_sap(usuario_login);
CREATE INDEX IF NOT EXISTS idx_baixas_reserva ON public.baixas_reserva(numero_reserva);
CREATE INDEX IF NOT EXISTS idx_baixas_data ON public.baixas_reserva(data_hora);
CREATE INDEX IF NOT EXISTS idx_baixas_usuario ON public.baixas_reserva(usuario_login);

-- PERMISSÕES E ROW LEVEL SECURITY (RLS)
ALTER TABLE public.usuarios_sistema ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.arquivos_importados ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lotes_sap ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.baixas_reserva ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conferentes ENABLE ROW LEVEL SECURITY;

-- POLÍTICAS DE ACESSO COMPARTILHADO MULTI-MÁQUINA
CREATE POLICY "Acesso Livre Usuarios" ON public.usuarios_sistema FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acesso Livre Arquivos" ON public.arquivos_importados FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acesso Livre Lotes" ON public.lotes_sap FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acesso Livre Baixas" ON public.baixas_reserva FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acesso Livre Conferentes" ON public.conferentes FOR ALL USING (true) WITH CHECK (true);
`;

  // 2. GENERATE SQL INSERTS FOR LIVE DATA
  const generateDataSql = (): string => {
    let sql = `-- =====================================================================\n`;
    sql += `-- SMART FEFO AMBEV - INSERÇÃO DE DADOS ATUAIS EM SQL PARA SUPABASE\n`;
    sql += `-- Gerado em: ${new Date().toLocaleString('pt-BR')}\n`;
    sql += `-- =====================================================================\n\n`;

    sql += `-- GARANTIA DE COLUNAS DE USUÁRIO NAS TABELAS\n`;
    sql += `ALTER TABLE public.arquivos_importados ADD COLUMN IF NOT EXISTS usuario_login TEXT DEFAULT 'ambev';\n`;
    sql += `ALTER TABLE public.lotes_sap ADD COLUMN IF NOT EXISTS usuario_login TEXT DEFAULT 'ambev';\n`;
    sql += `ALTER TABLE public.baixas_reserva ADD COLUMN IF NOT EXISTS usuario_login TEXT DEFAULT 'ambev';\n`;
    sql += `ALTER TABLE public.conferentes ADD COLUMN IF NOT EXISTS usuario_login TEXT DEFAULT 'ambev';\n\n`;

    // 1. Arquivos Importados
    if (importacoes.length > 0) {
      sql += `-- 1. ARQUIVOS IMPORTADOS (${importacoes.length})\n`;
      importacoes.forEach((imp) => {
        const jsonEscaped = JSON.stringify(imp).replace(/'/g, "''");
        sql += `INSERT INTO public.arquivos_importados (id, data_hora, nome_arquivo, total_linhas_lidas, total_lotes_importados, total_estoque_livre_sum, usuario, usuario_login, status, mensagem, dados_json)\n`;
        sql += `VALUES ('${imp.id}', '${imp.dataHora}', '${imp.nomeArquivo.replace(/'/g, "''")}', ${imp.totalLinhasLidas}, ${imp.totalLotesImportados}, ${imp.totalEstoqueLivreSum}, '${imp.usuario.replace(/'/g, "''")}', 'ambev', '${imp.status}', '${(imp.mensagem || '').replace(/'/g, "''")}', '${jsonEscaped}'::jsonb)\n`;
        sql += `ON CONFLICT (id) DO UPDATE SET total_lotes_importados = EXCLUDED.total_lotes_importados;\n\n`;
      });
    }

    // 2. Lotes SAP
    if (lotes.length > 0) {
      sql += `-- 2. LOTES SAP (${lotes.length})\n`;
      lotes.forEach((l) => {
        sql += `INSERT INTO public.lotes_sap (id, material_code, material_desc, centro, centro_desc, deposito, posicao_deposito, lote_sap, lote_fornecedor, tipo_material, grupo_mercadoria, unidade_medida, fornecedor, data_vencimento, estoque_livre, prioridade_fefo, dias_para_vencer, status_fefo, is_critical, usuario_login)\n`;
        sql += `VALUES ('${l.id}', '${l.materialCode.replace(/'/g, "''")}', '${(l.materialDesc || '').replace(/'/g, "''")}', '${l.centro}', '${(l.centroDesc || '').replace(/'/g, "''")}', '${l.deposito}', '${l.posicaoDeposito}', '${l.loteSAP.replace(/'/g, "''")}', '${(l.loteFornecedor || '').replace(/'/g, "''")}', '${l.tipoMaterial}', '${l.grupoMercadoria}', '${l.unidadeMedida}', '${(l.fornecedor || '').replace(/'/g, "''")}', '${l.dataVencimento}', ${l.estoqueLivre}, ${l.prioridadeFEFO || 1}, ${l.diasParaVencer || 0}, '${l.statusFEFO || 'fefo_1'}', ${l.isCritical ? 'TRUE' : 'FALSE'}, 'ambev')\n`;
        sql += `ON CONFLICT (id) DO UPDATE SET estoque_livre = EXCLUDED.estoque_livre, status_fefo = EXCLUDED.status_fefo;\n\n`;
      });
    }

    // 3. Baixas de Reserva (Atendimentos)
    if (historico.length > 0) {
      sql += `-- 3. BAIXAS DE RESERVA E ATENDIMENTOS (${historico.length})\n`;
      historico.forEach((h) => {
        sql += `INSERT INTO public.baixas_reserva (id, data_hora, numero_reserva, linha_reserva, conferente_id, conferente_nome, conferente_matricula, conferente_turno, usuario_role, usuario_login, material_code, material_desc, lote_sap, lote_fornecedor, fornecedor, deposito, quantidade_atendida, unidade_medida, foi_fefo_1, justificativa_desvio, status_controle, usuario_controle, data_hora_controle, observacao_controle)\n`;
        sql += `VALUES ('${h.id}', '${h.dataHora}', '${(h.numeroReserva || '').replace(/'/g, "''")}', '${(h.linhaReserva || '').replace(/'/g, "''")}', '${h.conferenteId}', '${h.conferenteNome.replace(/'/g, "''")}', '${h.conferenteMatricula || ''}', '${h.conferenteTurno || ''}', '${h.usuarioRole}', 'ambev', '${h.materialCode}', '${h.materialDesc.replace(/'/g, "''")}', '${h.loteSAP}', '${h.loteFornecedor || ''}', '${h.fornecedor || ''}', '${h.deposito}', ${h.quantidadeAtendida}, '${h.unidadeMedida}', ${h.foiFefo1 ? 'TRUE' : 'FALSE'}, '${(h.justificativaDesvio || '').replace(/'/g, "''")}', '${h.statusControle || 'Pendente'}', '${(h.usuarioControle || '').replace(/'/g, "''")}', ${h.dataHoraControle ? `'${h.dataHoraControle}'` : 'NULL'}, '${(h.observacaoControle || '').replace(/'/g, "''")}')\n`;
        sql += `ON CONFLICT (id) DO UPDATE SET status_controle = EXCLUDED.status_controle;\n\n`;
      });
    }

    // 4. Conferentes
    if (conferentes.length > 0) {
      sql += `-- 4. CONFERENTES (${conferentes.length})\n`;
      conferentes.forEach((c) => {
        sql += `INSERT INTO public.conferentes (id, nome, matricula, turno, perfil, status, area_producao, usuario_login)\n`;
        sql += `VALUES ('${c.id}', '${c.nome.replace(/'/g, "''")}', '${c.matricula}', '${c.turno}', '${c.perfil}', '${c.status}', '${(c.areaProducao || '').replace(/'/g, "''")}', 'ambev')\n`;
        sql += `ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status;\n\n`;
      });
    }

    return sql;
  };

  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadSql = (text: string, filename: string) => {
    const blob = new Blob([text], { type: 'text/sql;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Export Complete Backup JSON File
  const handleExportBackupJSON = () => {
    const fullBackup = {
      appVersion: '2.5.0-STABLE',
      exportedAt: new Date().toISOString(),
      plant: 'BRV4',
      lotes,
      historico,
      importacoes,
      conferentes,
    };

    const blob = new Blob([JSON.stringify(fullBackup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `SMART_FEFO_BACKUP_COMPLETO_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Import Backup JSON File
  const handleFileUploadJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const json = JSON.parse(evt.target?.result as string);
        if (onImportBackupJSON) {
          onImportBackupJSON(json);
          alert('Backup importado e sincronizado com sucesso!');
          onClose();
        }
      } catch (err) {
        alert('Erro ao processar o arquivo de backup JSON.');
      }
    };
    reader.readAsText(file);
  };

  const handleSaveSupabaseConfig = () => {
    saveSupabaseCredentials(supabaseUrl, supabaseKey);
    setSyncStatus({ type: 'success', message: 'Credenciais do Supabase salvas com sucesso!' });
  };

  const handleTestConnection = async () => {
    setIsProcessing(true);
    setSyncStatus({ type: 'info', message: 'Testando conexão com o Supabase...' });
    saveSupabaseCredentials(supabaseUrl, supabaseKey);
    const res = await testSupabaseConnection(supabaseUrl, supabaseKey);
    setIsProcessing(false);
    setSyncStatus({ type: res.success ? 'success' : 'error', message: res.message });
  };

  const handlePushToSupabase = async () => {
    setIsProcessing(true);
    setSyncStatus({ type: 'info', message: 'Enviando e vinculando dados ao login "ambev" no Supabase...' });
    saveSupabaseCredentials(supabaseUrl, supabaseKey);
    const res = await pushDataToSupabase({ lotes, historico, importacoes, conferentes });
    setIsProcessing(false);
    setSyncStatus({ type: res.success ? 'success' : 'error', message: res.message });
  };

  const handlePullFromSupabase = async () => {
    setIsProcessing(true);
    setSyncStatus({ type: 'info', message: 'Baixando dados do Supabase...' });
    saveSupabaseCredentials(supabaseUrl, supabaseKey);
    const res = await pullDataFromSupabase();
    setIsProcessing(false);
    if (res.success && res.data && onImportBackupJSON) {
      onImportBackupJSON(res.data);
      setSyncStatus({ type: 'success', message: `${res.message} Dados aplicados ao sistema local!` });
    } else {
      setSyncStatus({ type: 'error', message: res.message });
    }
  };

  const handleConnectWithGoogleAi = async () => {
    setIsProcessing(true);
    setSyncStatus({ type: 'info', message: '🤖 Google IA ativada: Testando credenciais e validando estrutura de tabelas...' });
    saveSupabaseCredentials(supabaseUrl, supabaseKey);

    setTimeout(async () => {
      const conn = await testSupabaseConnection(supabaseUrl, supabaseKey);
      if (conn.success) {
        setSyncStatus({ type: 'info', message: '🤖 Google IA: Conexão bem-sucedida! Sincronizando tabelas public.lotes_sap, public.baixas_reserva, public.arquivos_importados e public.conferentes...' });
        const pushRes = await pushDataToSupabase({ lotes, historico, importacoes, conferentes });
        setIsProcessing(false);
        if (pushRes.success) {
          setSyncStatus({
            type: 'success',
            message: `✨ Google IA Conectado com Sucesso! 4 Tabelas vinculadas ao Supabase com ${lotes.length} lotes, ${historico.length} baixas e ${importacoes.length} arquivos.`,
          });
        } else {
          setSyncStatus({ type: 'error', message: `Google IA encontrou um aviso na sincronização: ${pushRes.message}` });
        }
      } else {
        setIsProcessing(false);
        setSyncStatus({
          type: 'error',
          message: `Google IA Assistente: ${conn.message}. Dica: Se as tabelas ainda não foram criadas no seu Supabase, vá na Aba 1 (Tabelas SQL DDL), copie o script e cole no SQL Editor do Supabase.`,
        });
      }
    }, 700);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 z-50 animate-fade-in">
      <div className="bg-slate-900 text-slate-100 rounded-2xl border border-slate-700 shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white shadow-md">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-2">
                Integração Supabase & Sincronização Multi-Máquina
                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase">
                  NQL / SQL
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Gere as tabelas PostgreSQL para o Supabase, exporte histórico de baixas e arquivos importados entre computadores.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 bg-slate-900 px-4 pt-2 gap-2 text-xs font-bold">
          <button
            onClick={() => setActiveTab('schema')}
            className={`px-4 py-2.5 rounded-t-lg border-t border-x transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'schema'
                ? 'bg-slate-800 border-slate-700 text-emerald-400 font-extrabold'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <FileCode className="w-4 h-4" />
            <span>1. Tabelas SQL (DDL Supabase)</span>
          </button>

          <button
            onClick={() => setActiveTab('data')}
            className={`px-4 py-2.5 rounded-t-lg border-t border-x transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'data'
                ? 'bg-slate-800 border-slate-700 text-amber-400 font-extrabold'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Database className="w-4 h-4" />
            <span>2. Inserts de Dados Atuais ({lotes.length + historico.length + importacoes.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('backup')}
            className={`px-4 py-2.5 rounded-t-lg border-t border-x transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'backup'
                ? 'bg-slate-800 border-slate-700 text-blue-400 font-extrabold'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <HardDrive className="w-4 h-4" />
            <span>3. Backup / Restaurar JSON Multi-Máquina</span>
          </button>

          <button
            onClick={() => setActiveTab('api')}
            className={`px-4 py-2.5 rounded-t-lg border-t border-x transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'api'
                ? 'bg-slate-800 border-slate-700 text-teal-400 font-extrabold'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Globe className="w-4 h-4" />
            <span>4. Conexão REST Direct Supabase</span>
          </button>
        </div>

        {/* Tab Contents */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4 font-sans text-xs">
          {/* TAB 1: SCHEMA SQL */}
          {activeTab === 'schema' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between bg-slate-950 p-3 rounded-xl border border-slate-800">
                <div>
                  <h3 className="font-extrabold text-white text-sm flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    Script de Criação de Tabelas (DDL PostgreSQL / Supabase)
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Cole este código no menu <strong className="text-emerald-300 font-mono">SQL Editor</strong> do seu Supabase e clique em <strong>Run</strong>.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleCopyText(supabaseSchemaSql)}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 shadow-sm"
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    <span>{copied ? 'Copiado!' : 'Copiar Script SQL'}</span>
                  </button>
                  <button
                    onClick={() => handleDownloadSql(supabaseSchemaSql, 'SUPABASE_SCHEMA_SMART_FEFO.sql')}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-lg flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 border border-slate-700"
                  >
                    <Download className="w-4 h-4" />
                    <span>Baixar .sql</span>
                  </button>
                </div>
              </div>

              <div className="relative">
                <pre className="bg-slate-950 text-emerald-300 font-mono text-[11px] p-4 rounded-xl border border-slate-800 overflow-x-auto max-h-[420px] leading-relaxed">
                  {supabaseSchemaSql}
                </pre>
              </div>
            </div>
          )}

          {/* TAB 2: DATA SQL INSERTS */}
          {activeTab === 'data' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between bg-slate-950 p-3 rounded-xl border border-slate-800">
                <div>
                  <h3 className="font-extrabold text-amber-400 text-sm flex items-center gap-2">
                    <Database className="w-4 h-4" />
                    INSERTS SQL de Todos os Dados Atuais
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Gera instruções SQL para carregar diretamente seus <strong className="text-slate-200">{lotes.length} lotes</strong>, <strong className="text-slate-200">{historico.length} baixas</strong> e <strong className="text-slate-200">{importacoes.length} arquivos importados</strong> no Supabase.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleCopyText(generateDataSql())}
                    className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-lg flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 shadow-sm"
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    <span>{copied ? 'Copiado!' : 'Copiar Inserts SQL'}</span>
                  </button>
                  <button
                    onClick={() => handleDownloadSql(generateDataSql(), `SUPABASE_DATA_INSERTS_${new Date().toISOString().split('T')[0]}.sql`)}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-lg flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 border border-slate-700"
                  >
                    <Download className="w-4 h-4" />
                    <span>Baixar .sql</span>
                  </button>
                </div>
              </div>

              <div className="relative">
                <pre className="bg-slate-950 text-amber-300 font-mono text-[11px] p-4 rounded-xl border border-slate-800 overflow-x-auto max-h-[420px] leading-relaxed">
                  {generateDataSql()}
                </pre>
              </div>
            </div>
          )}

          {/* TAB 3: BACKUP / RESTORE JSON */}
          {activeTab === 'backup' && (
            <div className="space-y-5">
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                <h3 className="font-extrabold text-blue-400 text-sm flex items-center gap-2">
                  <HardDrive className="w-4 h-4" />
                  Sincronização Fácil entre Computadores e Dispositivos
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Você pode exportar um pacote de dados completo com todos os seus arquivos de importação SAP, histórico de baixas de reserva, lotes e conferentes, e depois abrir em qualquer outro computador ou celular.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Export Card */}
                <div className="p-5 bg-slate-950 border border-slate-800 rounded-xl flex flex-col justify-between gap-4">
                  <div>
                    <h4 className="font-black text-white text-sm mb-1 flex items-center gap-2">
                      <Download className="w-4 h-4 text-emerald-400" />
                      1. Exportar Backup do Sistema
                    </h4>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Gera um arquivo <span className="font-mono text-emerald-300">.json</span> com todos os dados baixados e importados.
                    </p>
                    <div className="mt-3 p-3 bg-slate-900 rounded-lg text-[11px] text-slate-300 font-mono space-y-1">
                      <div>• Lotes SAP: {lotes.length}</div>
                      <div>• Baixas de Reserva: {historico.length}</div>
                      <div>• Arquivos Importados: {importacoes.length}</div>
                      <div>• Conferentes: {conferentes.length}</div>
                    </div>
                  </div>
                  <button
                    onClick={handleExportBackupJSON}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-lg flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95 shadow-md"
                  >
                    <Download className="w-4 h-4" />
                    <span>Baixar Backup Completo (.json)</span>
                  </button>
                </div>

                {/* Import Card */}
                <div className="p-5 bg-slate-950 border border-slate-800 rounded-xl flex flex-col justify-between gap-4">
                  <div>
                    <h4 className="font-black text-white text-sm mb-1 flex items-center gap-2">
                      <Upload className="w-4 h-4 text-blue-400" />
                      2. Restaurar / Importar em outra Máquina
                    </h4>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Carregue o arquivo <span className="font-mono text-blue-300">.json</span> em outra máquina para disponibilizar todas as baixas e lotes instantaneamente.
                    </p>
                  </div>

                  <label className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-extrabold rounded-lg flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95 shadow-md text-center">
                    <Upload className="w-4 h-4" />
                    <span>Carregar Arquivo de Backup (.json)</span>
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleFileUploadJSON}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: REST API DIRECT CONFIG & CLOUD SYNC */}
          {activeTab === 'api' && (
            <div className="space-y-4">
              {/* Google IA Assistant Quick Action */}
              <div className="bg-gradient-to-r from-emerald-950 via-teal-950 to-slate-950 p-4 rounded-xl border border-emerald-700/60 shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-emerald-500/20 text-emerald-300 rounded-xl border border-emerald-500/30">
                    <Sparkles className="w-6 h-6 animate-pulse" />
                  </div>
                  <div>
                    <h4 className="font-black text-white text-sm flex items-center gap-2">
                      Assistente Google IA - Conectar & Sincronizar Tabelas
                    </h4>
                    <p className="text-xs text-emerald-200/80 mt-0.5">
                      Conecta automaticamente as tabelas <strong className="text-white font-mono">lotes_sap</strong>, <strong className="text-white font-mono">baixas_reserva</strong>, <strong className="text-white font-mono">arquivos_importados</strong> e <strong className="text-white font-mono">conferentes</strong>.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={handleConnectWithGoogleAi}
                  className="w-full md:w-auto px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-black text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-md transition-all active:scale-95 shrink-0"
                >
                  <Bot className="w-4 h-4 text-slate-950" />
                  <span>Conectar via Google IA</span>
                </button>
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                <h3 className="font-extrabold text-teal-400 text-sm flex items-center gap-2">
                  <Globe className="w-4 h-4" />
                  Conexão Direta e Sincronização Supabase (Login AMBEV / LATAS)
                </h3>
                <p className="text-xs text-slate-300">
                  Insira o <strong className="text-teal-300">URL do Projeto</strong> e a <strong className="text-teal-300">Chave Anon Public Key</strong> do Supabase para sincronizar automaticamente todos os lotes, baixas e importações vinculadas ao usuário <strong className="text-white bg-teal-900/60 px-1.5 py-0.5 rounded border border-teal-700">ambev</strong>.
                </p>
              </div>

              <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Supabase Project URL:
                    </label>
                    <input
                      type="text"
                      value={supabaseUrl}
                      onChange={(e) => setSupabaseUrl(e.target.value)}
                      placeholder="https://xyzxyzxyz.supabase.co"
                      className="w-full bg-slate-900 border border-slate-700 text-white font-mono text-xs p-2.5 rounded-lg focus:outline-none focus:border-teal-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Supabase Anon Public API Key:
                    </label>
                    <input
                      type="password"
                      value={supabaseKey}
                      onChange={(e) => setSupabaseKey(e.target.value)}
                      placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                      className="w-full bg-slate-900 border border-slate-700 text-white font-mono text-xs p-2.5 rounded-lg focus:outline-none focus:border-teal-500"
                    />
                  </div>
                </div>

                {/* Status Box */}
                {syncStatus && (
                  <div
                    className={`p-3 rounded-xl border text-xs font-bold flex items-center gap-2.5 animate-fade-in ${
                      syncStatus.type === 'success'
                        ? 'bg-emerald-950/80 border-emerald-700 text-emerald-200'
                        : syncStatus.type === 'error'
                        ? 'bg-rose-950/80 border-rose-700 text-rose-200'
                        : 'bg-blue-950/80 border-blue-700 text-blue-200'
                    }`}
                  >
                    {syncStatus.type === 'success' && <Check className="w-5 h-5 text-emerald-400 shrink-0" />}
                    {syncStatus.type === 'error' && <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />}
                    {syncStatus.type === 'info' && <RefreshCw className="w-5 h-5 text-blue-400 animate-spin shrink-0" />}
                    <span className="leading-relaxed">{syncStatus.message}</span>
                  </div>
                )}

                {/* Actions Grid */}
                <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={handleTestConnection}
                    className="w-full py-2.5 px-3 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 font-bold rounded-lg flex items-center justify-center gap-2 cursor-pointer transition-all border border-slate-700 active:scale-95"
                  >
                    <RefreshCw className={`w-4 h-4 text-teal-400 ${isProcessing ? 'animate-spin' : ''}`} />
                    <span>Testar Conexão</span>
                  </button>

                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={handleSaveSupabaseConfig}
                    className="w-full py-2.5 px-3 bg-teal-700 hover:bg-teal-600 disabled:opacity-50 text-white font-bold rounded-lg flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95 shadow-md"
                  >
                    <Zap className="w-4 h-4 text-amber-300" />
                    <span>Salvar Credenciais</span>
                  </button>

                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={handlePushToSupabase}
                    className="w-full py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded-lg flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95 shadow-md"
                  >
                    <CloudUpload className="w-4 h-4" />
                    <span>Enviar Dados (Push)</span>
                  </button>

                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={handlePullFromSupabase}
                    className="w-full py-2.5 px-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold rounded-lg flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95 shadow-md"
                  >
                    <CloudDownload className="w-4 h-4" />
                    <span>Baixar Cloud (Pull)</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Unidade FÁBRICA BRV4 | Supabase Engine Compatible</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-lg cursor-pointer transition-all"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
