export type UserRole = 'administrador' | 'supervisor' | 'conferente';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  unidade: string;
}

export interface ConferenteUser {
  id: string; // ID do Conferente (único, e.g. "CONF-101")
  nome: string;
  matricula: string;
  turno: 'Turno 1' | 'Turno 2' | 'Turno 3' | 'Administrativo' | 'Geral / 24h' | string;
  perfil: UserRole; // 'administrador' | 'supervisor' | 'conferente'
  status: 'Ativo' | 'Inativo';
  areaProducao?: string;
}

export interface SapLoteItem {
  id: string; // Unique string identifier
  materialCode: string; // Nº Material (e.g. "30017870")
  materialDesc: string; // Desc. Material (e.g. "MALTE PILSEN NACIONAL 50KG")
  centro: string; // Centro (e.g. "UB01")
  centroDesc: string; // Desc. Centro (e.g. "AMBEV UNIDADE BRASILIA")
  deposito: string; // Depósito (e.g. "ARM1")
  posicaoDeposito: string; // Posição Depósito (e.g. "A-12-03")
  loteSAP: string; // Nº Lote (e.g. "0002847190")
  loteFornecedor: string; // Nº Lote Fornecedor (e.g. "FORN-998231")
  tipoMaterial: string; // Tipo Material (e.g. "ROH")
  tipoMaterialDesc: string; // Desc. Tipo Material (e.g. "Matéria Prima")
  grupoMercadoria: string; // Grupo Mercadorias (e.g. "GRP-01")
  grupoMercadoriaDesc: string; // Desc. Grupo Mercadorias (e.g. "Maltes e Cereais")
  unidadeMedida: string; // Unidade Medida (e.g. "KG", "UN", "L")
  tipoAvaliacao: string; // Tipo Avaliação (e.g. "NACIONAL")
  fornecedor: string; // Fornecedor / Fabricante
  dataCriacaoLote: string; // YYYY-MM-DD
  dataFabricacao: string; // YYYY-MM-DD
  dataReferencia: string; // YYYY-MM-DD
  dataVencimento: string; // Data Vencimento (SLED) YYYY-MM-DD
  faixaEtaria: string;
  estoqueLivre: number; // Estoque Utiliz. Livre
  estoqueControleQualidade: number; // Estoque Contr. Qualidade
  estoqueBloqueado: number; // Estoque Bloqueado
  estoqueTotal: number; // Estoque Total
  idadeDias: number; // Idade em dias
  vidaUtilTotalDias: number; // Vida útil total em dias

  // Calculated FEFO attributes
  prioridadeFEFO: number; // 1 (Highest priority), 2, 3...
  diasParaVencer: number; // Days remaining to expire
  statusFEFO: 'fefo_1' | 'fefo_next' | 'warning_60' | 'critical_30' | 'expired' | 'no_stock';
  isCritical: boolean;
}

export type StatusControle = 'Pendente' | 'Baixado no SAP' | 'Auditado OK' | 'Divergente';

export interface AtendimentoHistorico {
  id: string;
  dataHora: string; // ISO String

  // Dados da Produção (Solicitante)
  numeroReserva: string; // Nº Reserva (e.g. "45091823")
  linhaReserva: string; // Linha / Destino Atendido (e.g. "Linha 01 / Brassagem")
  solicitanteProducao?: string; // Solicitante / Setor

  // Dados do Conferente (Atendimento)
  conferenteId: string; // ID do Conferente (único)
  conferenteNome: string; // Nome do Conferente
  conferenteMatricula?: string;
  conferenteTurno?: string;
  usuarioRole: UserRole;

  // Dados do Material e Lote
  materialCode: string;
  materialDesc: string;
  loteSAP: string;
  loteFornecedor: string;
  fornecedor: string;
  deposito: string;
  quantidadeAtendida: number;
  unidadeMedida: string;
  foiFefo1: boolean;
  justificativaDesvio?: string;

  // Dados do Time de Controle (Baixas SAP)
  statusControle: StatusControle;
  usuarioControle?: string;
  dataHoraControle?: string;
  observacaoControle?: string;
}

export interface ImportacaoRegistro {
  id: string;
  dataHora: string;
  nomeArquivo: string;
  totalLinhasLidas: number;
  totalLotesImportados: number;
  totalEstoqueLivreSum: number;
  usuario: string;
  status: 'sucesso' | 'com_avisos' | 'erro';
  mensagem: string;
  lotesImportados?: SapLoteItem[];
  rawText?: string;
}

export interface FilterState {
  searchTerm: string;
  materialCode: string;
  materialDesc: string;
  deposito: string;
  centro: string;
  grupoMercadoria: string;
  tipoMaterial: string;
  fornecedor: string;
  loteSAP: string;
  loteFornecedor: string;
  dataFabricacaoDe: string;
  dataFabricacaoAte: string;
  dataVencimentoDe: string;
  dataVencimentoAte: string;
  somenteComEstoque: boolean;
  somenteCriticos: boolean;
  statusFilter?: 'all' | 'com_estoque' | 'criticos' | 'vencendo30' | 'vencidos';
}

export interface DashboardKpis {
  totalMateriais: number;
  totalLotes: number;
  estoqueLivreTotal: number;
  materiaisCriticos: number;
  lotesVencendo30Dias: number;
  lotesVencidos: number;
  totalImportacoes: number;
  ultimaAtualizacao: string;
}
