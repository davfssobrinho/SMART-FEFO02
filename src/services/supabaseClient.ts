import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { SapLoteItem, AtendimentoHistorico, ImportacaoRegistro, ConferenteUser } from '../types';
import { recalculateFEFO } from './fefoEngine';

const URL_KEY = 'smart_fefo_supabase_url';
const ANON_KEY = 'smart_fefo_supabase_key';

const DEFAULT_SUPABASE_URL = 'https://zibafmbgnsouauwnjors.supabase.co';
const DEFAULT_SUPABASE_KEY = 'sb_publishable_ept1VeS95X94I4PnYdjfeA_VnFhQ6QI';

let cachedClient: SupabaseClient | null = null;
let cachedUrl = '';
let cachedKey = '';

export function normalizeSupabaseUrl(url: string): string {
  if (!url) return DEFAULT_SUPABASE_URL;
  let clean = url.trim();
  // Strip /rest/v1 or /rest/v1/ suffix if present
  clean = clean.replace(/\/rest\/v1\/?$/i, '');
  // Strip trailing slashes
  clean = clean.replace(/\/+$/, '');
  return clean || DEFAULT_SUPABASE_URL;
}

export function getSupabaseCredentials(): { url: string; key: string } {
  const envUrl = typeof import.meta !== 'undefined' ? (import.meta as any).env?.VITE_SUPABASE_URL || '' : '';
  const envKey = typeof import.meta !== 'undefined' ? (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '' : '';
  const rawUrl = (localStorage.getItem(URL_KEY) || envUrl || DEFAULT_SUPABASE_URL).trim();
  const rawKey = (localStorage.getItem(ANON_KEY) || envKey || DEFAULT_SUPABASE_KEY).trim();
  const url = normalizeSupabaseUrl(rawUrl);
  const key = rawKey || DEFAULT_SUPABASE_KEY;
  return { url, key };
}

export function saveSupabaseCredentials(url: string, key: string): void {
  const cleanUrl = normalizeSupabaseUrl(url);
  const cleanKey = key.trim() || DEFAULT_SUPABASE_KEY;
  localStorage.setItem(URL_KEY, cleanUrl);
  localStorage.setItem(ANON_KEY, cleanKey);
  cachedClient = null; // reset client
}

export function getSupabaseClient(): SupabaseClient | null {
  const { url, key } = getSupabaseCredentials();
  if (!url || !key) return null;

  if (cachedClient && cachedUrl === url && cachedKey === key) {
    return cachedClient;
  }

  try {
    cachedClient = createClient(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
    cachedUrl = url;
    cachedKey = key;
    return cachedClient;
  } catch (err) {
    console.error('Error initializing Supabase client:', err);
    return null;
  }
}

// Supabase Auth Helper Methods
export async function signInWithSupabaseEmail(email: string, pass: string): Promise<{ success: boolean; user?: ConferenteUser; message?: string }> {
  const client = getSupabaseClient();
  if (!client) {
    return { success: false, message: 'Cliente Supabase não inicializado. Verifique a URL e a Chave API.' };
  }

  try {
    const { data, error } = await client.auth.signInWithPassword({
      email: email.trim(),
      password: pass.trim(),
    });

    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        return { success: false, message: 'Email ou senha incorretos. Verifique se a conta já foi criada ou se o provedor Email está ativo no Supabase.' };
      }
      if (error.message.includes('Email not confirmed')) {
        return { success: false, message: 'Email ainda não confirmado. Verifique a caixa de entrada ou desative "Confirm email" nas configurações do Supabase Auth.' };
      }
      return { success: false, message: `Erro no login: ${error.message}` };
    }

    if (!data.user) {
      return { success: false, message: 'Usuário não retornado pelo Supabase.' };
    }

    const sbUser = data.user;
    const displayName = sbUser.user_metadata?.full_name || sbUser.email?.split('@')[0] || 'Usuário Supabase';

    const conferenteUser: ConferenteUser = {
      id: `SB-${sbUser.id.substring(0, 8).toUpperCase()}`,
      nome: displayName,
      matricula: sbUser.email || 'SUPA-AUTH',
      turno: 'Geral / 24h',
      perfil: 'administrador',
      status: 'Ativo',
      areaProducao: 'Gestão de Estoque Supabase',
    };

    return { success: true, user: conferenteUser };
  } catch (err: any) {
    return { success: false, message: `Erro inesperado no Supabase Auth: ${err?.message || 'Falha de conexão'}` };
  }
}

export async function signUpWithSupabaseEmail(email: string, pass: string, name?: string): Promise<{ success: boolean; user?: ConferenteUser; message?: string; requireEmailConfirmation?: boolean }> {
  const client = getSupabaseClient();
  if (!client) {
    return { success: false, message: 'Cliente Supabase não inicializado. Verifique a URL e a Chave API.' };
  }

  try {
    const cleanEmail = email.trim();
    const cleanName = name?.trim() || cleanEmail.split('@')[0];

    const { data, error } = await client.auth.signUp({
      email: cleanEmail,
      password: pass.trim(),
      options: {
        data: {
          full_name: cleanName,
        },
      },
    });

    if (error) {
      return { success: false, message: `Erro ao cadastrar: ${error.message}` };
    }

    if (data.user) {
      const conferenteUser: ConferenteUser = {
        id: `SB-${data.user.id.substring(0, 8).toUpperCase()}`,
        nome: cleanName,
        matricula: cleanEmail,
        turno: 'Geral / 24h',
        perfil: 'administrador',
        status: 'Ativo',
        areaProducao: 'Gestão de Estoque Supabase',
      };

      // Check if session was auto-created or needs email confirmation
      if (data.session) {
        return { success: true, user: conferenteUser, message: 'Conta criada e autenticada com sucesso!' };
      } else {
        return {
          success: true,
          user: conferenteUser,
          requireEmailConfirmation: true,
          message: 'Cadastro realizado no Supabase! Se o envio de confirmação de email estiver ativo no Supabase, verifique sua caixa de entrada.',
        };
      }
    }

    return { success: false, message: 'Não foi possível registrar o usuário.' };
  } catch (err: any) {
    return { success: false, message: `Erro ao criar conta no Supabase: ${err?.message || 'Falha de conexão'}` };
  }
}

export async function signOutSupabase(): Promise<void> {
  const client = getSupabaseClient();
  if (client) {
    try {
      await client.auth.signOut();
    } catch (e) {
      console.warn('Error signing out Supabase:', e);
    }
  }
}

// Test Connection
export async function testSupabaseConnection(urlInput?: string, keyInput?: string): Promise<{ success: boolean; message: string }> {
  const url = normalizeSupabaseUrl(urlInput?.trim() || getSupabaseCredentials().url);
  const key = keyInput?.trim() || getSupabaseCredentials().key;

  if (!url || !key) {
    return { success: false, message: 'URL e Chave Anon (API Key) do Supabase são obrigatórias.' };
  }

  try {
    const client = createClient(url, key, { auth: { persistSession: false } });
    // Attempt a lightweight query to test connection
    const { data, error } = await client.from('lotes_sap').select('id').limit(1);

    if (error) {
      if (error.code === 'PGRST116' || error.message.includes('relation "public.lotes_sap" does not exist')) {
        return {
          success: true,
          message: 'Conectado com sucesso ao Supabase! (Nota: A tabela "lotes_sap" ainda não existe. Execute o SQL de Schema).',
        };
      }
      return { success: false, message: `Erro ao conectar: ${error.message}` };
    }

    return {
      success: true,
      message: `Conexão estabelecida com sucesso com o Supabase! (${data?.length ?? 0} registros encontrados)`,
    };
  } catch (err: any) {
    return { success: false, message: `Falha na conexão: ${err?.message || 'Erro desconhecido'}` };
  }
}

// Sync Local Data -> Supabase Cloud
export async function pushDataToSupabase(data: {
  lotes: SapLoteItem[];
  historico: AtendimentoHistorico[];
  importacoes: ImportacaoRegistro[];
  conferentes: ConferenteUser[];
}): Promise<{ success: boolean; message: string }> {
  const client = getSupabaseClient();
  if (!client) {
    return { success: false, message: 'Supabase não configurado. Insira a URL e Chave Anon primeiro.' };
  }

  try {
    // 1. Sync lotes_sap
    if (data.lotes.length > 0) {
      const dbLotes = data.lotes.map((l) => ({
        id: l.id,
        material_code: l.materialCode,
        material_desc: l.materialDesc,
        centro: l.centro || 'BRV4',
        centro_desc: l.centroDesc || 'FÁBRICA BRV4',
        deposito: l.deposito || 'TINT MR01 A062',
        posicao_deposito: l.posicaoDeposito || 'A062',
        lote_sap: l.loteSAP,
        lote_fornecedor: l.loteFornecedor,
        tipo_material: l.tipoMaterial,
        grupo_mercadoria: l.grupoMercadoria,
        unidade_medida: l.unidadeMedida,
        fornecedor: l.fornecedor,
        data_vencimento: l.dataVencimento,
        estoque_livre: l.estoqueLivre,
        prioridade_fefo: l.prioridadeFEFO || 1,
        dias_para_vencer: l.diasParaVencer || 0,
        status_fefo: l.statusFEFO || 'fefo_1',
        is_critical: l.isCritical || false,
        usuario_login: 'ambev',
        updated_at: new Date().toISOString(),
      }));

      const { error: lotesErr } = await client.from('lotes_sap').upsert(dbLotes, { onConflict: 'id' });
      if (lotesErr) console.warn('Aviso ao sincronizar lotes:', lotesErr.message);
    }

    // 2. Sync baixas_reserva
    if (data.historico.length > 0) {
      const dbBaixas = data.historico.map((h) => ({
        id: h.id,
        data_hora: h.dataHora,
        numero_reserva: h.numeroReserva || '',
        linha_reserva: h.linhaReserva || '',
        conferente_id: h.conferenteId,
        conferente_nome: h.conferenteNome,
        conferente_matricula: h.conferenteMatricula || '',
        conferente_turno: h.conferenteTurno || '',
        usuario_role: h.usuarioRole || 'administrador',
        usuario_login: 'ambev',
        material_code: h.materialCode,
        material_desc: h.materialDesc,
        lote_sap: h.loteSAP,
        lote_fornecedor: h.loteFornecedor || '',
        fornecedor: h.fornecedor || '',
        deposito: h.deposito,
        quantidade_atendida: h.quantidadeAtendida,
        unidade_medida: h.unidadeMedida,
        foi_fefo_1: h.foiFefo1,
        justificativa_desvio: h.justificativaDesvio || '',
        status_controle: h.statusControle || 'Pendente',
        usuario_controle: h.usuarioControle || '',
        data_hora_controle: h.dataHoraControle || null,
        observacao_controle: h.observacaoControle || '',
      }));

      const { error: baixasErr } = await client.from('baixas_reserva').upsert(dbBaixas, { onConflict: 'id' });
      if (baixasErr) console.warn('Aviso ao sincronizar baixas:', baixasErr.message);
    }

    // 3. Sync arquivos_importados
    if (data.importacoes.length > 0) {
      const dbImportacoes = data.importacoes.map((imp) => ({
        id: imp.id,
        data_hora: imp.dataHora,
        nome_arquivo: imp.nomeArquivo,
        total_linhas_lidas: imp.totalLinhasLidas,
        total_lotes_importados: imp.totalLotesImportados,
        total_estoque_livre_sum: imp.totalEstoqueLivreSum,
        usuario: imp.usuario || 'ambev',
        usuario_login: 'ambev',
        status: imp.status || 'sucesso',
        mensagem: imp.mensagem || '',
        dados_json: imp,
      }));

      const { error: impErr } = await client.from('arquivos_importados').upsert(dbImportacoes, { onConflict: 'id' });
      if (impErr) console.warn('Aviso ao sincronizar arquivos:', impErr.message);
    }

    // 4. Sync conferentes
    if (data.conferentes.length > 0) {
      const dbConferentes = data.conferentes.map((c) => ({
        id: c.id,
        nome: c.nome,
        matricula: c.matricula,
        turno: c.turno,
        perfil: c.perfil,
        status: c.status,
        area_producao: c.areaProducao || '',
        usuario_login: 'ambev',
        updated_at: new Date().toISOString(),
      }));

      const { error: confErr } = await client.from('conferentes').upsert(dbConferentes, { onConflict: 'id' });
      if (confErr) console.warn('Aviso ao sincronizar conferentes:', confErr.message);
    }

    return { success: true, message: 'Todos os dados foram enviados e vinculados ao login ambev no Supabase com sucesso!' };
  } catch (err: any) {
    return { success: false, message: `Erro ao enviar dados ao Supabase: ${err?.message || 'Erro de comunicação'}` };
  }
}

// Pull Data from Supabase Cloud -> Local State
export async function pullDataFromSupabase(): Promise<{
  success: boolean;
  message: string;
  data?: {
    lotes?: SapLoteItem[];
    historico?: AtendimentoHistorico[];
    importacoes?: ImportacaoRegistro[];
    conferentes?: ConferenteUser[];
  };
}> {
  const client = getSupabaseClient();
  if (!client) {
    return { success: false, message: 'Supabase não configurado.' };
  }

  try {
    // 1. Fetch lotes_sap
    const { data: dbLotes, error: lotesErr } = await client.from('lotes_sap').select('*');
    if (lotesErr) {
      return { success: false, message: `Erro ao buscar lotes: ${lotesErr.message}` };
    }

    const rawLotes = (dbLotes || []).map((row: any): SapLoteItem => ({
      id: row.id,
      materialCode: row.material_code || '',
      materialDesc: row.material_desc || '',
      centro: row.centro || 'BRV4',
      centroDesc: row.centro_desc || 'FÁBRICA BRV4',
      deposito: row.deposito || 'TINT MR01 A062',
      posicaoDeposito: row.posicao_deposito || 'A062',
      loteSAP: row.lote_sap || '',
      loteFornecedor: row.lote_fornecedor || '',
      tipoMaterial: row.tipo_material || 'ROH',
      tipoMaterialDesc: row.tipo_material_desc || 'Matéria-Prima',
      grupoMercadoria: row.grupo_mercadoria || 'GRP-01',
      grupoMercadoriaDesc: row.grupo_mercadoria_desc || 'Insumos / Embalagens',
      unidadeMedida: row.unidade_medida || 'UN',
      tipoAvaliacao: row.tipo_avaliacao || 'NACIONAL',
      fornecedor: row.fornecedor || 'Fornecedor Padrão',
      dataCriacaoLote: row.data_criacao_lote || new Date().toISOString().split('T')[0],
      dataFabricacao: row.data_fabricacao || new Date().toISOString().split('T')[0],
      dataReferencia: row.data_referencia || new Date().toISOString().split('T')[0],
      dataVencimento: row.data_vencimento || new Date().toISOString().split('T')[0],
      faixaEtaria: row.faixa_etaria || 'Recente',
      estoqueLivre: Number(row.estoque_livre || 0),
      estoqueControleQualidade: Number(row.estoque_controle_qualidade || 0),
      estoqueBloqueado: Number(row.estoque_bloqueado || 0),
      estoqueTotal: Number(row.estoque_livre || 0),
      idadeDias: Number(row.idade_dias || 0),
      vidaUtilTotalDias: Number(row.vida_util_total_dias || 365),
      prioridadeFEFO: Number(row.prioridade_fefo || 1),
      diasParaVencer: Number(row.dias_para_vencer || 0),
      statusFEFO: row.status_fefo || 'fefo_1',
      isCritical: Boolean(row.is_critical),
    }));

    const lotes = recalculateFEFO(rawLotes);

    // 2. Fetch baixas_reserva
    const { data: dbBaixas } = await client.from('baixas_reserva').select('*').order('data_hora', { ascending: false });
    const historico: AtendimentoHistorico[] = (dbBaixas || []).map((row: any) => ({
      id: row.id,
      dataHora: row.data_hora,
      numeroReserva: row.numero_reserva,
      linhaReserva: row.linha_reserva,
      conferenteId: row.conferente_id,
      conferenteNome: row.conferente_nome,
      conferenteMatricula: row.conferente_matricula,
      conferenteTurno: row.conferente_turno,
      usuarioRole: row.usuario_role,
      materialCode: row.material_code,
      materialDesc: row.material_desc,
      loteSAP: row.lote_sap,
      loteFornecedor: row.lote_fornecedor,
      fornecedor: row.fornecedor,
      deposito: row.deposito,
      quantidadeAtendida: Number(row.quantidade_atendida),
      unidadeMedida: row.unidade_medida,
      foiFefo1: Boolean(row.foi_fefo_1),
      justificativaDesvio: row.justificativa_desvio,
      statusControle: row.status_controle,
      usuarioControle: row.usuario_controle,
      dataHoraControle: row.data_hora_controle,
      observacaoControle: row.observacao_controle,
    }));

    // 3. Fetch arquivos_importados
    const { data: dbImportacoes } = await client.from('arquivos_importados').select('*').order('data_hora', { ascending: false });
    const importacoes: ImportacaoRegistro[] = (dbImportacoes || []).map((row: any) => {
      if (row.dados_json && typeof row.dados_json === 'object') {
        return row.dados_json;
      }
      return {
        id: row.id,
        dataHora: row.data_hora,
        nomeArquivo: row.nome_arquivo,
        totalLinhasLidas: Number(row.total_linhas_lidas),
        totalLotesImportados: Number(row.total_lotes_importados),
        totalEstoqueLivreSum: Number(row.total_estoque_livre_sum),
        usuario: row.usuario,
        status: row.status,
        mensagem: row.mensagem,
      };
    });

    // 4. Fetch conferentes
    const { data: dbConferentes } = await client.from('conferentes').select('*');
    const conferentes: ConferenteUser[] = (dbConferentes || []).map((row: any) => ({
      id: row.id,
      nome: row.nome,
      matricula: row.matricula,
      turno: row.turno,
      perfil: row.perfil,
      status: row.status,
      areaProducao: row.area_producao,
    }));

    return {
      success: true,
      message: `Dados baixados do Supabase: ${lotes.length} lotes, ${historico.length} baixas, ${importacoes.length} importações.`,
      data: { lotes, historico, importacoes, conferentes },
    };
  } catch (err: any) {
    return { success: false, message: `Erro ao carregar do Supabase: ${err?.message || 'Erro inesperado'}` };
  }
}
