import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import {
  History,
  Search,
  Printer,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  UserCheck,
  CheckSquare,
  Clock,
  ShieldCheck,
  AlertCircle,
  Factory,
  Trash2,
  Download,
} from 'lucide-react';
import { AtendimentoHistorico, StatusControle } from '../types';
import { formatNumberBR } from '../services/fefoEngine';
import { ConfirmModal } from '../components/ConfirmModal';

interface HistoricoViewProps {
  historicoList: AtendimentoHistorico[];
  onUpdateStatus?: (
    id: string,
    novoStatus: StatusControle,
    usuarioControle: string,
    observacao?: string
  ) => void;
  onDeleteSingleHistorico?: (id: string) => void;
  onClearAllHistorico?: () => void;
  activeUserName?: string;
}

export const HistoricoView: React.FC<HistoricoViewProps> = ({
  historicoList,
  onUpdateStatus,
  onDeleteSingleHistorico,
  onClearAllHistorico,
  activeUserName = 'Time de Controle SAP',
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('TODOS');
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

  const searchLower = searchTerm.toLowerCase().trim();
  const filteredHistory = historicoList.filter((item) => {
    const matchesSearch =
      !searchLower ||
      item.materialCode.toLowerCase().includes(searchLower) ||
      item.materialDesc.toLowerCase().includes(searchLower) ||
      item.loteSAP.toLowerCase().includes(searchLower) ||
      (item.conferenteNome || '').toLowerCase().includes(searchLower) ||
      (item.conferenteId || '').toLowerCase().includes(searchLower) ||
      (item.numeroReserva || '').toLowerCase().includes(searchLower) ||
      (item.linhaReserva || '').toLowerCase().includes(searchLower);

    const matchesStatus =
      statusFilter === 'TODOS' || (item.statusControle || 'Pendente') === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Calculate KPIs for Control Team
  const totalReservas = historicoList.length;
  const pendentesCount = historicoList.filter(
    (i) => !i.statusControle || i.statusControle === 'Pendente'
  ).length;
  const baixadosCount = historicoList.filter((i) => i.statusControle === 'Baixado no SAP').length;
  const auditadosCount = historicoList.filter((i) => i.statusControle === 'Auditado OK').length;
  const divergentesCount = historicoList.filter((i) => i.statusControle === 'Divergente').length;

  // Export to Excel XLSX
  const handleExportExcel = () => {
    const dataToExport = filteredHistory.map((item) => ({
      'ID Reserva': item.id,
      'Data / Hora': new Date(item.dataHora).toLocaleString('pt-BR'),
      'Nº Reserva Produção': item.numeroReserva || '-',
      'Linha / Destino': item.linhaReserva || '-',
      'ID Conferente': item.conferenteId || '-',
      'Nome Conferente': item.conferenteNome || '-',
      'Matrícula Conferente': item.conferenteMatricula || '-',
      'Turno Conferente': item.conferenteTurno || '-',
      'Nº Material': item.materialCode,
      'Descrição Material': item.materialDesc,
      'Nº Lote SAP': item.loteSAP,
      'Depósito': item.deposito,
      'Quantidade Atendida': item.quantidadeAtendida,
      'Unidade': item.unidadeMedida,
      'Conforme FEFO #1': item.foiFefo1 ? 'SIM' : 'NÃO',
      'Justificativa Desvio': item.justificativaDesvio || '-',
      'Status Controle': item.statusControle || 'Pendente',
      'Responsável Controle': item.usuarioControle || '-',
      'Data Controle': item.dataHoraControle
        ? new Date(item.dataHoraControle).toLocaleString('pt-BR')
        : '-',
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Controle_Baixas_Reservas');

    XLSX.writeFile(
      workbook,
      `SMART_FEFO_CONTROLE_BAIXAS_${new Date().toISOString().split('T')[0]}.xlsx`
    );
  };

  const handleStatusChange = (id: string, newStatus: StatusControle) => {
    if (onUpdateStatus) {
      onUpdateStatus(id, newStatus, activeUserName);
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-[1920px] mx-auto p-4 sm:p-6 print:p-0">
      {/* Control Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 print:hidden">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <span className="text-[10px] font-extrabold uppercase text-slate-400">Total Reservas</span>
          <div className="text-xl font-black text-slate-900 mt-1">{totalReservas}</div>
          <span className="text-[10px] text-slate-500 mt-0.5">Atendidas no Chão de Fábrica</span>
        </div>

        <div className="bg-amber-50 p-3.5 rounded-xl border border-amber-200 shadow-xs flex flex-col justify-between">
          <span className="text-[10px] font-extrabold uppercase text-amber-800 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            Pendentes no SAP
          </span>
          <div className="text-xl font-black text-amber-900 mt-1">{pendentesCount}</div>
          <span className="text-[10px] text-amber-700 mt-0.5">Aguardando Baixa no SAP</span>
        </div>

        <div className="bg-blue-50 p-3.5 rounded-xl border border-blue-200 shadow-xs flex flex-col justify-between">
          <span className="text-[10px] font-extrabold uppercase text-blue-800 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
            Atendidas / Baixadas
          </span>
          <div className="text-xl font-black text-blue-900 mt-1">{baixadosCount}</div>
          <span className="text-[10px] text-blue-700 mt-0.5">Movimentação Concluída</span>
        </div>

        <div className="bg-rose-50 p-3.5 rounded-xl border border-rose-200 shadow-xs flex flex-col justify-between">
          <span className="text-[10px] font-extrabold uppercase text-rose-800 flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
            Divergências
          </span>
          <div className="text-xl font-black text-rose-900 mt-1">{divergentesCount}</div>
          <span className="text-[10px] text-rose-700 mt-0.5">Requer atenção do Controle</span>
        </div>
      </div>

      {/* Toolbar: Search + Status Filter */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3 text-xs print:hidden">
        <div className="flex items-center gap-3 flex-1 min-w-[260px]">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Pesquisar por Nº Reserva, Material, Lote, Conferente ou ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full text-xs font-semibold text-slate-900 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-600">Status do Controle:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-50 text-slate-800 font-bold p-2 rounded-lg border border-slate-300 focus:outline-none focus:border-blue-500"
          >
            <option value="TODOS">Todos os Status</option>
            <option value="Pendente">Apenas Pendentes</option>
            <option value="Baixado no SAP">Apenas Baixados no SAP</option>
            <option value="Auditado OK">Apenas Auditados OK</option>
            <option value="Divergente">Apenas Divergentes</option>
          </select>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="text-xs font-black uppercase tracking-wider flex items-center gap-2">
            <Factory className="w-4 h-4 text-blue-400" />
            Painel Unificado: Produção, Conferência e Time de Controle ({filteredHistory.length})
          </h3>

          <div className="flex items-center gap-2">
            {filteredHistory.length > 0 && (
              <button
                onClick={handleExportExcel}
                className="text-xs font-extrabold bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Exportar Excel</span>
              </button>
            )}

            {historicoList.length > 0 && onClearAllHistorico && (
              <button
                onClick={() => {
                  setConfirmModal({
                    isOpen: true,
                    title: 'Limpar Todo o Histórico de Reservas',
                    message: 'Tem certeza de que deseja apagar TODO o histórico de atendimentos e reservas salvas? Esta ação não pode ser desfeita.',
                    onConfirm: () => {
                      onClearAllHistorico();
                    },
                  });
                }}
                className="text-xs font-extrabold bg-rose-600 hover:bg-rose-500 text-white px-3 py-1.5 rounded-lg transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                title="Apagar todo o histórico de atendimentos e reservas"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Limpar Histórico</span>
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-100 text-slate-800 font-extrabold uppercase text-[10px] border-b border-slate-300">
              <tr>
                <th className="p-3 bg-slate-200/70 border-r border-slate-300 text-blue-900">
                  1. Dados da Produção
                </th>
                <th className="p-3 bg-slate-100 border-r border-slate-300 text-slate-900">
                  2. Conferente Atendente
                </th>
                <th className="p-3 border-r border-slate-300 text-slate-900">
                  3. Material & Lote SAP
                </th>
                <th className="p-3 bg-slate-200/70 text-slate-900 text-center">
                  4. Time de Controle (Status Baixa)
                </th>
                <th className="p-3 text-slate-900 text-center w-12">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredHistory.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400">
                    Nenhuma reserva encontrada.
                  </td>
                </tr>
              ) : (
                filteredHistory.map((item) => {
                  const status = item.statusControle || 'Pendente';
                  return (
                    <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                      {/* 1. Dados da Produção */}
                      <td className="p-3 bg-slate-50/50 border-r border-slate-200 space-y-1">
                        <div>
                          <span className="text-[10px] text-slate-400 uppercase font-bold">Nº Reserva SAP:</span>
                          <div className="font-mono font-black text-sm text-blue-700">
                            {item.numeroReserva || 'S/N'}
                          </div>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 uppercase font-bold">Linha / Destino:</span>
                          <div className="font-bold text-slate-800">{item.linhaReserva || 'Geral'}</div>
                        </div>
                        <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-200">
                          Data/Hora:{' '}
                          <span className="font-medium text-slate-700">
                            {new Date(item.dataHora).toLocaleDateString('pt-BR')}{' '}
                            {new Date(item.dataHora).toLocaleTimeString('pt-BR', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      </td>

                      {/* 2. Conferente Atendente */}
                      <td className="p-3 border-r border-slate-200 space-y-1">
                        <div className="flex items-center gap-1.5">
                          <span className="bg-slate-200 font-mono font-black text-slate-900 text-[10px] px-1.5 py-0.5 rounded border border-slate-300">
                            {item.conferenteId || 'CONF-101'}
                          </span>
                          <span className="font-extrabold text-slate-900">{item.conferenteNome || item.usuarioNome}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          Matrícula: {item.conferenteMatricula || '102938'} | {item.conferenteTurno || 'Turno 1'}
                        </div>
                        <div className="text-[10px] capitalize text-blue-700 font-semibold">
                          Perfil: {item.usuarioRole}
                        </div>
                      </td>

                      {/* 3. Material & Lote SAP */}
                      <td className="p-3 border-r border-slate-200 space-y-1">
                        <div className="font-mono font-black text-slate-900 text-sm">{item.materialCode}</div>
                        <div className="font-medium text-slate-700 text-xs line-clamp-1">{item.materialDesc}</div>
                        <div className="flex items-center gap-3 pt-1 text-[11px]">
                          <span>
                            Lote: <strong className="font-mono text-slate-900">{item.loteSAP}</strong>
                          </span>
                          <span>•</span>
                          <span>
                            Qtd:{' '}
                            <strong className="text-emerald-700 font-black">
                              {formatNumberBR(item.quantidadeAtendida, 0)} {item.unidadeMedida}
                            </strong>
                          </span>
                        </div>
                        <div>
                          {item.foiFefo1 ? (
                            <span className="bg-emerald-100 text-emerald-800 font-extrabold text-[10px] px-2 py-0.5 rounded border border-emerald-300">
                              FEFO #1 Conforme
                            </span>
                          ) : (
                            <span className="bg-amber-100 text-amber-900 font-bold text-[10px] px-2 py-0.5 rounded border border-amber-300">
                              Desvio: {item.justificativaDesvio || 'Não informado'}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 4. Time de Controle */}
                      <td className="p-3 bg-slate-50/50 space-y-2 text-center">
                        <div>
                          <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                            Status no SAP
                          </span>
                          <span
                            className={`inline-block text-xs font-black px-3 py-1 rounded-full border ${
                              status === 'Baixado no SAP'
                                ? 'bg-blue-100 text-blue-900 border-blue-300'
                                : status === 'Auditado OK'
                                ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                                : status === 'Divergente'
                                ? 'bg-rose-100 text-rose-900 border-rose-300'
                                : 'bg-amber-100 text-amber-900 border-amber-300'
                            }`}
                          >
                            {status}
                          </span>
                        </div>

                        {/* Action buttons for Control Team: Atendida & Pendente */}
                        <div className="flex items-center justify-center gap-2 pt-1">
                          <button
                            onClick={() => handleStatusChange(item.id, 'Baixado no SAP')}
                            className={`font-extrabold text-[11px] px-3 py-1.5 rounded-md shadow-xs transition-all active:scale-95 cursor-pointer flex items-center gap-1 ${
                              status === 'Baixado no SAP' || status === 'Auditado OK' || (status as string) === 'Atendida'
                                ? 'bg-emerald-600 text-white ring-2 ring-emerald-400'
                                : 'bg-emerald-100 hover:bg-emerald-600 text-emerald-900 hover:text-white border border-emerald-300'
                            }`}
                            title="Marcar reserva como Atendida"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Atendida</span>
                          </button>

                          <button
                            onClick={() => handleStatusChange(item.id, 'Pendente')}
                            className={`font-extrabold text-[11px] px-3 py-1.5 rounded-md shadow-xs transition-all active:scale-95 cursor-pointer flex items-center gap-1 ${
                              status === 'Pendente'
                                ? 'bg-amber-500 text-white ring-2 ring-amber-300'
                                : 'bg-amber-100 hover:bg-amber-500 text-amber-900 hover:text-white border border-amber-300'
                            }`}
                            title="Marcar reserva como Pendente"
                          >
                            <Clock className="w-3.5 h-3.5" />
                            <span>Pendente</span>
                          </button>
                        </div>
                      </td>

                      {/* 5. Ações (Excluir item) */}
                      <td className="p-3 text-center align-middle">
                        {onDeleteSingleHistorico && (
                          <button
                            onClick={() => {
                              setConfirmModal({
                                isOpen: true,
                                title: 'Apagar Registro de Reserva',
                                message: `Deseja realmente apagar o registro da Reserva Nº ${item.numeroReserva || item.id}?`,
                                onConfirm: () => {
                                  onDeleteSingleHistorico(item.id);
                                },
                              });
                            }}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Apagar este registro do histórico"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
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

