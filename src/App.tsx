/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { Header } from './components/Header';
import { Navigation, TabType } from './components/Navigation';
import { DashboardKpiCards } from './components/DashboardKpiCards';
import { SidebarFilters } from './components/SidebarFilters';
import { MainLotesTable } from './components/MainLotesTable';
import { MaterialRightSummary } from './components/MaterialRightSummary';
import { AtendimentoModal } from './components/AtendimentoModal';
import { LoginModal } from './components/LoginModal';
import { SupabaseSqlModal } from './components/SupabaseSqlModal';

import { AtendimentoView } from './views/AtendimentoView';
import { ImportSapView } from './views/ImportSapView';
import { HistoricoView } from './views/HistoricoView';
import { ConfiguracoesView } from './views/ConfiguracoesView';
import { IndicadoresView } from './views/IndicadoresView';

import {
  loadLotes,
  saveLotes,
  restoreInitialMockLotes,
  clearAllLotesData,
  loadHistorico,
  saveHistoricoItem,
  deleteHistoricoItem,
  clearAllHistorico,
  loadImportacoes,
  loadActiveUserRole,
  saveActiveUserRole,
  getLastUpdateFormatted,
  loadConferentes,
  saveConferentes,
  loadLoggedUser,
  saveLoggedUser,
  updateHistoricoControleStatus,
} from './services/storageService';
import { recalculateFEFO } from './services/fefoEngine';
import { SapLoteItem, FilterState, DashboardKpis, AtendimentoHistorico, ImportacaoRegistro, UserRole, ConferenteUser, StatusControle } from './types';
import { Filter, CheckCircle2, UploadCloud, FileSpreadsheet } from 'lucide-react';

const initialFilters: FilterState = {
  searchTerm: '',
  materialCode: '',
  materialDesc: '',
  deposito: '',
  centro: '',
  grupoMercadoria: '',
  tipoMaterial: '',
  fornecedor: '',
  loteSAP: '',
  loteFornecedor: '',
  dataFabricacaoDe: '',
  dataFabricacaoAte: '',
  dataVencimentoDe: '',
  dataVencimentoAte: '',
  somenteComEstoque: true, // Default: consider free stock > 0
  somenteCriticos: false,
  statusFilter: 'all',
};

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [activeRole, setActiveRole] = useState<UserRole>(loadActiveUserRole());
  const [conferentes, setConferentes] = useState<ConferenteUser[]>(() => loadConferentes());
  const [loggedUser, setLoggedUser] = useState<ConferenteUser | null>(() => loadLoggedUser());
  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(() => !loadLoggedUser());
  const [isSupabaseSqlModalOpen, setIsSupabaseSqlModalOpen] = useState<boolean>(false);

  const [lotes, setLotes] = useState<SapLoteItem[]>(() => loadLotes());
  const [historicoList, setHistoricoList] = useState<AtendimentoHistorico[]>(() => loadHistorico());
  const [importacoesList, setImportacoesList] = useState<ImportacaoRegistro[]>(() => loadImportacoes());
  const [filters, setFilters] = useState<FilterState>(initialFilters);
  const [selectedLoteId, setSelectedLoteId] = useState<string | null>(null);
  const [atendimentoTargetLote, setAtendimentoTargetLote] = useState<SapLoteItem | null>(null);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState<boolean>(false);
  const [notification, setNotification] = useState<string | null>(null);

  const handleImportBackupJSON = (data: {
    lotes?: SapLoteItem[];
    historico?: AtendimentoHistorico[];
    importacoes?: ImportacaoRegistro[];
    conferentes?: ConferenteUser[];
  }) => {
    if (data.lotes && Array.isArray(data.lotes)) {
      handleDatasetUpdate(data.lotes);
    }
    if (data.historico && Array.isArray(data.historico)) {
      setHistoricoList(data.historico);
      localStorage.setItem('smart_fefo_historico_v2', JSON.stringify(data.historico));
    }
    if (data.importacoes && Array.isArray(data.importacoes)) {
      setImportacoesList(data.importacoes);
      localStorage.setItem('smart_fefo_importacoes_v2', JSON.stringify(data.importacoes));
    }
    if (data.conferentes && Array.isArray(data.conferentes)) {
      setConferentes(data.conferentes);
      saveConferentes(data.conferentes);
    }
    setNotification('Dados de backup restaurados e sincronizados!');
    setTimeout(() => setNotification(null), 3500);
  };

  // Sync role changes
  const handleRoleChange = (role: UserRole) => {
    setActiveRole(role);
    saveActiveUserRole(role);
  };

  const handleSelectLoggedUser = (user: ConferenteUser) => {
    setLoggedUser(user);
    saveLoggedUser(user);
    setActiveRole(user.perfil);
    setIsLoginModalOpen(false);
    setNotification(`Usuário autenticado: ${user.nome} (${user.id}).`);
    setTimeout(() => setNotification(null), 3500);
  };

  const handleLogout = () => {
    setLoggedUser(null);
    localStorage.removeItem('smart_fefo_logged_user_v2');
    setIsLoginModalOpen(true);
    setNotification('Sessão encerrada com sucesso.');
    setTimeout(() => setNotification(null), 3000);
  };

  // Recalculate FEFO on lotes dataset change
  const handleDatasetUpdate = (newLotes: SapLoteItem[]) => {
    const recalced = recalculateFEFO(newLotes);
    setLotes(recalced);
    saveLotes(recalced);
  };

  // Filter lotes according to Sidebar Filters & Search
  const filteredLotes = useMemo(() => {
    return lotes.filter((l) => {
      // 1. Check stock > 0 filter
      if (filters.somenteComEstoque && l.estoqueLivre <= 0) return false;

      // 2. Check critical filter (<= 30 days or expired)
      if (filters.somenteCriticos && l.diasParaVencer > 30) return false;

      // 2b. KPI Status Filter
      if (filters.statusFilter === 'com_estoque' && l.estoqueLivre <= 0) return false;
      if (filters.statusFilter === 'criticos' && l.diasParaVencer > 30) return false;
      if (filters.statusFilter === 'vencendo30' && !(l.diasParaVencer >= 0 && l.diasParaVencer <= 30)) return false;
      if (filters.statusFilter === 'vencidos' && l.diasParaVencer >= 0) return false;

      // 3. Search Term (Realtime)
      if (filters.searchTerm) {
        const term = filters.searchTerm.toLowerCase().trim();
        const matchesTerm =
          l.materialCode.toLowerCase().includes(term) ||
          l.materialDesc.toLowerCase().includes(term) ||
          l.loteSAP.toLowerCase().includes(term) ||
          l.loteFornecedor.toLowerCase().includes(term) ||
          l.fornecedor.toLowerCase().includes(term) ||
          l.deposito.toLowerCase().includes(term) ||
          l.posicaoDeposito.toLowerCase().includes(term);
        if (!matchesTerm) return false;
      }

      // 4. Specific field filters
      if (filters.materialCode && l.materialCode !== filters.materialCode) return false;
      if (filters.deposito && l.deposito !== filters.deposito) return false;
      if (filters.centro && l.centro !== filters.centro) return false;
      if (
        filters.grupoMercadoria &&
        l.grupoMercadoriaDesc !== filters.grupoMercadoria &&
        l.grupoMercadoria !== filters.grupoMercadoria
      )
        return false;
      if (
        filters.tipoMaterial &&
        l.tipoMaterialDesc !== filters.tipoMaterial &&
        l.tipoMaterial !== filters.tipoMaterial
      )
        return false;
      if (filters.fornecedor && l.fornecedor !== filters.fornecedor) return false;

      if (filters.loteSAP && !l.loteSAP.toLowerCase().includes(filters.loteSAP.toLowerCase().trim()))
        return false;
      if (
        filters.loteFornecedor &&
        !l.loteFornecedor.toLowerCase().includes(filters.loteFornecedor.toLowerCase().trim())
      )
        return false;

      // Date ranges
      if (filters.dataFabricacaoDe && l.dataFabricacao < filters.dataFabricacaoDe) return false;
      if (filters.dataFabricacaoAte && l.dataFabricacao > filters.dataFabricacaoAte) return false;
      if (filters.dataVencimentoDe && l.dataVencimento < filters.dataVencimentoDe) return false;
      if (filters.dataVencimentoAte && l.dataVencimento > filters.dataVencimentoAte) return false;

      return true;
    });
  }, [lotes, filters]);

  // Selected Lote
  const selectedLote = useMemo(() => {
    if (!selectedLoteId) return filteredLotes[0] || null;
    return lotes.find((l) => l.id === selectedLoteId) || filteredLotes[0] || null;
  }, [selectedLoteId, lotes, filteredLotes]);

  // Calculate Dashboard KPIs
  const kpis = useMemo<DashboardKpis>(() => {
    const totalMateriais = new Set(filteredLotes.map((l) => l.materialCode)).size;
    const totalLotes = filteredLotes.length;
    const estoqueLivreTotal = filteredLotes.reduce((acc, curr) => acc + curr.estoqueLivre, 0);
    const materiaisCriticos = filteredLotes.filter((l) => l.diasParaVencer <= 30 || l.diasParaVencer < 0).length;
    const lotesVencendo30Dias = filteredLotes.filter((l) => l.diasParaVencer >= 0 && l.diasParaVencer <= 30).length;
    const lotesVencidos = filteredLotes.filter((l) => l.diasParaVencer < 0).length;
    const importacoes = loadImportacoes();

    return {
      totalMateriais,
      totalLotes,
      estoqueLivreTotal,
      materiaisCriticos,
      lotesVencendo30Dias,
      lotesVencidos,
      totalImportacoes: importacoes.length,
      ultimaAtualizacao: getLastUpdateFormatted(),
    };
  }, [filteredLotes]);

  // Handle Confirm Atendimento (Picking Fulfillment)
  const handleConfirmAtendimento = (
    targetLote: SapLoteItem,
    quantidade: number,
    conferenteUser: ConferenteUser,
    justificativa?: string,
    numeroReserva?: string,
    linhaReserva?: string
  ) => {
    // 1. Deduct stock from the batch
    const updatedLotes = lotes.map((l) => {
      if (l.id === targetLote.id) {
        return {
          ...l,
          estoqueLivre: Math.max(0, l.estoqueLivre - quantidade),
          estoqueTotal: Math.max(0, l.estoqueTotal - quantidade),
        };
      }
      return l;
    });

    handleDatasetUpdate(updatedLotes);

    // 2. Register history record with 3 dimensions (Produção, Conferente, Time de Controle)
    const histRecord: AtendimentoHistorico = {
      id: `HIST-${Date.now()}`,
      dataHora: new Date().toISOString(),

      // Dados da Produção
      numeroReserva: numeroReserva || 'S/N',
      linhaReserva: linhaReserva || '0010',

      // Dados do Conferente
      conferenteId: conferenteUser.id,
      conferenteNome: conferenteUser.nome,
      conferenteMatricula: conferenteUser.matricula,
      conferenteTurno: conferenteUser.turno,
      usuarioRole: conferenteUser.perfil,

      // Dados do Material & Lote
      materialCode: targetLote.materialCode,
      materialDesc: targetLote.materialDesc,
      loteSAP: targetLote.loteSAP,
      loteFornecedor: targetLote.loteFornecedor,
      fornecedor: targetLote.fornecedor,
      deposito: targetLote.deposito,
      quantidadeAtendida: quantidade,
      unidadeMedida: targetLote.unidadeMedida,
      foiFefo1: targetLote.prioridadeFEFO === 1,
      justificativaDesvio: justificativa,

      // Dados do Time de Controle
      statusControle: 'Pendente',
    };

    saveHistoricoItem(histRecord);
    setHistoricoList(loadHistorico());

    // 3. Close modal and notify
    setAtendimentoTargetLote(null);
    setNotification(
      `Reserva Nº ${histRecord.numeroReserva} (${quantidade} ${targetLote.unidadeMedida}) atendida por ${conferenteUser.nome} (${conferenteUser.id})!`
    );

    setTimeout(() => setNotification(null), 4000);
  };

  const handleUpdateControlStatus = (
    id: string,
    novoStatus: StatusControle,
    usuarioControle: string,
    observacao?: string
  ) => {
    const updated = updateHistoricoControleStatus(id, novoStatus, usuarioControle, observacao);
    setHistoricoList(updated);
    setNotification(`Status da Reserva atualizado para: ${novoStatus}`);
    setTimeout(() => setNotification(null), 3000);
  };

  const handleDeleteSingleHistorico = (id: string) => {
    const updated = deleteHistoricoItem(id);
    setHistoricoList(updated);
    setNotification('Registro de histórico de reserva removido com sucesso.');
    setTimeout(() => setNotification(null), 3000);
  };

  const handleClearAllHistorico = () => {
    const updated = clearAllHistorico();
    setHistoricoList(updated);
    setNotification('Todo o histórico de reservas e atendimentos foi apagado com sucesso.');
    setTimeout(() => setNotification(null), 3000);
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 font-sans flex flex-col antialiased">
      {/* Header */}
      <Header
        lastUpdate={kpis.ultimaAtualizacao}
        onOpenImport={() => setActiveTab('importacao')}
        onOpenSupabaseSql={() => setIsSupabaseSqlModalOpen(true)}
        loggedUser={loggedUser}
        onOpenLogin={() => setIsLoginModalOpen(true)}
        onLogout={handleLogout}
      />

      {/* Navigation */}
      <Navigation
        activeTab={activeTab}
        onTabChange={setActiveTab}
        criticalCount={kpis.materiaisCriticos}
      />

      {/* Temporary Success Notification Toast */}
      {notification && (
        <div className="bg-emerald-600 text-white font-extrabold text-xs px-4 py-3 shadow-lg flex items-center justify-between sticky top-[90px] z-40 animate-in slide-in-from-top-2">
          <div className="flex items-center gap-2 max-w-[1920px] mx-auto w-full">
            <CheckCircle2 className="w-5 h-5" />
            <span>{notification}</span>
          </div>
        </div>
      )}

      {/* Main Content Body */}
      <main className="flex-1 flex flex-col">
        {activeTab === 'dashboard' && (
          <div className="p-4 sm:p-6 max-w-[1920px] mx-auto w-full flex-1 flex flex-col gap-4">
            {lotes.length === 0 ? (
              <div className="bg-white p-12 rounded-xl border border-slate-200 shadow-sm text-center flex flex-col items-center justify-center gap-4 my-auto">
                <div className="w-16 h-16 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                  <FileSpreadsheet className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    A base de dados está vazia
                  </h3>
                  <p className="text-xs text-slate-500 max-w-md mt-1">
                    Nenhum dado fictício está sendo exibido. Importe o relatório do SAP (Excel ou Copia e Cola) para calcular a ordem FEFO das suas reservas com dados reais.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setActiveTab('importacao')}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-6 py-2.5 rounded-lg shadow-sm transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <UploadCloud className="w-4 h-4" />
                    <span>Importar Relatório SAP</span>
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Top Indicator Cards */}
                <DashboardKpiCards
                  kpis={kpis}
                  filteredCount={filteredLotes.length}
                  totalCount={lotes.length}
                  filters={filters}
                  onFilterChange={setFilters}
                  onResetFilters={() => setFilters(initialFilters)}
                  onNavigateTab={(tab) => setActiveTab(tab)}
                />

                {/* Mobile Filter Toggle Button */}
                <div className="md:hidden mb-3">
                  <button
                    onClick={() => setIsMobileFilterOpen(!isMobileFilterOpen)}
                    className="w-full bg-slate-900 text-white text-xs font-bold py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Filter className="w-4 h-4 text-blue-400" />
                    <span>
                      {isMobileFilterOpen ? 'Fechar Filtros' : 'Abrir Painel de Filtros'}
                    </span>
                  </button>
                </div>

                {/* Power BI Workspace Layout: Sidebar Filters | Central Table | Right Summary */}
                <div className="flex flex-col md:flex-row gap-4 flex-1 items-start">
                  {/* Left Sidebar Filter Panel */}
                  <SidebarFilters
                    filters={filters}
                    onFilterChange={setFilters}
                    onResetFilters={() => setFilters(initialFilters)}
                    lotes={lotes}
                    isOpenMobile={isMobileFilterOpen}
                    onToggleMobile={() => setIsMobileFilterOpen(!isMobileFilterOpen)}
                  />

                  {/* Central Main Table */}
                  <div className="flex-1 w-full min-w-0">
                    <MainLotesTable
                      lotes={filteredLotes}
                      selectedLoteId={selectedLote?.id || null}
                      onSelectLote={(lote) => setSelectedLoteId(lote.id)}
                      onOpenAtendimentoModal={(lote) => setAtendimentoTargetLote(lote)}
                      onDeleteLote={(id) => {
                        const updated = lotes.filter((l) => l.id !== id);
                        handleDatasetUpdate(updated);
                        setNotification('Lote removido da base de estoque com sucesso.');
                        setTimeout(() => setNotification(null), 3000);
                      }}
                      onClearAllLotes={() => {
                        clearAllLotesData();
                        setLotes([]);
                        setNotification('Tabela de lotes zerada com sucesso.');
                        setTimeout(() => setNotification(null), 3000);
                      }}
                    />
                  </div>

                  {/* Right Detail Summary Panel */}
                  <MaterialRightSummary
                    selectedLote={selectedLote}
                    onClose={() => setSelectedLoteId(null)}
                    onOpenAtendimentoModal={(lote) => setAtendimentoTargetLote(lote)}
                  />
                </div>
              </>
            )}
          </div>
        )}

        {/* View Tabs */}
        {activeTab === 'indicadores' && <IndicadoresView lotes={lotes} />}

        {activeTab === 'historico' && (
          <HistoricoView
            historicoList={historicoList}
            onUpdateStatus={handleUpdateControlStatus}
            onDeleteSingleHistorico={handleDeleteSingleHistorico}
            onClearAllHistorico={handleClearAllHistorico}
            activeUserName={loggedUser ? `${loggedUser.nome} (${loggedUser.id})` : 'Time de Controle'}
          />
        )}

        {activeTab === 'importacao' && (
          <ImportSapView
            activeUserName={loggedUser ? loggedUser.nome : 'Conferente SAP'}
            onImportComplete={(newLotes) => handleDatasetUpdate(newLotes)}
          />
        )}

        {activeTab === 'configuracoes' && (
          <ConfiguracoesView
            activeRole={activeRole}
            onRoleChange={handleRoleChange}
            onClearLotes={() => {
              clearAllLotesData();
              setLotes([]);
              setNotification('Base de dados limpa com sucesso. Pronta para importação SAP!');
              setTimeout(() => setNotification(null), 3000);
            }}
            onClearHistorico={handleClearAllHistorico}
            onResetDemoData={() => {
              const restored = restoreInitialMockLotes();
              setLotes(restored);
              setNotification('Base de dados SAP de demonstração carregada!');
              setTimeout(() => setNotification(null), 3000);
            }}
          />
        )}
      </main>

      {/* Picking Fulfillment Modal */}
      {atendimentoTargetLote && (
        <AtendimentoModal
          lote={atendimentoTargetLote}
          activeRole={activeRole}
          loggedUser={loggedUser}
          onClose={() => setAtendimentoTargetLote(null)}
          onConfirmAtendimento={handleConfirmAtendimento}
        />
      )}

      {/* Login / User Switch Modal */}
      <LoginModal
        isOpen={isLoginModalOpen}
        conferentes={conferentes}
        currentLoggedUser={loggedUser}
        onSelectUser={handleSelectLoggedUser}
        onClose={() => setIsLoginModalOpen(false)}
        canClose={Boolean(loggedUser)}
      />

      {/* Supabase SQL & Multi-Machine Sync Modal */}
      <SupabaseSqlModal
        isOpen={isSupabaseSqlModalOpen}
        onClose={() => setIsSupabaseSqlModalOpen(false)}
        lotes={lotes}
        historico={historicoList}
        importacoes={importacoesList}
        conferentes={conferentes}
        onImportBackupJSON={handleImportBackupJSON}
      />

    </div>
  );
}

