import React, { useState } from 'react';
import { Sparkles, X, Bot, CheckCircle, ArrowRight, ShieldCheck, AlertTriangle } from 'lucide-react';
import { SapLoteItem } from '../types';
import { formatDateBR, formatNumberBR } from '../services/fefoEngine';

interface AiSubstitutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  lotes: SapLoteItem[];
  onSelectAlternativeLote: (lote: SapLoteItem) => void;
}

export const AiSubstitutionModal: React.FC<AiSubstitutionModalProps> = ({
  isOpen,
  onClose,
  lotes,
  onSelectAlternativeLote,
}) => {
  const [selectedMaterialCode, setSelectedMaterialCode] = useState<string>(lotes[0]?.materialCode || '');
  const [loading, setLoading] = useState<boolean>(false);
  const [recommendation, setRecommendation] = useState<{
    suggestedLoteId: string;
    rationale: string;
    riskAnalysis: string;
    actionPlan: string;
  } | null>(null);

  if (!isOpen) return null;

  const uniqueMaterials = Array.from(
    new Set(lotes.map((l) => `${l.materialCode} - ${l.materialDesc}`))
  );

  const handleRunAiAnalysis = async () => {
    setLoading(true);
    setRecommendation(null);

    const materialCode = selectedMaterialCode.split(' - ')[0];
    const materialLotes = lotes.filter((l) => l.materialCode === materialCode);

    // Simulate smart AI FEFO recommendation or call server
    setTimeout(() => {
      const bestFefoLote = materialLotes.find((l) => l.prioridadeFEFO === 1) || materialLotes[0];
      const backupLote = materialLotes.find((l) => l.prioridadeFEFO === 2) || bestFefoLote;

      setRecommendation({
        suggestedLoteId: bestFefoLote?.id || '',
        rationale: `Com base nas diretrizes rigorosas da Ambev para a metodologia FEFO (First Expire, First Out), o Lote SAP ${bestFefoLote?.loteSAP} é a escolha ótima e mandatória. Este lote vence em ${formatDateBR(bestFefoLote?.dataVencimento)} (${bestFefoLote?.diasParaVencer} dias restantes) e possui saldo disponível de ${formatNumberBR(bestFefoLote?.estoqueLivre, 0)} ${bestFefoLote?.unidadeMedida}.`,
        riskAnalysis: bestFefoLote?.diasParaVencer <= 30
          ? 'ALERTA DE RISCO CRÍTICO DE OBSOLESCÊNCIA: Este lote está na faixa de vencimento reduzido (<= 30 dias). Seu uso imediato evita descarte direto no valor estimado do estoque livre.'
          : 'Baixo risco operacional. Lote dentro do prazo de conservação ideal com curva de estabilidade aprovada pelo laboratório de qualidade Ambev.',
        actionPlan: `1. Direcionar empilhadeira ao Depósito ${bestFefoLote?.deposito}, Posição ${bestFefoLote?.posicaoDeposito}.\n2. Validar integridade da paletização do Lote Fornecedor ${bestFefoLote?.loteFornecedor}.\n3. Se o Lote #1 estiver inacessível, utilizar o Lote Reserva #${backupLote?.prioridadeFEFO} (Lote SAP ${backupLote?.loteSAP}) registrando a justificativa no sistema.`,
      });
      setLoading(false);
    }, 800);
  };

  const currentMaterialLotes = lotes.filter(
    (l) => l.materialCode === selectedMaterialCode.split(' - ')[0]
  );
  const suggestedLote = lotes.find((l) => l.id === recommendation?.suggestedLoteId);

  return (
    <div className="fixed inset-0 bg-slate-900/75 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
      <div className="bg-white rounded-xl shadow-2xl border border-purple-200 max-w-2xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-purple-950 text-white p-4 flex items-center justify-between border-b border-purple-800/40">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-amber-400 text-slate-950 rounded-md font-bold">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold uppercase tracking-wider text-amber-300">
                Assistente IA - Recomendador de Lotes & Substituição
              </h3>
              <p className="text-[11px] text-purple-200">
                Inteligência Preditiva Ambev para Otimização de Validade e Redução de Perdas
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 flex flex-col gap-4 text-xs">
          {/* Material Selection */}
          <div className="flex flex-col gap-1.5">
            <label className="font-bold text-slate-700">Selecione o Material para Análise IA de Substituição:</label>
            <div className="flex gap-2">
              <select
                value={selectedMaterialCode}
                onChange={(e) => {
                  setSelectedMaterialCode(e.target.value);
                  setRecommendation(null);
                }}
                className="flex-1 bg-slate-50 text-slate-900 text-xs font-medium p-2.5 rounded border border-slate-300 focus:outline-none focus:border-purple-500"
              >
                {uniqueMaterials.map((mat) => (
                  <option key={mat} value={mat}>
                    {mat}
                  </option>
                ))}
              </select>
              <button
                onClick={handleRunAiAnalysis}
                disabled={loading}
                className="bg-purple-700 hover:bg-purple-600 text-white font-bold px-4 py-2 rounded shadow-md transition-all flex items-center gap-2 active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                <Bot className="w-4 h-4 text-amber-300" />
                <span>{loading ? 'Analisando FEFO...' : 'Analisar Lotes com IA'}</span>
              </button>
            </div>
          </div>

          {/* AI Result Card */}
          {recommendation && suggestedLote && (
            <div className="bg-purple-50/60 border border-purple-200 p-4 rounded-xl flex flex-col gap-3">
              {/* Top Banner */}
              <div className="flex items-center justify-between bg-purple-900 text-white p-3 rounded-lg">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  <div>
                    <div className="text-[10px] text-purple-200 uppercase font-semibold">Lote Recomendado pela IA</div>
                    <div className="text-sm font-black text-amber-300 font-mono">
                      Lote SAP: {suggestedLote.loteSAP} ({suggestedLote.deposito} - {suggestedLote.posicaoDeposito})
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => {
                    onSelectAlternativeLote(suggestedLote);
                    onClose();
                  }}
                  className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold px-3 py-1.5 rounded shadow transition-all flex items-center gap-1 cursor-pointer"
                >
                  <span>Selecionar Este Lote</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Rationale */}
              <div className="text-slate-800 leading-relaxed text-[11px] bg-white p-3 rounded-lg border border-purple-100">
                <strong className="text-purple-900 block mb-1">Raciocínio Algorítmico FEFO:</strong>
                {recommendation.rationale}
              </div>

              {/* Risk Analysis */}
              <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-amber-900 text-[11px]">
                <strong className="text-amber-950 flex items-center gap-1 mb-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                  Análise Preditiva de Risco de Vencimento:
                </strong>
                {recommendation.riskAnalysis}
              </div>

              {/* Action Plan */}
              <div className="p-3 bg-slate-900 text-slate-200 rounded-lg text-[11px] font-mono whitespace-pre-line leading-normal">
                <strong className="text-amber-400 block mb-1 font-sans">Plano de Ação para a Operação do Armazém:</strong>
                {recommendation.actionPlan}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
