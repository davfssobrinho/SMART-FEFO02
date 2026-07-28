import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Upload,
  CheckCircle2,
  AlertCircle,
  FileCheck,
  Table,
  ClipboardList,
  Sparkles,
  Download,
  Loader2,
} from 'lucide-react';
import { parseAndImportSapExcel, parseAndImportSapText, loadImportacoes, loadLotes } from '../services/storageService';
import { ImportacaoRegistro, SapLoteItem } from '../types';
import { formatNumberBR } from '../services/fefoEngine';

interface ImportSapViewProps {
  onImportComplete: (newLotes: SapLoteItem[]) => void;
  activeUserName: string;
}

export const ImportSapView: React.FC<ImportSapViewProps> = ({
  onImportComplete,
  activeUserName,
}) => {
  const [importMode, setImportMode] = useState<'paste' | 'file'>('paste');
  const [pastedText, setPastedText] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [importHistory, setImportHistory] = useState<ImportacaoRegistro[]>(loadImportacoes());

  const handleTextPasteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pastedText.trim()) {
      setStatusMessage({
        type: 'error',
        text: 'Por favor, cole as linhas do relatório do SAP (MB52 / LX02) ou do Excel na caixa de texto.',
      });
      return;
    }

    setLoading(true);
    setStatusMessage(null);

    // Short delay to allow UI to render spinner and banner
    await new Promise((resolve) => setTimeout(resolve, 400));

    try {
      const res = parseAndImportSapText(pastedText, activeUserName);

      if (res.success) {
        setStatusMessage({ type: 'success', text: res.message });
        setImportHistory(loadImportacoes());
        setPastedText('');
        onImportComplete(res.newLotes || loadLotes());
      } else {
        setStatusMessage({ type: 'error', text: res.message });
      }
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: 'Erro ao processar dados colados: ' + (err?.message || 'Falha inesperada'),
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (file: File) => {
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls') && !file.name.endsWith('.csv')) {
      setStatusMessage({
        type: 'error',
        text: 'Formato de arquivo inválido. Por favor envie um relatório Excel (.xlsx ou .xls).',
      });
      return;
    }

    setLoading(true);
    setStatusMessage(null);

    // Short delay to allow UI to render spinner and banner
    await new Promise((resolve) => setTimeout(resolve, 400));

    try {
      const res = await parseAndImportSapExcel(file, activeUserName);

      if (res.success) {
        setStatusMessage({ type: 'success', text: res.message });
        setImportHistory(loadImportacoes());
        onImportComplete(res.newLotes || loadLotes());
      } else {
        setStatusMessage({ type: 'error', text: res.message });
      }
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: 'Erro ao processar arquivo: ' + (err?.message || 'Falha na leitura'),
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0]);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-[1920px] mx-auto p-4 sm:p-6">
      {/* Header Banner */}
      <div className="bg-slate-900 text-white p-5 rounded-xl border border-slate-800 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-6 h-6 text-blue-400" />
            <h2 className="text-lg font-black tracking-tight">Importar Dados do SAP</h2>
          </div>
          <p className="text-xs text-slate-300 mt-0.5">
            Copie a tabela do relatório do SAP (MB52 / LX02) e cole abaixo ou envie o arquivo Excel. O FEFO é recalculado instantaneamente.
          </p>
        </div>

        {/* Mode Selector */}
        <div className="flex items-center bg-slate-800 p-1 rounded-lg border border-slate-700">
          <button
            disabled={loading}
            onClick={() => setImportMode('paste')}
            className={`px-3 py-1.5 rounded text-xs font-bold transition-all flex items-center gap-1.5 ${
              loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
            } ${
              importMode === 'paste' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
            }`}
          >
            <ClipboardList className="w-3.5 h-3.5" />
            <span>Copiar e Colar</span>
          </button>
          <button
            disabled={loading}
            onClick={() => setImportMode('file')}
            className={`px-3 py-1.5 rounded text-xs font-bold transition-all flex items-center gap-1.5 ${
              loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
            } ${
              importMode === 'file' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Arquivo Excel</span>
          </button>
        </div>
      </div>

      {/* Loading Banner */}
      {loading && (
        <div className="bg-gradient-to-r from-blue-900 via-slate-900 to-blue-950 text-white p-4.5 rounded-xl border border-blue-600/80 shadow-lg flex items-center gap-3.5 animate-pulse">
          <div className="p-2 bg-blue-500/20 text-blue-300 rounded-lg border border-blue-400/30 shrink-0">
            <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
          </div>
          <div>
            <h4 className="font-extrabold text-sm text-white flex items-center gap-2">
              <span>Carregando e Salvando Dados do SAP...</span>
            </h4>
            <p className="text-xs text-blue-200/90 mt-0.5">
              Aguarde a validação, recálculo de FEFO e gravação dos dados no banco. Por favor, não saia desta tela.
            </p>
          </div>
        </div>
      )}

      {/* Status Message */}
      {statusMessage && !loading && (
        <div
          className={`p-4 rounded-xl border text-xs font-bold flex items-center gap-2.5 ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
              : 'bg-rose-50 text-rose-900 border-rose-300'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
          )}
          <div>{statusMessage.text}</div>
        </div>
      )}

      {/* COPIA E COLA MODE */}
      {importMode === 'paste' && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-blue-600" />
                Cole os Dados do SAP (MB52 / LX02 / Excel)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Selecione as linhas na sua planilha ou no relatório do SAP, pressione <kbd className="bg-slate-100 px-1.5 py-0.5 rounded border border-slate-300 font-mono text-[10px]">Ctrl+C</kbd> e cole no campo abaixo.
              </p>
            </div>
          </div>

          <form onSubmit={handleTextPasteSubmit} className="flex flex-col gap-3">
            <textarea
              disabled={loading}
              value={pastedText}
              onChange={(e) => setPastedText(e.target.value)}
              placeholder="Cole aqui a tabela copiada do SAP ou Excel...
Exemplo:
Nº Material	Desc. Material	Nº Lote	Depósito	Data Vencimento	Estoque Utiliz. Livre
30017870	MALTE PILSEN	0002847190	ARM1	15/09/2026	2500"
              rows={8}
              className="w-full bg-slate-50 disabled:bg-slate-100 disabled:text-slate-500 text-slate-900 font-mono text-xs p-3 rounded-lg border border-slate-300 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <span className="text-[11px] text-slate-400">
                O sistema identifica automaticamente cabeçalhos e colunas de Material, Lote, Validade e Estoque.
              </span>

              <button
                type="submit"
                disabled={loading || !pastedText.trim()}
                className={`font-bold text-xs px-6 py-2.5 rounded-lg shadow-sm transition-all flex items-center gap-2 ${
                  loading
                    ? 'bg-amber-600 text-white cursor-wait opacity-90'
                    : 'bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white cursor-pointer'
                }`}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Carregando Dados...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Importar Dados Colados</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* FILE UPLOAD MODE */}
      {importMode === 'file' && (
        <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center">
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`w-full max-w-2xl border-2 border-dashed rounded-xl p-8 transition-all flex flex-col items-center justify-center gap-4 ${
              dragActive
                ? 'border-blue-500 bg-blue-50/50 scale-[1.01]'
                : 'border-slate-300 bg-slate-50 hover:border-blue-400 hover:bg-slate-100/60'
            }`}
          >
            <div className="w-16 h-16 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shadow-inner">
              {loading ? (
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
              ) : (
                <Upload className="w-8 h-8 stroke-[2.2]" />
              )}
            </div>

            <div>
              <h3 className="text-sm font-black text-slate-800">
                Arraste e solte a planilha do SAP aqui ou clique abaixo
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Formatos aceitos: <strong>.XLSX</strong> ou <strong>.XLS</strong>.
              </p>
            </div>

            <label
              className={`relative cursor-pointer font-bold text-xs px-6 py-2.5 rounded-lg shadow-md transition-all active:scale-95 flex items-center gap-2 ${
                loading ? 'bg-amber-600 text-white cursor-wait opacity-90' : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Carregando Dados...</span>
                </>
              ) : (
                <span>Selecionar Arquivo Excel</span>
              )}
              <input
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={handleFileChange}
                disabled={loading}
                className="hidden"
              />
            </label>
          </div>
        </div>
      )}

      {/* Mapeamento de Colunas */}
      <div className="bg-slate-900 text-slate-200 p-5 rounded-xl border border-slate-800 shadow-sm">
        <h3 className="text-xs font-extrabold uppercase tracking-wider text-blue-400 flex items-center gap-2 mb-2">
          <Table className="w-4 h-4" />
          Mapeamento Automático SAP
        </h3>
        <p className="text-xs text-slate-400 mb-3">
          Colunas reconhecidas automaticamente ao colar ou enviar relatório:
        </p>

        <div className="flex flex-wrap gap-1.5 text-[11px] font-mono">
          {[
            'Nº Material',
            'Desc. Material',
            'Nº Lote',
            'Depósito',
            'Data Vencimento (SLED)',
            'Data Fabricação',
            'Estoque Utiliz. Livre',
            'Unidade Medida',
            'Nº Lote Fornecedor',
            'Fornecedor',
          ].map((col) => (
            <span
              key={col}
              className="bg-slate-800 text-blue-200 border border-slate-700/80 px-2 py-0.5 rounded"
            >
              {col}
            </span>
          ))}
        </div>
      </div>

      {/* History of Import Operations */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider flex items-center gap-2">
            <FileCheck className="w-4 h-4 text-emerald-600" />
            Histórico de Arquivos e Cargas Importadas
          </h3>
          {importHistory.length > 0 && (
            <button
              onClick={() => {
                const blob = new Blob([JSON.stringify(importHistory, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `HISTORICO_ARQUIVOS_IMPORTADOS_${new Date().toISOString().split('T')[0]}.json`;
                a.click();
                URL.revokeObjectURL(url);
              }}
              className="text-[11px] font-bold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded border border-blue-200 transition-all cursor-pointer flex items-center gap-1"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Exportar JSON de Importações</span>
            </button>
          )}
        </div>

        {importHistory.length === 0 ? (
          <div className="text-center py-6 text-xs text-slate-400">
            Nenhum histórico de importação ainda. Realize sua primeira importação acima.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[10px] border-b border-slate-200">
                <tr>
                  <th className="p-2.5">Data / Hora</th>
                  <th className="p-2.5">Origem</th>
                  <th className="p-2.5 text-center">Linhas Lidas</th>
                  <th className="p-2.5 text-center">Lotes Importados</th>
                  <th className="p-2.5 text-right">Estoque Livre Total</th>
                  <th className="p-2.5">Usuário</th>
                  <th className="p-2.5 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {importHistory.map((imp) => (
                  <tr key={imp.id} className="hover:bg-slate-50">
                    <td className="p-2.5 font-medium text-slate-800">
                      {new Date(imp.dataHora).toLocaleDateString('pt-BR')}{' '}
                      <span className="text-slate-400">
                        {new Date(imp.dataHora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </td>
                    <td className="p-2.5 font-mono font-bold text-slate-900">{imp.nomeArquivo}</td>
                    <td className="p-2.5 text-center text-slate-600 font-semibold">{imp.totalLinhasLidas}</td>
                    <td className="p-2.5 text-center font-bold text-emerald-700">{imp.totalLotesImportados}</td>
                    <td className="p-2.5 text-right font-black text-slate-900">
                      {formatNumberBR(imp.totalEstoqueLivreSum, 0)}
                    </td>
                    <td className="p-2.5 text-slate-700">{imp.usuario}</td>
                    <td className="p-2.5 text-center">
                      <span className="bg-emerald-100 text-emerald-800 font-bold text-[10px] px-2 py-0.5 rounded-full border border-emerald-300">
                        Sucesso
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
