import { SapLoteItem } from '../types';

/**
 * Calculates calendar day difference between target date and today
 */
export function calculateDaysToExpire(vencimentoDateStr: string): number {
  if (!vencimentoDateStr) return 0;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [year, month, day] = vencimentoDateStr.split('-').map(Number);
  if (!year || !month || !day) return 0;

  const targetDate = new Date(year, month - 1, day);
  targetDate.setHours(0, 0, 0, 0);

  const diffMs = targetDate.getTime() - today.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Converts various date formats (DD/MM/YYYY, DD.MM.YYYY, YYYY-MM-DD, YYYYMMDD, Excel serialized date) to YYYY-MM-DD
 */
export function parseSapDate(value: unknown): string {
  if (!value) return new Date().toISOString().split('T')[0];

  const str = String(value).trim();
  if (!str) return new Date().toISOString().split('T')[0];

  // If YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str;
  }

  // If YYYYMMDD (e.g., SAP raw format 20260815)
  if (/^\d{8}$/.test(str)) {
    const year = str.substring(0, 4);
    const month = str.substring(4, 6);
    const day = str.substring(6, 8);
    return `${year}-${month}-${day}`;
  }

  // If DD/MM/YYYY or DD.MM.YYYY or DD-MM-YYYY
  if (/^\d{1,2}[\/\.-]\d{1,2}[\/\.-]\d{4}$/.test(str)) {
    const parts = str.split(/[\/\.-]/);
    const day = parts[0].padStart(2, '0');
    const month = parts[1].padStart(2, '0');
    const year = parts[2];
    return `${year}-${month}-${day}`;
  }

  // If DD/MM/YY or DD.MM.YY (2-digit year)
  if (/^\d{1,2}[\/\.-]\d{1,2}[\/\.-]\d{2}$/.test(str)) {
    const parts = str.split(/[\/\.-]/);
    const day = parts[0].padStart(2, '0');
    const month = parts[1].padStart(2, '0');
    const year = Number(parts[2]) > 50 ? `19${parts[2]}` : `20${parts[2]}`;
    return `${year}-${month}-${day}`;
  }

  // If Excel numeric timestamp (e.g. 45200)
  if (typeof value === 'number' || (!isNaN(Number(value)) && !str.includes('-') && !str.includes('/') && !str.includes('.'))) {
    const num = Number(value);
    if (num > 30000 && num < 70000) {
      const excelEpoch = new Date(1899, 11, 30);
      const target = new Date(excelEpoch.getTime() + num * 86400000);
      const y = target.getFullYear();
      const m = String(target.getMonth() + 1).padStart(2, '0');
      const d = String(target.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
  }

  // Fallback try Date parse
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0];
  }

  return new Date().toISOString().split('T')[0];
}

/**
 * Parses numbers from SAP / Excel (e.g. "1.250,50", "1250,5", "1 250,50")
 */
export function parseSapNumber(value: unknown): number {
  if (value === null || value === undefined || value === '') return 0;
  if (typeof value === 'number') return isNaN(value) ? 0 : value;

  let str = String(value).trim();
  // Remove currency symbol and spaces
  str = str.replace(/[R$\s]/g, '');

  if (str.includes(',') && str.includes('.')) {
    // e.g. "1.250,50" -> 1250.50 or "1,250.50"
    if (str.lastIndexOf(',') > str.lastIndexOf('.')) {
      str = str.replace(/\./g, '').replace(',', '.');
    } else {
      str = str.replace(/,/g, '');
    }
  } else if (str.includes(',')) {
    // e.g. "1250,50"
    str = str.replace(',', '.');
  }

  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
}

/**
 * Recalculates FEFO Priorities and Status for all lotes in the dataset.
 * MANDATORY RULE: Never aggregate lotes! Each lote remains individual.
 */
export function recalculateFEFO(lotes: SapLoteItem[]): SapLoteItem[] {
  // Group lotes by materialCode
  const groupMap = new Map<string, SapLoteItem[]>();

  for (const item of lotes) {
    if (!groupMap.has(item.materialCode)) {
      groupMap.set(item.materialCode, []);
    }
    groupMap.get(item.materialCode)!.push({ ...item });
  }

  const processedLotes: SapLoteItem[] = [];

  groupMap.forEach((materialLotes) => {
    // Sort material lotes according to FEFO Rules:
    // 1. Data de Vencimento (SLED) - ascending
    // 2. Data de Fabricacao - ascending
    // 3. Numero do Lote SAP - ascending
    materialLotes.sort((a, b) => {
      // Primary: Expiration Date
      if (a.dataVencimento !== b.dataVencimento) {
        return a.dataVencimento.localeCompare(b.dataVencimento);
      }
      // Secondary: Manufacturing Date
      if (a.dataFabricacao !== b.dataFabricacao) {
        return a.dataFabricacao.localeCompare(b.dataFabricacao);
      }
      // Tertiary: SAP Batch Number
      return a.loteSAP.localeCompare(b.loteSAP);
    });

    // Assign FEFO Priorities within this material
    let priorityCounter = 1;

    materialLotes.forEach((lote) => {
      const diasParaVencer = calculateDaysToExpire(lote.dataVencimento);
      lote.diasParaVencer = diasParaVencer;

      // Assign priority for lotes with stock > 0
      if (lote.estoqueLivre > 0) {
        lote.prioridadeFEFO = priorityCounter;
        priorityCounter++;
      } else {
        lote.prioridadeFEFO = 999;
      }

      // Determine Status & Colors
      if (lote.estoqueLivre <= 0) {
        lote.statusFEFO = 'no_stock';
        lote.isCritical = false;
      } else if (diasParaVencer < 0) {
        lote.statusFEFO = 'expired';
        lote.isCritical = true;
      } else if (diasParaVencer <= 30) {
        lote.statusFEFO = 'critical_30';
        lote.isCritical = true;
      } else if (diasParaVencer <= 60) {
        lote.statusFEFO = 'warning_60';
        lote.isCritical = false;
      } else if (lote.prioridadeFEFO === 1) {
        lote.statusFEFO = 'fefo_1';
        lote.isCritical = false;
      } else {
        lote.statusFEFO = 'fefo_next';
        lote.isCritical = false;
      }

      processedLotes.push(lote);
    });
  });

  return processedLotes;
}

/**
 * Format dates to Brazilian display format DD/MM/YYYY
 */
export function formatDateBR(dateStr: string): string {
  if (!dateStr) return '-';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

/**
 * Format numbers with thousands separators and decimals
 */
export function formatNumberBR(val: number, decimals: number = 2): string {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(val);
}
