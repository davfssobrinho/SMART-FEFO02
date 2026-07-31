import * as XLSX from 'xlsx';
import { SapLoteItem, AtendimentoHistorico, ImportacaoRegistro, UserRole, ConferenteUser, StatusControle } from '../types';
import { getInitialMockLotes } from '../data/mockSapData';
import { recalculateFEFO, parseSapDate, parseSapNumber } from './fefoEngine';

const STORAGE_KEYS = {
  LOTES: 'smart_fefo_lotes_real_v1',
  HISTORICO: 'smart_fefo_historico_v2',
  IMPORTACOES: 'smart_fefo_importacoes_v2',
  USER_ROLE: 'smart_fefo_user_role_v2',
  LAST_UPDATE: 'smart_fefo_last_update_v2',
  CONFERENTES: 'smart_fefo_conferentes_v1',
  LOGGED_USER: 'smart_fefo_logged_user_v1',
};

/**
 * Safe helper to set item in localStorage without throwing QuotaExceededError.
 * In case quota is exceeded, automatically cleans up older bulky import logs to free space.
 */
function safeSetItem(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (err) {
    console.warn(`localStorage quota exceeded when setting '${key}'. Attempting automatic storage cleanup...`, err);

    // Step 1: Clean bulky import history
    try {
      const savedImportacoes = localStorage.getItem(STORAGE_KEYS.IMPORTACOES);
      if (savedImportacoes) {
        const importacoes = JSON.parse(savedImportacoes);
        if (Array.isArray(importacoes)) {
          // Keep only top 5, strip lotesImportados and rawText
          const lightweight = importacoes.slice(0, 5).map((imp: Record<string, unknown>) => ({
            ...imp,
            lotesImportados: undefined,
            rawText: undefined,
          }));
          localStorage.setItem(STORAGE_KEYS.IMPORTACOES, JSON.stringify(lightweight));
        }
      }
    } catch (_) {
      // Ignore cleanup error
    }

    // Step 2: Retry setting the item
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (retryErr) {
      console.warn(`Quota still exceeded for '${key}'. Clearing older import logs completely to free memory.`, retryErr);

      // Step 3: Remove importacoes completely if necessary to prioritize lotes and core state
      try {
        localStorage.removeItem(STORAGE_KEYS.IMPORTACOES);
        localStorage.setItem(key, value);
        return true;
      } catch (finalErr) {
        console.error(`Critical storage error saving key '${key}':`, finalErr);
        return false;
      }
    }
  }
}

// Initial default list of conferentes
const DEFAULT_CONFERENTES: ConferenteUser[] = [
  {
    id: 'CONF-101',
    nome: 'Carlos Silva',
    matricula: '102938',
    turno: 'Turno 1',
    perfil: 'conferente',
    status: 'Ativo',
    areaProducao: 'Brassagem / Processos',
  },
  {
    id: 'CONF-102',
    nome: 'Mariana Oliveira',
    matricula: '204918',
    turno: 'Turno 2',
    perfil: 'conferente',
    status: 'Ativo',
    areaProducao: 'Envase / Linha 01',
  },
  {
    id: 'CONF-103',
    nome: 'Roberto Santos',
    matricula: '301928',
    turno: 'Turno 3',
    perfil: 'conferente',
    status: 'Ativo',
    areaProducao: 'Adegas / Filtragem',
  },
  {
    id: 'CONF-201',
    nome: 'Juliana Costa',
    matricula: '881920',
    turno: 'Administrativo',
    perfil: 'supervisor',
    status: 'Ativo',
    areaProducao: 'Supervisão de Logística',
  },
  {
    id: 'CONF-901',
    nome: 'Marcos Souza',
    matricula: '990112',
    turno: 'Administrativo',
    perfil: 'administrador',
    status: 'Ativo',
    areaProducao: 'Controle de Estoque & SAP',
  },
];

// Load List of Conferentes
export function loadConferentes(): ConferenteUser[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.CONFERENTES);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Failed to load conferentes', err);
  }
  saveConferentes(DEFAULT_CONFERENTES);
  return DEFAULT_CONFERENTES;
}

export function saveConferentes(list: ConferenteUser[]): void {
  safeSetItem(STORAGE_KEYS.CONFERENTES, JSON.stringify(list));
}

export function saveConferente(conf: ConferenteUser): ConferenteUser[] {
  const current = loadConferentes();
  const index = current.findIndex((c) => c.id === conf.id);
  let updated: ConferenteUser[];
  if (index >= 0) {
    updated = [...current];
    updated[index] = conf;
  } else {
    updated = [conf, ...current];
  }
  saveConferentes(updated);
  return updated;
}

// Logged In User State
export function loadLoggedUser(): ConferenteUser | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.LOGGED_USER);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (err) {
    console.error('Failed to load logged user', err);
  }
  return null;
}

export function saveLoggedUser(user: ConferenteUser): void {
  safeSetItem(STORAGE_KEYS.LOGGED_USER, JSON.stringify(user));
  safeSetItem(STORAGE_KEYS.USER_ROLE, user.perfil);
}

export function logoutUser(): void {
  localStorage.removeItem(STORAGE_KEYS.LOGGED_USER);
}

// Helper to check if a string is formatted as a date
function isDatePattern(val: string): boolean {
  if (!val) return false;
  const v = val.trim();
  return (
    /^\d{1,2}[\/\.-]\d{1,2}[\/\.-]\d{2,4}$/.test(v) ||
    /^\d{4}-\d{2}-\d{2}$/.test(v) ||
    /^\d{2}\/\d{2}\/\d{4}$/.test(v) ||
    /^\d{4}\/\d{2}\/\d{2}$/.test(v)
  );
}

// Ensure lot numbers are not accidentally populated with dates
export function sanitizeLoteItem(l: SapLoteItem): SapLoteItem {
  let loteSAP = l.loteSAP ? String(l.loteSAP).trim() : '';
  let loteFornecedor = l.loteFornecedor ? String(l.loteFornecedor).trim() : '';

  if (isDatePattern(loteSAP)) {
    if (loteFornecedor && !isDatePattern(loteFornecedor)) {
      loteSAP = loteFornecedor;
    } else if (l.id && !isDatePattern(l.id)) {
      loteSAP = l.id.replace(/^(TXT|EXCEL|LOTE)-/, '');
    } else {
      loteSAP = `LOTE-${l.materialCode || '001'}`;
    }
  }

  if (isDatePattern(loteFornecedor)) {
    loteFornecedor = loteSAP;
  }

  return {
    ...l,
    loteSAP,
    loteFornecedor,
  };
}

// Load Lotes from Storage
export function loadLotes(): SapLoteItem[] {
  try {
    // Purge old mock storage keys if present
    localStorage.removeItem('smart_fefo_lotes_v2');
    localStorage.removeItem('smart_fefo_lotes_v1');

    const saved = localStorage.getItem(STORAGE_KEYS.LOTES);
    if (saved !== null) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        // Exclude all mock/example dataset items (e.g. LOTE-101..802, MOCK-, DEMO-)
        const realOnly = parsed.filter(
          (l: SapLoteItem) =>
            l.id &&
            !l.id.startsWith('LOTE-') &&
            !l.id.startsWith('MOCK-') &&
            !l.id.startsWith('DEMO-')
        );
        const updated = realOnly.map((l: SapLoteItem) => {
          return sanitizeLoteItem({
            ...l,
            centro: l.centro || '',
            centroDesc: l.centroDesc || '',
            deposito: l.deposito || '',
          });
        });
        const result = recalculateFEFO(updated);
        // Persist cleaned list so mock lotes are removed permanently from storage
        safeSetItem(STORAGE_KEYS.LOTES, JSON.stringify(result));
        return result;
      }
    }
  } catch (err) {
    console.error('Failed to load lotes from localStorage', err);
  }
  
  // Clean default state: 0 lotes
  safeSetItem(STORAGE_KEYS.LOTES, JSON.stringify([]));
  return [];
}

// Save Lotes to Storage
export function saveLotes(lotes: SapLoteItem[]): void {
  try {
    const sanitized = lotes.map(sanitizeLoteItem);
    const recalced = recalculateFEFO(sanitized);
    safeSetItem(STORAGE_KEYS.LOTES, JSON.stringify(recalced));
    safeSetItem(STORAGE_KEYS.LAST_UPDATE, new Date().toISOString());
  } catch (err) {
    console.error('Failed to save lotes to localStorage', err);
  }
}

export function clearAllLotesData(): SapLoteItem[] {
  saveLotes([]);
  return [];
}

export function restoreInitialMockLotes(): SapLoteItem[] {
  const initialMock = getInitialMockLotes();
  saveLotes(initialMock);
  return initialMock;
}

// Load Atendimentos History
export function loadHistorico(): AtendimentoHistorico[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.HISTORICO);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (err) {
    console.error('Failed to load historico', err);
  }
  return [];
}

export function saveHistoricoItem(item: AtendimentoHistorico): void {
  const current = loadHistorico();
  const updated = [item, ...current].slice(0, 500); // Cap at 500 items
  safeSetItem(STORAGE_KEYS.HISTORICO, JSON.stringify(updated));
}

export function updateHistoricoControleStatus(
  id: string,
  novoStatus: StatusControle,
  usuarioControle: string,
  observacao?: string
): AtendimentoHistorico[] {
  const current = loadHistorico();
  const updated = current.map((item) => {
    if (item.id === id) {
      return {
        ...item,
        statusControle: novoStatus,
        usuarioControle,
        dataHoraControle: new Date().toISOString(),
        observacaoControle: observacao || item.observacaoControle,
      };
    }
    return item;
  });
  safeSetItem(STORAGE_KEYS.HISTORICO, JSON.stringify(updated));
  return updated;
}

export function deleteHistoricoItem(id: string): AtendimentoHistorico[] {
  const current = loadHistorico();
  const updated = current.filter((item) => item.id !== id);
  safeSetItem(STORAGE_KEYS.HISTORICO, JSON.stringify(updated));
  return updated;
}

export function clearAllHistorico(): AtendimentoHistorico[] {
  safeSetItem(STORAGE_KEYS.HISTORICO, JSON.stringify([]));
  return [];
}

// Load Import logs with self-healing to clear heavy legacy payloads
export function loadImportacoes(): ImportacaoRegistro[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.IMPORTACOES);
    if (saved) {
      const parsed: ImportacaoRegistro[] = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        let needsClean = false;
        const cleaned = parsed.map((item) => {
          if (item.lotesImportados || (item.rawText && item.rawText.length > 200)) {
            needsClean = true;
          }
          return {
            ...item,
            lotesImportados: undefined,
            rawText: item.rawText ? item.rawText.substring(0, 200) : undefined,
          };
        });
        if (needsClean) {
          safeSetItem(STORAGE_KEYS.IMPORTACOES, JSON.stringify(cleaned.slice(0, 15)));
        }
        return cleaned;
      }
    }
  } catch (err) {
    console.error('Failed to load importacoes', err);
  }
  return [];
}

export function saveImportacaoRegistro(reg: ImportacaoRegistro): void {
  // Strip heavy rawText and lotesImportados to prevent storage quota exceptions
  const lightweightReg: ImportacaoRegistro = {
    ...reg,
    rawText: reg.rawText ? (reg.rawText.length > 200 ? reg.rawText.substring(0, 200) + '...' : reg.rawText) : undefined,
    lotesImportados: undefined,
  };

  const current = loadImportacoes().map((item) => ({
    ...item,
    lotesImportados: undefined,
    rawText: undefined,
  }));

  const updated = [lightweightReg, ...current].slice(0, 30);
  safeSetItem(STORAGE_KEYS.IMPORTACOES, JSON.stringify(updated));
}

export function deleteImportacaoRegistro(id: string): ImportacaoRegistro[] {
  const current = loadImportacoes();
  const updated = current.filter((item) => item.id !== id);
  safeSetItem(STORAGE_KEYS.IMPORTACOES, JSON.stringify(updated));
  return updated;
}

export function clearAllImportacoesHistory(): ImportacaoRegistro[] {
  safeSetItem(STORAGE_KEYS.IMPORTACOES, JSON.stringify([]));
  return [];
}

// Load Active User Role
export function loadActiveUserRole(): UserRole {
  return (localStorage.getItem(STORAGE_KEYS.USER_ROLE) as UserRole) || 'conferente';
}

export function saveActiveUserRole(role: UserRole): void {
  safeSetItem(STORAGE_KEYS.USER_ROLE, role);
}

// Get Last Update string
export function getLastUpdateFormatted(): string {
  const iso = localStorage.getItem(STORAGE_KEYS.LAST_UPDATE);
  if (!iso) return 'Hoje, ' + new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const date = new Date(iso);
  return date.toLocaleDateString('pt-BR') + ' às ' + date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

export interface ImportResult {
  success: boolean;
  message: string;
  newLotesCount: number;
  newLotes?: SapLoteItem[];
}

/**
 * Excel SAP File Reader
 * Parses XLSX / XLS files, extracts rows, matches SAP column headers, filters zero-stock, and updates dataset.
 */
export async function parseAndImportSapExcel(
  file: File,
  usuarioName: string
): Promise<ImportResult> {
  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });

        if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
          resolve({ success: false, message: 'Nenhuma planilha encontrada no arquivo Excel.', newLotesCount: 0 });
          return;
        }

        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        // Convert sheet to JSON rows
        const rawRows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        if (rawRows.length === 0) {
          resolve({ success: false, message: 'A planilha selecionada está vazia.', newLotesCount: 0 });
          return;
        }

        // Helper to match column headers flexibly and accurately
        const findVal = (
          row: Record<string, unknown>,
          keywords: string[],
          excludeSubstrings: string[] = []
        ): unknown => {
          const keys = Object.keys(row);

          // Pass 1: Try exact normalized match (e.g. "descmaterial" === "descmaterial")
          for (const key of keys) {
            const normalizedKey = key.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
            if (excludeSubstrings.some((ex) => normalizedKey.includes(ex.toLowerCase().replace(/[^a-z0-9]/g, '')))) {
              continue;
            }
            for (const kw of keywords) {
              const normalizedKw = kw.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
              if (normalizedKey === normalizedKw) {
                return row[key];
              }
            }
          }

          // Pass 2: Try substring match (e.g. normalizedKey.includes(normalizedKw))
          for (const key of keys) {
            const normalizedKey = key.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
            if (excludeSubstrings.some((ex) => normalizedKey.includes(ex.toLowerCase().replace(/[^a-z0-9]/g, '')))) {
              continue;
            }
            for (const kw of keywords) {
              const normalizedKw = kw.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
              if (normalizedKw.length > 2 && normalizedKey.includes(normalizedKw)) {
                return row[key];
              }
            }
          }

          return '';
        };

        const importedLotes: SapLoteItem[] = [];
        let totalLinesRead = rawRows.length;

        rawRows.forEach((row, index) => {
          const materialCode = String(
            findVal(
              row,
              ['n material', 'material', 'cod material', 'codigo material', 'cód material', 'matnr', 'sku', 'item', 'produto', 'codmat'],
              ['desc', 'tipo', 'grp', 'grupo', 'centro', 'lote']
            ) || ''
          ).trim();

          const materialDesc = String(
            findVal(
              row,
              ['desc material', 'descricao material', 'descrição material', 'texto breve material', 'texto breve', 'desc. material', 'texto material', 'denominacao material', 'denominação material', 'nome do material', 'nome material'],
              ['tipo', 'grp', 'grupo', 'centro', 'deposito', 'avaliacao', 'fornecedor']
            ) || ''
          ).trim();

          const loteSAP = String(
            findVal(
              row,
              ['n lote', 'lote sap', 'numero lote', 'charg', 'batch', 'nº lote', 'no. lote', 'n° lote', 'lote/charg', 'lote'],
              ['fornecedor', 'forn', 'data', 'dt', 'date', 'vencimento', 'fabricacao', 'criacao', 'referencia', 'valida', 'sled', 'faixa']
            ) || ''
          ).trim();

          // Skip empty rows without material code or lot number
          if (!materialCode && !materialDesc && !loteSAP) {
            return;
          }

          const centro = String(findVal(row, ['centro', 'werks', 'plant', 'fabrica', 'fábrica', 'filial', 'unidade'], ['desc', 'nome', 'denom']) || '').trim();
          const centroDesc = String(findVal(row, ['desc centro', 'descricao centro', 'descrição centro', 'nome centro', 'nome fábrica']) || '').trim();
          
          let deposito = String(
            findVal(row, [
              'deposito',
              'depst',
              'lgort',
              'deposito/posicao',
              'depósito/posição',
              'depósito',
              'dep.',
              'depo',
              'almacen',
              'armazem',
              'armazém',
              'almoxarifado',
              'dep.ent.',
              'dep. ent.',
              'dep.ent',
              'dep. orig.',
              'dep. destino',
              'dep.destino',
              'dep.origem',
              'dep.orig',
              'local',
              'localizacao',
              'localização',
              'dep/pos',
              'dep-pos',
            ], ['posicao']) || ''
          ).trim();

          let posicaoDeposito = String(
            findVal(row, ['posicao deposito', 'posição depósito', 'posicao', 'posição', 'deposito posicao', 'pos. deposito', 'pos.deposito', 'pos', 'endereco', 'endereço', 'rua', 'bin', 'loc']) || ''
          ).trim();

          if (!deposito && posicaoDeposito) {
            deposito = posicaoDeposito;
          }
          if (!posicaoDeposito && deposito) {
            posicaoDeposito = deposito.includes(' ') ? deposito.split(' ').pop() || '' : '';
          }
          const loteFornecedor = String(findVal(row, ['n lote fornecedor', 'lote fornecedor', 'lote forn', 'forneclote']) || loteSAP || '').trim();
          
          const tipoMaterial = String(findVal(row, ['tipo material', 'tipo mat', 'mtart'], ['desc']) || '').trim();
          const tipoMaterialDesc = String(findVal(row, ['desc tipo material', 'desc tipo mat', 'descrição tipo material', 'descrição do tipo de material', 'desc. tipo mat.'], ['grupo', 'mercadoria']) || '').trim();
          const grupoMercadoria = String(findVal(row, ['grupo mercadorias', 'grupo mercadoria', 'grp merc', 'matkl'], ['desc']) || '').trim();
          const grupoMercadoriaDesc = String(findVal(row, ['desc grupo mercadorias', 'desc grupo mercadoria', 'descrição grupo mercadoria', 'desc. grupo mercadorias'], ['tipo']) || '').trim();
          const unidadeMedida = String(findVal(row, ['unidade medida', 'unidade', 'un. medida', 'umb', 'un', 'u.m.', 'um', 'meins']) || 'UN').trim().toUpperCase();
          const tipoAvaliacao = String(findVal(row, ['tipo avaliacao', 'tipo aval', 'tipo avaliação']) || '').trim();
          const fornecedor = String(findVal(row, ['fornecedor', 'fabricante', 'nome fornecedor', 'vendor', 'lifnr']) || '').trim();

          const dataCriacaoLote = parseSapDate(findVal(row, ['data criacao lote', 'data criacao']));
          const dataFabricacao = parseSapDate(findVal(row, ['data fabricacao', 'data fabricação', 'data fab', 'fabricacao', 'fabricação', 'dt. fabricacao', 'dt. fabricação', 'data de fabricação', 'dt. fabr', 'dt.fabr', 'hsdat']));
          const dataReferencia = parseSapDate(findVal(row, ['data referencia', 'data ref']));
          const dataVencimento = parseSapDate(findVal(row, ['data vencimento (sled)', 'data vencimento', 'sled', 'vencimento', 'validade', 'data de vencimento', 'dt. vencimento', 'dt.vencimento', 'dt. venc', 'dt.venc', 'data validade', 'dt validade', 'bbd', 'vfdat', 'data de validade']));
          const faixaEtaria = String(findVal(row, ['faixa etaria', 'faixa']) || 'NORMAL').trim();

          const estoqueLivre = parseSapNumber(findVal(row, ['estoque utiliz. livre', 'estoque utiliz livre', 'estoque livre', 'livre', 'utilizacao livre', 'utilização livre', 'qtd livre', 'qtd. livre', 'quantidade', 'qtd', 'estoque', 'saldo', 'disponivel', 'disponível', 'labst', 'qtd. em estoque', 'quantidade livre']));
          const estoqueControleQualidade = parseSapNumber(findVal(row, ['estoque contr. qualidade', 'estoque cq', 'controle qualidade']));
          const estoqueBloqueado = parseSapNumber(findVal(row, ['estoque bloqueado', 'bloqueado']));
          const estoqueTotal = parseSapNumber(findVal(row, ['estoque total', 'estoque']));

          const idadeDias = parseSapNumber(findVal(row, ['idade', 'idade dias'])) || 0;
          const vidaUtilTotalDias = parseSapNumber(findVal(row, ['vida util total', 'vida util'])) || 365;

          // MANDATORY RULE: Consider only Estoque Utiliz. Livre > 0
          if (estoqueLivre <= 0) {
            return;
          }

          const loteItem: SapLoteItem = {
            id: `IMP-${Date.now()}-${index}-${Math.random().toString(36).substring(2, 6)}`,
            materialCode: materialCode || `MAT-${index}`,
            materialDesc: materialDesc || materialCode,
            centro,
            centroDesc,
            deposito,
            posicaoDeposito,
            loteSAP: loteSAP || `LOTE-${index}`,
            loteFornecedor,
            tipoMaterial,
            tipoMaterialDesc,
            grupoMercadoria,
            grupoMercadoriaDesc,
            unidadeMedida: unidadeMedida || 'UN',
            tipoAvaliacao,
            fornecedor,
            dataCriacaoLote,
            dataFabricacao,
            dataReferencia,
            dataVencimento,
            faixaEtaria,
            estoqueLivre,
            estoqueControleQualidade,
            estoqueBloqueado,
            estoqueTotal: estoqueTotal || estoqueLivre,
            idadeDias,
            vidaUtilTotalDias,
            prioridadeFEFO: 0,
            diasParaVencer: 0,
            statusFEFO: 'fefo_1',
            isCritical: false,
          };

          importedLotes.push(sanitizeLoteItem(loteItem));
        });

        if (importedLotes.length === 0) {
          resolve({
            success: false,
            message: 'Nenhum lote válido com Estoque Utilizável Livre > 0 foi encontrado no arquivo.',
            newLotesCount: 0,
          });
          return;
        }

        // Recalculate FEFO
        const recalced = recalculateFEFO(importedLotes);
        saveLotes(recalced);

        const totalEstoqueSum = recalced.reduce((acc, curr) => acc + curr.estoqueLivre, 0);

        // Save import log
        saveImportacaoRegistro({
          id: `IMP-${Date.now()}`,
          dataHora: new Date().toISOString(),
          nomeArquivo: file.name,
          totalLinhasLidas: totalLinesRead,
          totalLotesImportados: recalced.length,
          totalEstoqueLivreSum: totalEstoqueSum,
          usuario: usuarioName,
          status: 'sucesso',
          mensagem: `${recalced.length} lotes importados com sucesso de ${totalLinesRead} linhas lidas. FEFO recalculado automaticamente.`,
          lotesImportados: recalced,
        });

        resolve({
          success: true,
          message: `${recalced.length} lotes importados e inteligência FEFO recalculada com sucesso!`,
          newLotesCount: recalced.length,
          newLotes: recalced,
        });
      } catch (err) {
        console.error('Error parsing Excel', err);
        resolve({
          success: false,
          message: 'Erro ao processar arquivo Excel. Verifique se o formato é válido.',
          newLotesCount: 0,
        });
      }
    };

    reader.onerror = () => {
      resolve({ success: false, message: 'Falha ao ler o arquivo no navegador.', newLotesCount: 0 });
    };

    reader.readAsArrayBuffer(file);
  });
}

/**
 * Text / Copy-Paste SAP Reader
 * Parses pasted text (tab-separated, pipe-separated, semicolon, or CSV) directly from SAP (MB52, LX02, MMBE) or Excel.
 */
export function parseAndImportSapText(
  pastedText: string,
  usuarioName: string
): ImportResult {
  if (!pastedText || !pastedText.trim()) {
    return { success: false, message: 'O texto colado está vazio.', newLotesCount: 0 };
  }

  const rawLines = pastedText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith('---') && !l.startsWith('==='));

  if (rawLines.length === 0) {
    return { success: false, message: 'Nenhuma linha válida encontrada no texto.', newLotesCount: 0 };
  }

  // Detect delimiter (tab \t, pipe |, semicolon ;, comma ,)
  const sampleLine = rawLines[0];
  let delimiter = '\t';
  if (sampleLine.includes('\t')) delimiter = '\t';
  else if (sampleLine.includes('|')) delimiter = '|';
  else if (sampleLine.includes(';')) delimiter = ';';
  else if (sampleLine.includes(',')) delimiter = ',';

  // Helper to tokenize a line clean of quotes and leading/trailing pipe artifacts
  const tokenizeLine = (l: string) => {
    let tokens = l.split(delimiter).map((c) => c.trim().replace(/^["']|["']$/g, ''));
    if (delimiter === '|' && tokens.length > 1) {
      if (tokens[0] === '') tokens.shift();
      if (tokens[tokens.length - 1] === '') tokens.pop();
    }
    return tokens;
  };

  const firstRowCols = tokenizeLine(sampleLine);

  const isHeaderRow = (cols: string[]) => {
    const joined = cols.join(' ').toLowerCase();
    return (
      joined.includes('material') ||
      joined.includes('lote') ||
      joined.includes('depost') ||
      joined.includes('deposito') ||
      joined.includes('vencimento') ||
      joined.includes('sled') ||
      joined.includes('livre') ||
      joined.includes('utiliz') ||
      joined.includes('desc') ||
      joined.includes('quantidade') ||
      joined.includes('validade') ||
      joined.includes('estoque') ||
      joined.includes('cod') ||
      joined.includes('cód') ||
      joined.includes('unidade')
    );
  };

  let headerIndices: Record<string, number> = {};
  let startIndex = 0;

  if (isHeaderRow(firstRowCols)) {
    startIndex = 1;
    firstRowCols.forEach((colName, idx) => {
      const lower = colName.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (
        lower.includes('desccentro') ||
        lower.includes('descdocentro') ||
        lower.includes('denomdocentro') ||
        lower.includes('nomecentro') ||
        (lower.includes('desc') && lower.includes('centro')) ||
        (lower.includes('denom') && lower.includes('centro'))
      ) {
        headerIndices['centroDesc'] = idx;
      } else if (
        lower.includes('desctipomaterial') ||
        lower.includes('desctipomat') ||
        lower.includes('descricaotipomaterial') ||
        (lower.includes('desc') && lower.includes('tipo'))
      ) {
        headerIndices['tipoMaterialDesc'] = idx;
      } else if (
        lower.includes('descgrupomercadorias') ||
        lower.includes('descgrp') ||
        (lower.includes('desc') && lower.includes('grp'))
      ) {
        headerIndices['grupoMercadoriaDesc'] = idx;
      } else if (
        (lower.includes('descmaterial') ||
        lower.includes('descdomaterial') ||
        lower.includes('textobreve') ||
        lower.includes('textomaterial') ||
        (lower.includes('desc') && lower.includes('material')) ||
        (lower.includes('denom') && lower.includes('material'))) &&
        !lower.includes('tipo') &&
        !lower.includes('grp') &&
        !lower.includes('grupo')
      ) {
        headerIndices['materialDesc'] = idx;
      } else if (lower.includes('tipoavaliacao') || lower.includes('tipoaval') || lower.includes('avaliacao')) {
        headerIndices['tipoAvaliacao'] = idx;
      } else if (lower.includes('vencimento') || lower.includes('sled') || lower.includes('validad') || lower.includes('vfdat') || lower.includes('venc')) {
        headerIndices['dataVencimento'] = idx;
      } else if (lower.includes('fabricacao') || lower.includes('fab') || lower.includes('hsdat') || lower.includes('fabric')) {
        headerIndices['dataFabricacao'] = idx;
      } else if (lower.includes('datacriacaolote') || lower.includes('datacriacao') || lower.includes('dtcriacao') || lower.includes('criacaolote') || lower.includes('criacao')) {
        headerIndices['dataCriacaoLote'] = idx;
      } else if (lower.includes('datareferencia') || lower.includes('dataref') || lower.includes('dtref') || lower.includes('referencia')) {
        headerIndices['dataReferencia'] = idx;
      } else if (lower.includes('faixaetaria') || lower.includes('faixa') || lower.includes('etaria')) {
        headerIndices['faixaEtaria'] = idx;
      } else if (lower.includes('posicaodeposito') || lower.includes('posicaodep') || lower.includes('posicao')) {
        headerIndices['posicaoDeposito'] = idx;
      } else if (
        (lower.includes('loteforn') || lower.includes('forneclote') || lower.includes('lotefornecedor') || lower.includes('nlotefornecedor')) &&
        !lower.includes('data') &&
        !lower.includes('dt') &&
        !lower.includes('date')
      ) {
        headerIndices['loteFornecedor'] = idx;
      } else if (
        (lower.includes('lote') || lower.includes('charg') || lower.includes('batch') || lower.includes('nolote') || lower.includes('nlote')) &&
        !lower.includes('forn') &&
        !lower.includes('data') &&
        !lower.includes('dt') &&
        !lower.includes('date') &&
        !lower.includes('venc') &&
        !lower.includes('fab') &&
        !lower.includes('criacao') &&
        !lower.includes('ref') &&
        !lower.includes('valida') &&
        !lower.includes('sled')
      ) {
        headerIndices['loteSAP'] = idx;
      } else if (
        (lower.includes('deposito') ||
          lower.includes('depó') ||
          lower.includes('depst') ||
          lower.includes('lgort') ||
          lower.includes('armazem') ||
          lower.includes('almoxarifado') ||
          lower === 'dep' ||
          lower === 'depo' ||
          lower.startsWith('dep.')) &&
        !lower.includes('desc') &&
        !lower.includes('nome') &&
        !lower.includes('posicao')
      ) {
        headerIndices['deposito'] = idx;
      } else if (lower === 'centro' || lower === 'werks' || lower === 'plant' || (lower.includes('centro') && !lower.includes('desc') && !lower.includes('denom') && !lower.includes('nome'))) {
        headerIndices['centro'] = idx;
      } else if (
        lower.includes('livre') ||
        lower.includes('estoquelivre') ||
        lower.includes('utiliz') ||
        lower.includes('labst') ||
        lower.includes('quantidade') ||
        lower.includes('estoquetotal') ||
        lower === 'estoque'
      ) {
        headerIndices['estoqueLivre'] = idx;
      } else if (lower.includes('vencimento') || lower.includes('sled') || lower.includes('validad') || lower.includes('vfdat') || lower.includes('venc')) {
        headerIndices['dataVencimento'] = idx;
      } else if (lower.includes('fabricacao') || lower.includes('fab') || lower.includes('hsdat') || lower.includes('fabric')) {
        headerIndices['dataFabricacao'] = idx;
      } else if (lower.includes('unidade') || lower.includes('umb') || lower.includes('medida') || lower.includes('meins') || lower === 'um') {
        headerIndices['unidadeMedida'] = idx;
      } else if (lower.includes('fornecedor') || lower.includes('fabricante') || lower.includes('vendor')) {
        headerIndices['fornecedor'] = idx;
      } else if (
        (lower.includes('material') || lower.includes('matnr') || lower.includes('codmat') || lower.includes('sku') || lower.includes('produto')) &&
        !lower.includes('desc') &&
        !lower.includes('tipo') &&
        !lower.includes('grp')
      ) {
        headerIndices['materialCode'] = idx;
      }
    });
  }

  const importedLotes: SapLoteItem[] = [];

  for (let i = startIndex; i < rawLines.length; i++) {
    const line = rawLines[i];
    const cols = tokenizeLine(line);

    if (cols.length < 2) continue; // Skip garbage lines

    let materialCode = '';
    let materialDesc = '';
    let loteSAP = '';
    let deposito = '';
    let centro = '';
    let centroDesc = '';
    let rawVenc = '';
    let rawFab = '';
    let rawCriacao = '';
    let rawRef = '';
    let loteFornecedor = '';
    let fornecedor = '';
    let unidadeMedida = '';
    let tipoAvaliacao = '';
    let faixaEtaria = '';
    let posicaoDeposito = '';
    let estoqueLivre = 0;

    const hasHeaderMapping = Object.keys(headerIndices).length > 2;

    if (hasHeaderMapping) {
      if (headerIndices['materialCode'] !== undefined) materialCode = cols[headerIndices['materialCode']] || '';
      if (headerIndices['materialDesc'] !== undefined) materialDesc = cols[headerIndices['materialDesc']] || '';
      if (headerIndices['loteSAP'] !== undefined) loteSAP = cols[headerIndices['loteSAP']] || '';
      if (headerIndices['deposito'] !== undefined) deposito = cols[headerIndices['deposito']] || '';
      if (headerIndices['centro'] !== undefined) centro = cols[headerIndices['centro']] || '';
      if (headerIndices['centroDesc'] !== undefined) centroDesc = cols[headerIndices['centroDesc']] || '';
      if (headerIndices['dataVencimento'] !== undefined) rawVenc = cols[headerIndices['dataVencimento']] || '';
      if (headerIndices['dataFabricacao'] !== undefined) rawFab = cols[headerIndices['dataFabricacao']] || '';
      if (headerIndices['dataCriacaoLote'] !== undefined) rawCriacao = cols[headerIndices['dataCriacaoLote']] || '';
      if (headerIndices['dataReferencia'] !== undefined) rawRef = cols[headerIndices['dataReferencia']] || '';
      if (headerIndices['loteFornecedor'] !== undefined) loteFornecedor = cols[headerIndices['loteFornecedor']] || '';
      if (headerIndices['fornecedor'] !== undefined) fornecedor = cols[headerIndices['fornecedor']] || '';
      if (headerIndices['unidadeMedida'] !== undefined) unidadeMedida = cols[headerIndices['unidadeMedida']] || '';
      if (headerIndices['tipoAvaliacao'] !== undefined) tipoAvaliacao = cols[headerIndices['tipoAvaliacao']] || '';
      if (headerIndices['faixaEtaria'] !== undefined) faixaEtaria = cols[headerIndices['faixaEtaria']] || '';
      if (headerIndices['posicaoDeposito'] !== undefined) posicaoDeposito = cols[headerIndices['posicaoDeposito']] || '';
      if (headerIndices['estoqueLivre'] !== undefined) estoqueLivre = parseSapNumber(cols[headerIndices['estoqueLivre']]);
    }

    // Direct positional mapping by column count if header mapping is not complete
    if (!materialCode || !loteSAP || (!centro && cols.length >= 10)) {
      if (cols.length === 14) {
        // User's exact 14-column format:
        // [0] Nº Material, [1] Centro, [2] Depósito, [3] Nº Lote, [4] Desc. Centro, [5] Desc. Material,
        // [6] Unidade Medida, [7] Tipo Avaliação, [8] Nº Lote Fornecedor, [9] Data Criação Lote,
        // [10] Data Fabricação, [11] Data Referencia, [12] Data Vencimento (Sled), [13] Faixa Etária
        if (!materialCode) materialCode = cols[0];
        if (!centro) centro = cols[1];
        if (!deposito) deposito = cols[2];
        if (!loteSAP) loteSAP = cols[3];
        if (!centroDesc) centroDesc = cols[4];
        if (!materialDesc) materialDesc = cols[5];
        if (!unidadeMedida) unidadeMedida = cols[6];
        if (!tipoAvaliacao) tipoAvaliacao = cols[7];
        if (!loteFornecedor) loteFornecedor = cols[8];
        if (!rawCriacao) rawCriacao = cols[9];
        if (!rawFab) rawFab = cols[10];
        if (!rawRef) rawRef = cols[11];
        if (!rawVenc) rawVenc = cols[12];
        if (!faixaEtaria) faixaEtaria = cols[13];
        if (estoqueLivre <= 0) estoqueLivre = 1;
      } else if (cols.length >= 20) {
        // 26-column full SAP export format:
        // [0] Nº Material, [1] Centro, [2] Depósito, [3] Posição Depósito, [4] Nº Lote, [5] Desc. Centro, [6] Desc. Material,
        // [7] Tipo Material, [8] Desc. Tipo Material, [9] Grupo Mercadorias, [10] Desc. Grupo Mercadorias,
        // [11] Unidade Medida, [12] Tipo Avaliação, [13] Nº Lote Fornecedor, [14] Data Criação Lote,
        // [15] Data Fabricação, [16] Data Referencia, [17] Data Vencimento (Sled), [18] Faixa Etária, [19] Estoque Utiliz. Livre
        if (!materialCode) materialCode = cols[0];
        if (!centro) centro = cols[1];
        if (!deposito) deposito = cols[2];
        if (!posicaoDeposito) posicaoDeposito = cols[3];
        if (!loteSAP) loteSAP = cols[4];
        if (!centroDesc) centroDesc = cols[5];
        if (!materialDesc) materialDesc = cols[6];
        if (!unidadeMedida) unidadeMedida = cols[11];
        if (!tipoAvaliacao) tipoAvaliacao = cols[12];
        if (!loteFornecedor) loteFornecedor = cols[13];
        if (!rawCriacao) rawCriacao = cols[14];
        if (!rawFab) rawFab = cols[15];
        if (!rawRef) rawRef = cols[16];
        if (!rawVenc) rawVenc = cols[17];
        if (!faixaEtaria) faixaEtaria = cols[18];
        if (estoqueLivre <= 0) {
          const numLivre = parseSapNumber(cols[19]);
          const numBloq = parseSapNumber(cols[21]);
          const numTotal = parseSapNumber(cols[22]);
          estoqueLivre = numLivre > 0 ? numLivre : (numTotal > 0 ? numTotal : (numBloq > 0 ? numBloq : 1));
        }
      }
    }

    // Additional smart fallbacks for remaining missing fields
    if (!materialCode) {
      const codeCandidate = cols.find((c) => /^\d{5,12}$/.test(c));
      materialCode = codeCandidate || cols[0] || `MAT-${i}`;
    }

    if (!materialDesc) {
      const descCandidate = cols.find((c) => c !== materialCode && c.length > 3 && /[a-zA-Z]/.test(c) && !c.includes('/') && !c.includes('-'));
      materialDesc = descCandidate || materialCode;
    }

    if (!loteSAP || isDatePattern(loteSAP)) {
      const loteCandidate = cols.find(
        (c) =>
          c !== materialCode &&
          !isDatePattern(c) &&
          !c.includes('/') &&
          !c.includes('-') &&
          (/^\d{6,14}$/.test(c) || /^[A-Z0-9]{5,14}$/.test(c))
      );
      loteSAP = loteCandidate || `LOTE-${i}`;
    }

    if (estoqueLivre <= 0) {
      for (const c of cols) {
        if (c === materialCode || c === loteSAP) continue;
        const num = parseSapNumber(c);
        if (num > 0 && !c.includes('/') && !c.includes('-')) {
          estoqueLivre = num;
          break;
        }
      }
      if (estoqueLivre <= 0) {
        estoqueLivre = 1;
      }
    }

    if (!rawVenc) {
      const dateCandidate = cols.find((c) => /^\d{1,2}[\/\.-]\d{1,2}[\/\.-]\d{2,4}$/.test(c) || /^\d{8}$/.test(c));
      rawVenc = dateCandidate || '';
    }

    const dataVencimento = parseSapDate(rawVenc);
    const dataFabricacao = rawFab ? parseSapDate(rawFab) : dataVencimento;
    const dataCriacaoLote = rawCriacao ? parseSapDate(rawCriacao) : dataFabricacao;
    const dataReferencia = rawRef ? parseSapDate(rawRef) : dataFabricacao;

    if (!loteFornecedor) loteFornecedor = loteSAP;
    if (!unidadeMedida) unidadeMedida = 'UN';
    if (!faixaEtaria) faixaEtaria = 'NORMAL';

    if (!posicaoDeposito && deposito && deposito.includes(' ')) {
      posicaoDeposito = deposito.split(' ').pop() || '';
    }

    const loteItem: SapLoteItem = {
      id: `TXT-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 6)}`,
      materialCode: materialCode || `MAT-${i}`,
      materialDesc: materialDesc || materialCode,
      centro: centro,
      centroDesc: centroDesc || (centro ? `CENTRO ${centro}` : ''),
      deposito: deposito,
      posicaoDeposito,
      loteSAP: loteSAP || `LOTE-${i}`,
      loteFornecedor,
      tipoMaterial: '',
      tipoMaterialDesc: '',
      grupoMercadoria: '',
      grupoMercadoriaDesc: '',
      unidadeMedida: unidadeMedida.toUpperCase(),
      tipoAvaliacao,
      fornecedor: fornecedor,
      dataCriacaoLote,
      dataFabricacao,
      dataReferencia,
      dataVencimento,
      faixaEtaria,
      estoqueLivre,
      estoqueControleQualidade: 0,
      estoqueBloqueado: 0,
      estoqueTotal: estoqueLivre,
      idadeDias: 0,
      vidaUtilTotalDias: 365,
      prioridadeFEFO: 0,
      diasParaVencer: 0,
      statusFEFO: 'fefo_1',
      isCritical: false,
    };

    importedLotes.push(sanitizeLoteItem(loteItem));
  }

  if (importedLotes.length === 0) {
    return {
      success: false,
      message: 'Nenhum lote válido com Estoque Livre > 0 foi extraído do texto colado. Verifique as colunas.',
      newLotesCount: 0,
    };
  }

  const recalced = recalculateFEFO(importedLotes);
  saveLotes(recalced);

  const totalEstoqueSum = recalced.reduce((acc, curr) => acc + curr.estoqueLivre, 0);

  saveImportacaoRegistro({
    id: `IMP-TEXT-${Date.now()}`,
    dataHora: new Date().toISOString(),
    nomeArquivo: 'Relatorio_SAP_Colado.txt',
    totalLinhasLidas: rawLines.length,
    totalLotesImportados: recalced.length,
    totalEstoqueLivreSum: totalEstoqueSum,
    usuario: usuarioName,
    status: 'sucesso',
    mensagem: `${recalced.length} lotes reais do SAP importados com sucesso. FEFO recalculado!`,
    lotesImportados: recalced,
    rawText: pastedText,
  });

  return {
    success: true,
    message: `${recalced.length} lotes importados do relatório SAP com sucesso! Ordem FEFO calculada.`,
    newLotesCount: recalced.length,
    newLotes: recalced,
  };
}

// Reset dataset to empty
export function resetToDemoData(): SapLoteItem[] {
  saveLotes([]);
  return [];
}
