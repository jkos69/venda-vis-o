import { useStore, useFilteredData } from '@/store/useStore';
import { formatCurrency, formatPct, formatPctDirect, formatQty, getDeltaColorClass, formatDeltaCurrency } from '@/lib/format';
import { aggregate, receitaLiquida, receitaLiquidaProdutos, totalImpostos, deltaPercent, filterByBase, getMesesComDadosReais, filtrarPelosMesesDoReal, groupBy } from '@/lib/aggregations';
import { GlobalFilters } from '@/components/GlobalFilters';
import { KPICard } from '@/components/KPICard';
import { useNavigate } from 'react-router-dom';
import { Upload } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, Line, ComposedChart } from 'recharts';

const MESES = ['','Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

function formatCell(value: number, format: 'qty' | 'currency' | 'pctDirect'): string {
  if (format === 'qty') return formatQty(value);
  if (format === 'pctDirect') return formatPctDirect(value);
  return formatCurrency(value);
}

export default function DashboardPage() {
  const data = useFilteredData();
  const uploadMeta = useStore((s) => s.uploadMeta);
  const filters = useStore((s) => s.filters);
  const navigate = useNavigate();

  if (!uploadMeta) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4 animate-fade-in">
        <Upload className="h-12 w-12 text-muted-foreground/30" strokeWidth={1.5} />
        <p className="text-muted-foreground text-sm">Nenhum dado carregado.</p>
        <button
          onClick={() => navigate('/upload')}
          className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors duration-150"
        >
          Importar Planilha
        </button>
      </div>
    );
  }

  // 1. Separa por base
  const allReal26 = filterByBase(data, 'Real 26');
  const allOrc26 = filterByBase(data, 'Orç 26');
  const allReal25 = filterByBase(data, 'Real 25');

  // 2. Descobre meses com dados reais
  const mesesDoReal = getMesesComDadosReais(data);

  // 3. Filtra comparativos pelos mesmos meses do Real 26
  const orc26Comparavel = filtrarPelosMesesDoReal(allOrc26, mesesDoReal);
  const real25Comparavel = filtrarPelosMesesDoReal(allReal25, mesesDoReal);

  // 4. Agrega
  const real26 = aggregate(allReal26);
  const orc26 = aggregate(orc26Comparavel);
  const real25 = aggregate(real25Comparavel);

  // Período label
  const mesesOrdenados = Array.from(mesesDoReal).sort((a, b) => a - b);
  const periodoLabel = mesesDoReal.size === 0
    ? 'Acumulado'
    : mesesDoReal.size === 1
      ? `${MESES[mesesOrdenados[0]]}/26`
      : `${MESES[mesesOrdenados[0]]}/26 a ${MESES[mesesOrdenados[mesesOrdenados.length - 1]]}/26`;

  const compBase = filters.baseComparacao === 'orcamento' ? orc26 : real25;
  const compLabel = filters.baseComparacao === 'orcamento' ? 'Orç 26' : 'Real 25';

  const rlReal = receitaLiquida(real26);
  const rlComp = receitaLiquida(compBase);

  const rlpReal = receitaLiquidaProdutos(real26);
  const rlpComp = receitaLiquidaProdutos(compBase);
  const rlpR25 = receitaLiquidaProdutos(real25);

  const cpvReal = 0;
  const cpvComp = 0;
  const cpvR25 = 0;

  const mbReal = rlReal - cpvReal;
  const mbComp = rlComp - cpvComp;
  const mbR25 = receitaLiquida(real25) - cpvR25;

  const cpvRobReal = real26.receitaBrutaOperacional !== 0 ? cpvReal / real26.receitaBrutaOperacional : 0;
  const cpvRobComp = compBase.receitaBrutaOperacional !== 0 ? cpvComp / compBase.receitaBrutaOperacional : 0;
  const cpvRobR25 = real25.receitaBrutaOperacional !== 0 ? cpvR25 / real25.receitaBrutaOperacional : 0;

  const mbPctReal = real26.receitaBrutaOperacional !== 0 ? mbReal / real26.receitaBrutaOperacional : 0;
  const mbPctComp = compBase.receitaBrutaOperacional !== 0 ? mbComp / compBase.receitaBrutaOperacional : 0;
  const mbPctR25 = real25.receitaBrutaOperacional !== 0 ? mbR25 / real25.receitaBrutaOperacional : 0;

  const plRows = [
    { label: 'Quantidade', real: real26.quantidade, comp: compBase.quantidade, real25v: real25.quantidade, format: 'qty' as const, invert: false, isBold: false },
    { label: 'Receita Bruta Operacional', real: real26.receitaBrutaOperacional, comp: compBase.receitaBrutaOperacional, real25v: real25.receitaBrutaOperacional, format: 'currency' as const, invert: false, isBold: true },
    { label: '    Receita Bruta com Produtos', real: real26.receitaBrutaProdutos, comp: compBase.receitaBrutaProdutos, real25v: real25.receitaBrutaProdutos, format: 'currency' as const, invert: false, isBold: false },
    { label: '    Outras Receitas', real: real26.receitaBrutaOutrasReceitas, comp: compBase.receitaBrutaOutrasReceitas, real25v: real25.receitaBrutaOutrasReceitas, format: 'currency' as const, invert: false, isBold: false },
    { label: '(-) Devoluções de Vendas', real: -Math.abs(real26.devolucao), comp: -Math.abs(compBase.devolucao), real25v: -Math.abs(real25.devolucao), format: 'currency' as const, invert: true, isBold: false },
    { label: '(-) Impostos', real: -totalImpostos(real26), comp: -totalImpostos(compBase), real25v: -totalImpostos(real25), format: 'currency' as const, invert: true, isBold: false },
    { label: 'Receita Líquida com Produtos', real: rlpReal, comp: rlpComp, real25v: rlpR25, format: 'currency' as const, invert: false, isBold: true },
    { label: 'Receita Operacional Líquida', real: rlReal, comp: rlComp, real25v: receitaLiquida(real25), format: 'currency' as const, invert: false, isBold: true },
    { label: '(-) Custo do Produto Vendido', real: -Math.abs(cpvReal), comp: -Math.abs(cpvComp), real25v: -Math.abs(cpvR25), format: 'currency' as const, invert: true, isBold: false },
    { label: 'CPV/ROB %', real: cpvRobReal, comp: cpvRobComp, real25v: cpvRobR25, format: 'pctDirect' as const, invert: true, isBold: false },
    { label: 'Margem Bruta', real: mbReal, comp: mbComp, real25v: mbR25, format: 'currency' as const, invert: false, isBold: true },
    { label: 'Margem Bruta %', real: mbPctReal, comp: mbPctComp, real25v: mbPctR25, format: 'pctDirect' as const, invert: false, isBold: false },
  ];

  // Monthly chart data
  const byMonthR26 = groupBy(allReal26, (r) => String(r.mes));
  const byMonthO26 = groupBy(allOrc26, (r) => String(r.mes));
  const byMonthR25 = groupBy(allReal25, (r) => String(r.mes));

  const monthlyChartData = mesesOrdenados.map((m) => {
    const r26 = aggregate(byMonthR26[String(m)] || []).receitaBrutaOperacional;
    const o26 = aggregate(byMonthO26[String(m)] || []).receitaBrutaOperacional;
    const r25 = aggregate(byMonthR25[String(m)] || []).receitaBrutaOperacional;
    return {
      mes: MESES[m],
      'Real 26': r26,
      'Orç 26': o26,
      'Real 25': r25,
      delta: o26 !== 0 ? ((r26 - o26) / Math.abs(o26)) * 100 : null,
    };
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground tracking-tight">
          Performance Comercial — {periodoLabel}
        </h1>
      </div>

      <GlobalFilters />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KPICard title="Receita Bruta Operacional" value={formatCurrency(real26.receitaBrutaOperacional)} compValue={formatCurrency(compBase.receitaBrutaOperacional)} compLabel={compLabel} delta={deltaPercent(real26.receitaBrutaOperacional, compBase.receitaBrutaOperacional)} deltaR={real26.receitaBrutaOperacional - compBase.receitaBrutaOperacional} />
        <KPICard title="Quantidade" value={formatQty(real26.quantidade)} compValue={formatQty(compBase.quantidade)} compLabel={compLabel} delta={deltaPercent(real26.quantidade, compBase.quantidade)} />
        <KPICard title="Receita Líquida" value={formatCurrency(rlReal)} compValue={formatCurrency(rlComp)} compLabel={compLabel} delta={deltaPercent(rlReal, rlComp)} deltaR={rlReal - rlComp} />
        <KPICard title="Devoluções" value={formatCurrency(Math.abs(real26.devolucao))} compValue={formatCurrency(Math.abs(compBase.devolucao))} compLabel={compLabel} delta={deltaPercent(Math.abs(real26.devolucao), Math.abs(compBase.devolucao))} invert />
      </div>

      {/* P&L Table */}
      <div className="rounded-xl bg-surface shadow-layered overflow-hidden">
        <div className="px-5 py-3 border-b border-border">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Demonstrativo P&L de Vendas
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-xs text-muted-foreground">
                <th className="text-left px-5 py-3 font-medium">Indicador</th>
                <th className="text-right px-4 py-3 font-medium">Real 26</th>
                <th className="text-right px-4 py-3 font-medium">{compLabel}</th>
                <th className="text-right px-4 py-3 font-medium">Δ%</th>
                <th className="text-right px-4 py-3 font-medium">ΔR$</th>
                {filters.baseComparacao === 'orcamento' && (
                  <>
                    <th className="text-right px-4 py-3 font-medium">Real 25</th>
                    <th className="text-right px-4 py-3 font-medium">Δ% AA</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {plRows.map((row) => {
                const dp = deltaPercent(row.real, row.comp);
                const dr = row.real - row.comp;
                const dpAA = deltaPercent(row.real, row.real25v);
                return (
                  <tr
                    key={row.label}
                    className={`border-b border-border/30 hover:bg-accent/20 transition-colors duration-150 ${row.isBold ? 'bg-accent/10' : ''}`}
                  >
                    <td className={`px-5 py-2.5 ${row.isBold ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>
                      {row.label}
                    </td>
                    <td className="text-right px-4 py-2.5 tabular-nums font-medium text-foreground">
                      {formatCell(row.real, row.format)}
                    </td>
                    <td className="text-right px-4 py-2.5 tabular-nums text-muted-foreground">
                      {formatCell(row.comp, row.format)}
                    </td>
                    <td className={`text-right px-4 py-2.5 tabular-nums font-medium ${getDeltaColorClass(dp, row.invert)}`}>
                      {formatPct(dp)}
                    </td>
                    <td className={`text-right px-4 py-2.5 tabular-nums ${getDeltaColorClass(dr, row.invert)}`}>
                      {row.format === 'qty' ? formatQty(dr) : row.format === 'pctDirect' ? formatPctDirect(dr) : formatDeltaCurrency(dr)}
                    </td>
                    {filters.baseComparacao === 'orcamento' && (
                      <>
                        <td className="text-right px-4 py-2.5 tabular-nums text-muted-foreground">
                          {formatCell(row.real25v, row.format)}
                        </td>
                        <td className={`text-right px-4 py-2.5 tabular-nums font-medium ${getDeltaColorClass(dpAA, row.invert)}`}>
                          {formatPct(dpAA)}
                        </td>
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-3 border-t border-border/30">
          <p className="text-[11px] text-muted-foreground/70">
            * Comparativos {compLabel} e {filters.baseComparacao === 'orcamento' ? 'Real 25' : ''} consideram apenas os meses com dados realizados ({periodoLabel}), garantindo consistência na análise de desvios.
          </p>
        </div>
      </div>

      {/* Monthly Comparison Chart */}
      {monthlyChartData.length > 0 && (
        <div className="rounded-xl bg-surface shadow-layered p-5">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
            Receita Bruta Operacional — Comparativo Mensal
          </h2>
          <ResponsiveContainer width="100%" height={350}>
            <ComposedChart data={monthlyChartData} margin={{ left: 10, right: 10, top: 10, bottom: 10 }}>
              <XAxis dataKey="mes" stroke="hsl(215,15%,65%)" fontSize={11} />
              <YAxis
                tickFormatter={(v) => `R$ ${(v / 1000000).toFixed(1)}M`}
                stroke="hsl(215,15%,65%)"
                fontSize={10}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  const r26 = payload.find(p => p.dataKey === 'Real 26')?.value as number ?? 0;
                  const o26 = payload.find(p => p.dataKey === 'Orç 26')?.value as number ?? 0;
                  const r25 = payload.find(p => p.dataKey === 'Real 25')?.value as number ?? 0;
                  const dOrc = o26 !== 0 ? ((r26 - o26) / Math.abs(o26)) * 100 : null;
                  const dAA = r25 !== 0 ? ((r26 - r25) / Math.abs(r25)) * 100 : null;
                  return (
                    <div className="bg-popover border border-border rounded-lg shadow-xl p-3 text-xs space-y-1">
                      <p className="font-semibold text-foreground">{label}/26</p>
                      <p className="text-foreground">Real 26: <span className="font-medium">{formatCurrency(r26)}</span></p>
                      <p className="text-muted-foreground">Orç 26: {formatCurrency(o26)} {dOrc != null && <span className={dOrc >= 0 ? 'text-emerald-400' : 'text-red-400'}>({dOrc >= 0 ? '+' : ''}{dOrc.toFixed(1)}%)</span>}</p>
                      <p className="text-muted-foreground">Real 25: {formatCurrency(r25)} {dAA != null && <span className={dAA >= 0 ? 'text-emerald-400' : 'text-red-400'}>({dAA >= 0 ? '+' : ''}{dAA.toFixed(1)}%)</span>}</p>
                    </div>
                  );
                }}
              />
              <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
              <Bar dataKey="Real 26" fill="hsl(210,100%,56%)" radius={[4, 4, 0, 0]} barSize={32} />
              <Bar dataKey="Orç 26" fill="hsl(215,15%,35%)" radius={[4, 4, 0, 0]} barSize={32} />
              <Line type="monotone" dataKey="Real 25" stroke="hsl(30,90%,55%)" strokeWidth={2.5} dot={{ r: 4, fill: 'hsl(30,90%,55%)', strokeWidth: 0 }} activeDot={{ r: 5, strokeWidth: 0 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}