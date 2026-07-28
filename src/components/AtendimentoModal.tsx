import React, { useState } from 'react';
import { X, CheckCircle2, AlertTriangle, ShieldCheck, UserCheck, Package } from 'lucide-react';
import { SapLoteItem, UserRole, ConferenteUser } from '../types';
import { formatDateBR, formatNumberBR } from '../services/fefoEngine';

interface AtendimentoModalProps {
  lote: SapLoteItem | null;
  activeRole: UserRole;
  loggedUser: ConferenteUser | null;
  onClose: () => void;
  onConfirmAtendimento: (
    lote: SapLoteItem,
    quantidade: number,
    conferenteUser: ConferenteUser,
    justificativa?: string,
    numeroReserva?: string,
    linhaReserva?: string
  ) => void;
}

export const AtendimentoModal: React.FC<AtendimentoModalProps> = ({
  lote,
  activeRole,
  loggedUser,
  onClose,
  onConfirmAtendimento,
}) => {
  if (!lote) return null;

  const defaultUser: ConferenteUser = loggedUser || {
    id: 'CONF-101',
    nome: 'Carlos Silva',
    matricula: '102938',
    turno: 'Turno 1',
    perfil: activeRole || 'conferente',
    status: 'Ativo',
  };

  const isFefo1 = lote.prioridadeFEFO === 1;
  const [numeroReserva, setNumeroReserva] = useState<string>('');
  const [conferenteId, setConferenteId] = useState<string>('');
  const [conferenteNome, setConferenteNome] = useState<string>('');
  const [linhaReserva, setLinhaReserva] = useState<string>('');
  const [quantidade, setQuantidade] = useState<number>(Math.min(100, lote.estoqueLivre));
  const [justificativa, setJustificativa] = useState<string>('');
  const [error, setError] = useState<string>('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!numeroReserva.trim()) {
      setError('Por favor, informe ou cole o Nº da Reserva.');
      return;
    }
    if (!conferenteId.trim()) {
      setError('Por favor, informe o ID do Conferente que fez a baixa.');
      return;
    }
    if (!quantidade || quantidade <= 0) {
      setError('A quantidade deve ser maior que zero.');
      return;
    }
    if (quantidade > lote.estoqueLivre) {
      setError(`Quantidade solicitada (${quantidade}) excede o estoque livre (${lote.estoqueLivre}).`);
      return;
    }
    if (!isFefo1 && !justificativa.trim()) {
      setError('Por ser um lote de prioridade secundária, informe a justificativa do desvio FEFO.');
      return;
    }

    const finalConferenteUser: ConferenteUser = {
      ...defaultUser,
      id: conferenteId.trim().toUpperCase(),
      nome: conferenteNome.trim() || conferenteId.trim().toUpperCase() || 'Conferente',
    };

    onConfirmAtendimento(lote, quantidade, finalConferenteUser, justificativa, numeroReserva.trim(), linhaReserva.trim() || '0010');
  };

  return (
    <div className="fixed inset-0 bg-slate-900/70 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-blue-400" />
            <h3 className="text-sm font-extrabold uppercase tracking-wider">Dar Baixa em Reserva</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-3 text-xs">
          {/* FEFO Warning Banner */}
          {!isFefo1 ? (
            <div className="p-3 bg-amber-50 border border-amber-300 rounded-lg text-amber-900 flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-bold">Atenção: Desvio da Prioridade FEFO!</div>
                <div className="text-[11px] mt-0.5 leading-snug">
                  Este lote possui <strong>Prioridade #{lote.prioridadeFEFO}</strong>. É obrigatório registrar a justificativa operacional para dar baixa neste lote.
                </div>
              </div>
            </div>
          ) : (
            <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-lg text-emerald-900 flex items-center gap-2.5">
              <ShieldCheck className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              <div>
                <div className="font-bold">Lote Recomendado FEFO #1</div>
                <div className="text-[11px] text-emerald-800">
                  Validade mais próxima: {formatDateBR(lote.dataVencimento)} ({lote.diasParaVencer} dias para vencer).
                </div>
              </div>
            </div>
          )}

          {/* Dados do Material e Lote (Todos os 8 campos requeridos) */}
          <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 space-y-2">
            <div className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider border-b border-slate-200 pb-1">
              Dados do Material e Lote Selecionado
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div>
                <span className="text-slate-400 block text-[10px]">Nº Material:</span>
                <strong className="font-mono font-black text-slate-900 text-xs">{lote.materialCode}</strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Depósito:</span>
                <strong className="font-bold text-slate-800">{lote.deposito} ({lote.posicaoDeposito})</strong>
              </div>
            </div>

            <div>
              <span className="text-slate-400 block text-[10px]">Desc. Material:</span>
              <div className="font-semibold text-slate-800 leading-snug">{lote.materialDesc}</div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200/80 text-[11px]">
              <div>
                <span className="text-slate-400 block text-[10px]">Nº Lote (SAP):</span>
                <strong className="font-mono font-bold text-slate-900">{lote.loteSAP}</strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Nº Lote Fornecedor:</span>
                <strong className="font-mono text-slate-700">{lote.loteFornecedor || '-'}</strong>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200/80 text-[11px]">
              <div>
                <span className="text-slate-400 block text-[10px]">Data Fabricação:</span>
                <strong className="text-slate-800">{formatDateBR(lote.dataFabricacao)}</strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Data Vencimento (Sled):</span>
                <strong className="text-amber-900 font-bold">{formatDateBR(lote.dataVencimento)}</strong>
              </div>
            </div>

            <div className="pt-1.5 border-t border-slate-200 flex justify-between items-center">
              <span className="text-slate-500 font-bold text-[11px]">Estoque Utiliz. Livre:</span>
              <span className="font-black text-emerald-700 text-sm">
                {formatNumberBR(lote.estoqueLivre, 0)} {lote.unidadeMedida}
              </span>
            </div>
          </div>

          {/* Dados da Baixa (Nº da Reserva & ID do Conferente) */}
          <div className="grid grid-cols-2 gap-2.5 bg-blue-50/70 p-3 rounded-lg border border-blue-200">
            <div className="flex flex-col gap-1">
              <label className="font-bold text-slate-800">
                Nº da Reserva *
              </label>
              <input
                type="text"
                placeholder="Ex: 45091823"
                value={numeroReserva}
                onChange={(e) => setNumeroReserva(e.target.value)}
                className="w-full bg-white text-slate-900 text-xs font-bold p-2 rounded border border-blue-300 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                required
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="font-bold text-slate-800">
                ID do Conferente *
              </label>
              <input
                type="text"
                placeholder="Ex: CONF-101"
                value={conferenteId}
                onChange={(e) => setConferenteId(e.target.value)}
                className="w-full bg-white text-slate-900 text-xs font-bold p-2 rounded border border-blue-300 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                required
              />
            </div>
          </div>

          {/* Nome do Conferente & Linha */}
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2 flex flex-col gap-1">
              <label className="font-semibold text-slate-700">Nome do Conferente que Baixou</label>
              <input
                type="text"
                value={conferenteNome}
                onChange={(e) => setConferenteNome(e.target.value)}
                placeholder="Nome do conferente"
                className="w-full bg-slate-50 text-slate-900 text-xs p-2 rounded border border-slate-300 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="font-semibold text-slate-700">Linha Reserva</label>
              <input
                type="text"
                value={linhaReserva}
                onChange={(e) => setLinhaReserva(e.target.value)}
                placeholder="0010"
                className="w-full bg-slate-50 text-slate-900 text-xs p-2 rounded border border-slate-300 font-mono"
              />
            </div>
          </div>

          {/* Quantity Input */}
          <div className="flex flex-col gap-1">
            <label className="font-bold text-slate-800 flex justify-between">
              <span>Quantidade para Dar Baixa ({lote.unidadeMedida}) *</span>
              <span className="text-slate-400 font-normal">Máx livre: {formatNumberBR(lote.estoqueLivre, 0)}</span>
            </label>
            <input
              type="number"
              min={1}
              max={lote.estoqueLivre}
              step="any"
              value={quantidade}
              onChange={(e) => setQuantidade(Number(e.target.value))}
              className="w-full bg-white text-slate-900 text-sm font-bold p-2 rounded border border-slate-300 focus:outline-none focus:border-blue-500"
              required
            />
          </div>

          {/* Justification if Non-FEFO 1 */}
          {!isFefo1 && (
            <div className="flex flex-col gap-1">
              <label className="font-bold text-amber-900 flex items-center gap-1">
                <span>Justificativa do Desvio FEFO *</span>
              </label>
              <textarea
                value={justificativa}
                onChange={(e) => setJustificativa(e.target.value)}
                placeholder="Informe o motivo da baixa neste lote secundário..."
                className="w-full bg-amber-50/50 text-slate-900 text-xs p-2 rounded border border-amber-300 h-16 focus:outline-none focus:border-amber-500"
                required
              />
            </div>
          )}

          {error && (
            <div className="text-rose-600 font-semibold text-xs bg-rose-50 p-2 rounded border border-rose-200">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded text-slate-600 font-semibold hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className={`px-5 py-2.5 rounded font-extrabold text-white flex items-center gap-2 shadow-sm transition-all active:scale-95 cursor-pointer ${
                isFefo1 ? 'bg-green-600 hover:bg-green-700' : 'bg-slate-800 hover:bg-black'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Dar Baixa em Reserva</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
