import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { BarChart3, PieChart as PieIcon, TrendingUp, AlertTriangle, Building, Award } from 'lucide-react';
import { SapLoteItem } from '../types';
import { formatNumberBR } from '../services/fefoEngine';

interface IndicadoresViewProps {
  lotes: SapLoteItem[];
}

export const IndicadoresView: React.FC<IndicadoresViewProps> = ({ lotes }) => {
  // 1. Materiais por Grupo Mercadoria
  const grupoMap = new Map<string, number>();
  lotes.forEach((l) => {
    const grp = l.grupoMercadoriaDesc || l.grupoMercadoria;
    grupoMap.set(grp, (grupoMap.get(grp) || 0) + 1);
  });
  const dataGrupos = Array.from(grupoMap.entries()).map(([name, count]) => ({
    name: name.length > 18 ? name.substring(0, 18) + '...' : name,
    count,
  }));

  // 2. Estoque por Depósito
  const depositoMap = new Map<string, number>();
  lotes.forEach((l) => {
    depositoMap.set(l.deposito, (depositoMap.get(l.deposito) || 0) + l.estoqueLivre);
  });
  const dataDepositos = Array.from(depositoMap.entries()).map(([deposito, estoque]) => ({
    deposito,
    estoque,
  }));

  // 3. Quantidade de Lotes por Faixa de Vencimento
  let vencidosCount = 0;
  let ate30Count = 0;
  let ate60Count = 0;
  let normalCount = 0;

  lotes.forEach((l) => {
    if (l.diasParaVencer < 0) vencidosCount++;
    else if (l.diasParaVencer <= 30) ate30Count++;
    else if (l.diasParaVencer <= 60) ate60Count++;
    else normalCount++;
  });

  const dataFaixasVencimento = [
    { name: 'Vencidos (< 0d)', value: vencidosCount, color: '#e11d48' },
    { name: 'Críticos (1-30d)', value: ate30Count, color: '#f97316' },
    { name: 'Atenção (31-60d)', value: ate60Count, color: '#f59e0b' },
    { name: 'Dentro do Prazo (>60d)', value: normalCount, color: '#10b981' },
  ];

  // 4. Ranking Materiais com Maior Estoque
  const materialStockMap = new Map<string, { code: string; desc: string; totalEstoque: number }>();
  lotes.forEach((l) => {
    if (!materialStockMap.has(l.materialCode)) {
      materialStockMap.set(l.materialCode, {
        code: l.materialCode,
        desc: l.materialDesc,
        totalEstoque: 0,
      });
    }
    materialStockMap.get(l.materialCode)!.totalEstoque += l.estoqueLivre;
  });

  const rankingEstoque = Array.from(materialStockMap.values())
    .sort((a, b) => b.totalEstoque - a.totalEstoque)
    .slice(0, 5);

  // 5. Ranking Materiais Críticos (Menor tempo de vencimento)
  const rankingCriticos = [...lotes]
    .filter((l) => l.estoqueLivre > 0)
    .sort((a, b) => a.diasParaVencer - b.diasParaVencer)
    .slice(0, 5);

  // 6. Distribuição por Fornecedor
  const fornecedorMap = new Map<string, number>();
  lotes.forEach((l) => {
    const forn = l.fornecedor.length > 15 ? l.fornecedor.substring(0, 15) + '...' : l.fornecedor;
    fornecedorMap.set(forn, (fornecedorMap.get(forn) || 0) + 1);
  });
  const dataFornecedores = Array.from(fornecedorMap.entries()).map(([fornecedor, count]) => ({
    fornecedor,
    count,
  }));

  return (
    <div className="flex flex-col gap-6 max-w-[1920px] mx-auto p-4 sm:p-6">
      {/* Title */}
      <div className="bg-slate-900 text-white p-5 rounded-xl border border-slate-800 shadow-md flex items-center gap-3">
        <BarChart3 className="w-6 h-6 text-amber-400" />
        <div>
          <h2 className="text-lg font-black tracking-tight">Painel de Indicadores & Analytics FEFO</h2>
          <p className="text-xs text-slate-300">
            Relatórios visuais e gráficos gerenciais estilo Power BI para governança de validade de insumos Ambev.
          </p>
        </div>
      </div>

      {/* Grid of Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Materiais por Grupo */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-3">
          <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider flex items-center gap-2">
            <PieIcon className="w-4 h-4 text-blue-600" />
            Lotes Cadastrados por Grupo de Mercadorias
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dataGrupos} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-15} textAnchor="end" />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff', fontSize: '12px' }}
                />
                <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Qtd Lotes" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Estoque por Depósito */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-3">
          <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider flex items-center gap-2">
            <Building className="w-4 h-4 text-emerald-600" />
            Estoque Utilizável Livre por Depósito
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dataDepositos} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="deposito" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip
                  formatter={(val: number) => [formatNumberBR(val, 0), 'Estoque Livre']}
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff', fontSize: '12px' }}
                />
                <Bar dataKey="estoque" fill="#10b981" radius={[4, 4, 0, 0]} name="Estoque Livre" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 3: Faixas de Vencimento Pie Chart */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-3">
          <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            Distribuição de Lotes por Faixa de Vencimento
          </h3>
          <div className="h-64 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={dataFaixasVencimento}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {dataFaixasVencimento.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', color: '#fff', fontSize: '12px' }} />
                <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '11px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 4: Fornecedores */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-3">
          <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-purple-600" />
            Distribuição de Lotes por Fornecedor
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dataFornecedores} layout="vertical" margin={{ top: 10, right: 10, left: 30, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="fornecedor" tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', color: '#fff', fontSize: '12px' }} />
                <Bar dataKey="count" fill="#8b5cf6" radius={[0, 4, 4, 0]} name="Qtd Lotes" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Rankings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Ranking Top Estoque */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider mb-3 flex items-center gap-2">
            <Award className="w-4 h-4 text-amber-500" />
            Ranking: Materiais com Maior Saldo em Estoque
          </h3>
          <div className="space-y-2 text-xs">
            {rankingEstoque.map((mat, i) => (
              <div
                key={mat.code}
                className="flex items-center justify-between p-2.5 bg-slate-50 rounded border border-slate-200"
              >
                <div className="flex items-center gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 font-black text-[10px] flex items-center justify-center">
                    {i + 1}
                  </span>
                  <div>
                    <div className="font-mono font-bold text-slate-900">{mat.code}</div>
                    <div className="text-[11px] text-slate-600 line-clamp-1">{mat.desc}</div>
                  </div>
                </div>
                <div className="text-right font-black text-slate-900 text-sm">
                  {formatNumberBR(mat.totalEstoque, 0)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Ranking Críticos */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider mb-3 flex items-center gap-2 text-red-600">
            <AlertTriangle className="w-4 h-4 text-red-600" />
            Ranking: Lotes em Maior Risco de Vencimento
          </h3>
          <div className="space-y-2 text-xs">
            {rankingCriticos.map((lote, i) => (
              <div
                key={lote.id}
                className="flex items-center justify-between p-2.5 bg-rose-50/50 rounded border border-rose-200"
              >
                <div className="flex items-center gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-rose-600 text-white font-black text-[10px] flex items-center justify-center">
                    {i + 1}
                  </span>
                  <div>
                    <div className="font-mono font-bold text-slate-900">
                      {lote.materialCode} | Lote: {lote.loteSAP}
                    </div>
                    <div className="text-[11px] text-slate-600">{lote.materialDesc}</div>
                  </div>
                </div>
                <div className="text-right">
                  <span
                    className={`font-black text-xs px-2 py-0.5 rounded ${
                      lote.diasParaVencer < 0 ? 'bg-rose-600 text-white' : 'bg-orange-500 text-white'
                    }`}
                  >
                    {lote.diasParaVencer} dias
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
