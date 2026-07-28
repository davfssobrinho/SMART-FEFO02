import * as XLSX from 'xlsx';
import { SapLoteItem, AtendimentoHistorico, ImportacaoRegistro, UserRole, ConferenteUser, StatusControle } from '../types';
import { getInitialMockLotes } from '../data/mockSapData';
import { recalculateFEFO, parseSapDate, parseSapNumber } from './fefoEngine';

const STORAGE_KEYS = {
  LOTES: 'smart_fefo_lotes_v2',
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

// Load Lotes from Storage
export function loadLotes(): SapLoteItem[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.LOTES);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const updated = parsed.map((l: SapLoteItem) => {
          let dep = l.deposito || 'TINT MR01 A062';
          if (dep === 'DEP01') dep = 'TINT MR01 A062';
          return {
            ...l,
            centro: !l.centro || l.centro === 'UB01' ? 'BRV4' : l.centro,
            centroDesc: !l.centroDesc || l.centroDesc === 'AMBEV UNIDADE BRASILIA' ? 'FÁBRICA BRV4' : l.centroDesc,
            deposito: dep,
          };
        });
        return recalculateFEFO(updated);
      }
    }
  } catch (err) {
    console.error('Failed to load lotes from localStorage', err);
  }
  
  // Fallback to initial SAP demo dataset if empty or null
  const initialMock = getInitialMockLotes();
  saveLotes(initialMock);
  return initialMock;
}

// Save Lotes to Storage
export function saveLotes(lotes: SapLoteItem[]): void {
  try {
    const recalced = recalculateFEFO(lotes);
    safeSetItem(STORAGE_KEYS.LOTES, JSON.stringify(recalced));
    safeSetItem(STORAGE_KEYS.LAST_UPDATE, new Date().toISOString());
  } catch (err) {
    console.error('Failed to save lotes to localStorage', err);
  }
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

  const updated = [lightweightReg, ...current].slice(0, 15);
  safeSetItem(STORAGE_KEYS.IMPORTACOES, JSON.stringify(updated));
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

        // Helper to match column headers flexibly
        const findVal = (row: Record<string, unknown>, keywords: string[]): unknown => {
          for (const key of Object.keys(row)) {
            const normalizedKey = key.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
            for (const kw of keywords) {
              const normalizedKw = kw.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
              if (normalizedKey === normalizedKw || normalizedKey.includes(normalizedKw)) {
                return row[key];
              }
            }
          }
          return '';
        };

        const importedLotes: SapLoteItem[] = [];
        let totalLinesRead = rawRows.length;

        rawRows.forEach((row, index) => {
          const materialCode = String(findVal(row, ['n material', 'material', 'cod material', 'codigo material']) || '').trim();
          const materialDesc = String(findVal(row, ['desc material', 'descricao material', 'texto breve material']) || '').trim();
          const loteSAP = String(findVal(row, ['n lote', 'lote', 'lote sap', 'numero lote']) || '').trim();

          // Skip empty rows without material code or lot number
          if (!materialCode && !materialDesc && !loteSAP) {
            return;
          }

          const centro = String(findVal(row, ['centro', 'werks', 'plant', 'fabrica']) || 'BRV4').trim();
          const centroDesc = String(findVal(row, ['desc centro', 'descricao centro', 'nome centro']) || 'FÁBRICA BRV4').trim();
          
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
            ]) || ''
          ).trim();

          let posicaoDeposito = String(
            findVal(row, ['posicao deposito', 'posição depósito', 'posicao', 'posição', 'deposito posicao', 'pos. deposito', 'pos.deposito', 'pos', 'endereco', 'endereço']) || ''
          ).trim();

          if (!deposito || deposito === 'DEP01') {
            deposito = posicaoDeposito ? `TINT MR01 ${posicaoDeposito}` : 'TINT MR01 A062';
          }
          if (!posicaoDeposito) {
            posicaoDeposito = deposito.includes(' ') ? deposito.split(' ').pop() || 'A062' : 'A062';
          }
          const loteFornecedor = String(findVal(row, ['n lote fornecedor', 'lote fornecedor', 'lote forn']) || loteSAP || `FORN-${index}`).trim();
          
          const tipoMaterial = String(findVal(row, ['tipo material', 'tipo mat']) || 'ROH').trim();
          const tipoMaterialDesc = String(findVal(row, ['desc tipo material', 'desc tipo mat']) || 'Matéria Prima').trim();
          const grupoMercadoria = String(findVal(row, ['grupo mercadorias', 'grupo mercadoria', 'grp merc']) || 'GRP-01').trim();
          const grupoMercadoriaDesc = String(findVal(row, ['desc grupo mercadorias', 'desc grupo mercadoria']) || 'Insumos').trim();
          const unidadeMedida = String(findVal(row, ['unidade medida', 'unidade', 'un. medida', 'umb']) || 'UN').trim().toUpperCase();
          const tipoAvaliacao = String(findVal(row, ['tipo avaliacao', 'tipo aval']) || 'NACIONAL').trim();
          const fornecedor = String(findVal(row, ['fornecedor', 'fabricante', 'nome fornecedor']) || 'FORNECEDOR SAP').trim();

          const dataCriacaoLote = parseSapDate(findVal(row, ['data criacao lote', 'data criacao']));
          const dataFabricacao = parseSapDate(findVal(row, ['data fabricacao', 'data fab', 'fabricacao']));
          const dataReferencia = parseSapDate(findVal(row, ['data referencia', 'data ref']));
          const dataVencimento = parseSapDate(findVal(row, ['data vencimento (sled)', 'data vencimento', 'sled', 'vencimento']));
          const faixaEtaria = String(findVal(row, ['faixa etaria', 'faixa']) || 'NORMAL').trim();

          const estoqueLivre = parseSapNumber(findVal(row, ['estoque utiliz. livre', 'estoque utiliz livre', 'estoque livre', 'livre']));
          const estoqueControleQualidade = parseSapNumber(findVal(row, ['estoque contr. qualidade', 'estoque cq', 'controle qualidade']));
          const estoqueBloqueado = parseSapNumber(findVal(row, ['estoque bloqueado', 'bloqueado']));
          const estoqueTotal = parseSapNumber(findVal(row, ['estoque total', 'estoque']));

          const idadeDias = parseSapNumber(findVal(row, ['idade', 'idade dias'])) || 30;
          const vidaUtilTotalDias = parseSapNumber(findVal(row, ['vida util total', 'vida util'])) || 365;

          // MANDATORY RULE: Consider only Estoque Utiliz. Livre > 0
          if (estoqueLivre <= 0) {
            return;
          }

          const loteItem: SapLoteItem = {
            id: `IMP-${Date.now()}-${index}-${Math.random().toString(36).substring(2, 6)}`,
            materialCode: materialCode || `MAT-${index}`,
            materialDesc: materialDesc || `MATERIAL SAP ${materialCode}`,
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
            unidadeMedida,
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

          importedLotes.push(loteItem);
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
 * Parses pasted text (tab-separated, pipe-separated, semicolon, or CSV) directly from SAP or Excel.
 */
export function parseAndImportSapText(
  pastedText: string,
  usuarioName: string
): ImportResult {
  if (!pastedText || !pastedText.trim()) {
    return { success: false, message: 'O texto colado está vazio.', newLotesCount: 0 };
  }

  const rawLines = pastedText.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
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

  // Check if first line is header
  const firstRowCols = sampleLine.split(delimiter).map((c) => c.trim().replace(/^["']|["']$/g, ''));
  
  const isHeaderRow = (cols: string[]) => {
    const joined = cols.join(' ').toLowerCase();
    return (
      joined.includes('material') ||
      joined.includes('lote') ||
      joined.includes('deposito') ||
      joined.includes('vencimento') ||
      joined.includes('livre') ||
      joined.includes('desc')
    );
  };

  let headerIndices: Record<string, number> = {};
  let startIndex = 0;

  if (isHeaderRow(firstRowCols)) {
    startIndex = 1;
    firstRowCols.forEach((colName, idx) => {
      const lower = colName.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (lower.includes('material') && !lower.includes('desc') && !lower.includes('tipo')) headerIndices['materialCode'] = idx;
      else if (lower.includes('descmaterial') || lower.includes('descri') || lower.includes('textobreve') || lower.includes('desc')) headerIndices['materialDesc'] = idx;
      else if (lower.includes('lotesap') || (lower.includes('lote') && !lower.includes('forn'))) headerIndices['loteSAP'] = idx;
      else if (lower.includes('loteforn') || lower.includes('forneclote')) headerIndices['loteFornecedor'] = idx;
      else if (lower.includes('depst') || lower.includes('deposito') || lower.includes('dep') || lower.includes('lgort') || lower.includes('armazem') || lower.includes('almox')) headerIndices['deposito'] = idx;
      else if (lower.includes('centro') || lower.includes('werks') || lower.includes('plant') || lower.includes('fabrica')) headerIndices['centro'] = idx;
      else if (lower.includes('livre') || lower.includes('estoquelivre') || lower.includes('qtd') || lower.includes('utiliz') || lower.includes('labst')) headerIndices['estoqueLivre'] = idx;
      else if (lower.includes('vencimento') || lower.includes('sled') || lower.includes('validad') || lower.includes('vfdat')) headerIndices['dataVencimento'] = idx;
      else if (lower.includes('fabricacao') || lower.includes('fab') || lower.includes('hsdat')) headerIndices['dataFabricacao'] = idx;
      else if (lower.includes('fornecedor') || lower.includes('fabricante')) headerIndices['fornecedor'] = idx;
      else if (lower.includes('unidade') || lower.includes('umb') || lower.includes('medida') || lower.includes('un')) headerIndices['unidadeMedida'] = idx;
    });
  }

  const importedLotes: SapLoteItem[] = [];

  for (let i = startIndex; i < rawLines.length; i++) {
    const line = rawLines[i];
    const cols = line.split(delimiter).map((c) => c.trim().replace(/^["']|["']$/g, ''));

    if (cols.length < 2) continue; // Skip empty/garbage lines

    const materialCode = headerIndices['materialCode'] !== undefined ? cols[headerIndices['materialCode']] : cols[0] || '';
    const materialDesc = headerIndices['materialDesc'] !== undefined ? cols[headerIndices['materialDesc']] : cols[1] || '';
    const loteSAP = headerIndices['loteSAP'] !== undefined ? cols[headerIndices['loteSAP']] : cols[2] || '';
    let deposito = headerIndices['deposito'] !== undefined ? cols[headerIndices['deposito']] : cols[3] || '';
    const centro = headerIndices['centro'] !== undefined ? cols[headerIndices['centro']] : 'BRV4';
    
    if (!deposito || deposito === 'DEP01') {
      deposito = 'TINT MR01 A062';
    }
    
    let estoqueLivre = 0;
    if (headerIndices['estoqueLivre'] !== undefined && cols[headerIndices['estoqueLivre']]) {
      estoqueLivre = parseSapNumber(cols[headerIndices['estoqueLivre']]);
    } else {
      // Look for a column with numeric value
      for (const c of cols) {
        const num = parseSapNumber(c);
        if (num > 0) {
          estoqueLivre = num;
          break;
        }
      }
    }

    if (estoqueLivre <= 0) continue; // Only free stock > 0

    const rawVenc = headerIndices['dataVencimento'] !== undefined ? cols[headerIndices['dataVencimento']] : cols[4] || '';
    const dataVencimento = parseSapDate(rawVenc);
    const rawFab = headerIndices['dataFabricacao'] !== undefined ? cols[headerIndices['dataFabricacao']] : cols[5] || '';
    const dataFabricacao = parseSapDate(rawFab);
    const loteFornecedor = headerIndices['loteFornecedor'] !== undefined ? cols[headerIndices['loteFornecedor']] : loteSAP;
    const fornecedor = headerIndices['fornecedor'] !== undefined ? cols[headerIndices['fornecedor']] : 'FORNECEDOR SAP';
    const unidadeMedida = (headerIndices['unidadeMedida'] !== undefined ? cols[headerIndices['unidadeMedida']] : 'UN').toUpperCase() || 'UN';

    const loteItem: SapLoteItem = {
      id: `TXT-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 6)}`,
      materialCode: materialCode || `MAT-${i}`,
      materialDesc: materialDesc || `MATERIAL SAP ${materialCode}`,
      centro: centro || 'BRV4',
      centroDesc: 'FÁBRICA BRV4',
      deposito: deposito || 'DEP01',
      posicaoDeposito: 'A-01',
      loteSAP: loteSAP || `LOTE-${i}`,
      loteFornecedor,
      tipoMaterial: 'ROH',
      tipoMaterialDesc: 'Insumo / Matéria Prima',
      grupoMercadoria: 'GRP-01',
      grupoMercadoriaDesc: 'Insumos',
      unidadeMedida,
      tipoAvaliacao: 'NACIONAL',
      fornecedor,
      dataCriacaoLote: dataFabricacao,
      dataFabricacao,
      dataReferencia: dataFabricacao,
      dataVencimento,
      faixaEtaria: 'NORMAL',
      estoqueLivre,
      estoqueControleQualidade: 0,
      estoqueBloqueado: 0,
      estoqueTotal: estoqueLivre,
      idadeDias: 30,
      vidaUtilTotalDias: 365,
      prioridadeFEFO: 0,
      diasParaVencer: 0,
      statusFEFO: 'fefo_1',
      isCritical: false,
    };

    importedLotes.push(loteItem);
  }

  if (importedLotes.length === 0) {
    return {
      success: false,
      message: 'Nenhum lote válido com Estoque Livre > 0 foi extraído do texto colado.',
      newLotesCount: 0,
    };
  }

  const recalced = recalculateFEFO(importedLotes);
  saveLotes(recalced);

  const totalEstoqueSum = recalced.reduce((acc, curr) => acc + curr.estoqueLivre, 0);

  saveImportacaoRegistro({
    id: `IMP-TEXT-${Date.now()}`,
    dataHora: new Date().toISOString(),
    nomeArquivo: 'Copia_e_Cola_SAP.txt',
    totalLinhasLidas: rawLines.length,
    totalLotesImportados: recalced.length,
    totalEstoqueLivreSum: totalEstoqueSum,
    usuario: usuarioName,
    status: 'sucesso',
    mensagem: `${recalced.length} lotes importados com sucesso via Copiar e Colar. FEFO recalculado!`,
    lotesImportados: recalced,
    rawText: pastedText,
  });

  return {
    success: true,
    message: `${recalced.length} lotes colados e importados com sucesso! Inteligência FEFO recalculada.`,
    newLotesCount: recalced.length,
    newLotes: recalced,
  };
}

// Reset dataset to empty
export function resetToDemoData(): SapLoteItem[] {
  saveLotes([]);
  return [];
}
