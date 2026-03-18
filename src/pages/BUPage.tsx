import { useStore, useFilteredData } from '@/store/useStore';
import { aggregate, filterByBase, deltaPercent, groupBy } from '@/lib/aggregations';
import { formatCurrency, formatPct, getDeltaColorClass, formatQty } from '@/lib/format';
import { GlobalFilters } from '@/components/GlobalFilters';
import { Upload } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export default function BUPage() {
  const data = useFilteredData();
  const uploadMeta = useStore((s) => s.uploadMeta);
  const filters = useStore((s) => s.filters);
  const navigate = useNavigate();
  const [expandedBU, setExpandedBU] = useState<string | null>(null);

  if (!uploadMeta) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4 animate-fade-in">
        <Upload className="h-12 w-12 text-muted-foreground/30" strokeWidth={1.5} />
        <p className="text-muted-foreground text-sm">Nenhum dado carregado.</p>
        <button onClick={() => navigate('/upload')} className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors duration-150">
          Importar Planilha
        </button>
      </div>
    );
  }

  const real26 = filterByBase(data, 'Real 26');
  const comp = filterByBase(data, filters.baseComparacao === 'orcamento' ? 'Orç 26' : 'Real 25');
  const compLabel = filters.baseComparacao === 'orcamento' ? 'Orç 26' : 'Real 25';

  const buGroupsReal = groupBy(real26, (r) => r.bu);
  const buGroupsComp = groupBy(comp, (r) => r.bu);

  const allBUs = [...new Set([...Object.keys(buGroupsReal), ...Object.keys(buGroupsComp)])].filter(Boolean).sort();

  const tableData = allBUs.map((bu) => {
    const rAgg = aggregate(buGroupsReal[bu] || []);
    const cAgg = aggregate(buGroupsComp[bu] || []);
    return {
      bu,
      realROB: rAgg.receitaBrutaOperacional,
      compROB: cAgg.receitaBrutaOperacional,
      delta: deltaPercent(rAgg.receitaBrutaOperacional, cAgg.receitaBrutaOperacional),
      realQty: rAgg.quantidade,
      compQty: cAgg.quantidade,
      deltaQty: deltaPercent(rAgg.quantidade, cAgg.quantidade),
    };
  }).sort((a, b) => b.realROB - a.realROB);

  const chartData = tableData.slice(0, 10).map((d) => ({
    name: d.bu.length > 20 ? d.bu.slice(0, 20) + '…' : d.bu,
    value: d.realROB,
    delta: d.delta,
  }));

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-xl font-semibold text-foreground tracking-tight">Visão por Business Unit</h1>
      <GlobalFilters />

      {/* Chart */}
      <div className="rounded-xl bg-surface shadow-layered p-5">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
          Top 10 BUs — Receita Bruta Operacional
        </h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData} layout="vertical" margin={{ left: 120, right: 20, top: 5, bottom: 5 }}>
            <XAxis type="number" tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`} stroke="hsl(215,15%,65%)" fontSize={10} />
            <YAxis type="category" dataKey="name" stroke="hsl(215,15%,65%)" fontSize={10} width={110} />
            <Tooltip
              formatter={(v: number) => formatCurrency(v)}
              contentStyle={{ backgroundColor: 'hsl(222,24%,7%)', border: '1px solid hsl(217,19%,14%)', borderRadius: 8, fontSize: 12 }}
              labelStyle={{ color: 'hsl(210,40%,98%)' }}
              itemStyle={{ color: 'hsl(210,40%,98%)' }}
            />
            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
              {chartData.map((entry, i) => (
                <Cell key={i} fill={entry.delta != null && entry.delta >= 0 ? 'hsl(165,100%,39%)' : 'hsl(0,100%,63%)'} fillOpacity={0.8} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Table */}
      <div className="rounded-xl bg-surface shadow-layered overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-xs text-muted-foreground">
                <th className="text-left px-5 py-3 font-medium">Business Unit</th>
                <th className="text-right px-4 py-3 font-medium">Real 26</th>
                <th className="text-right px-4 py-3 font-medium">{compLabel}</th>
                <th className="text-right px-4 py-3 font-medium">Δ%</th>
                <th className="text-right px-4 py-3 font-medium">Qtd Real</th>
                <th className="text-right px-4 py-3 font-medium">Δ% Qtd</th>
              </tr>
            </thead>
            <tbody>
              {tableData.map((row) => (
                <>
                  <tr
                    key={row.bu}
                    className="border-b border-border/30 hover:bg-accent/20 transition-colors duration-150 cursor-pointer"
                    onClick={() => setExpandedBU(expandedBU === row.bu ? null : row.bu)}
                  >
                    <td className="px-5 py-2.5 font-medium text-foreground">{row.bu}</td>
                    <td className="text-right px-4 py-2.5 tabular-nums font-medium text-foreground">{formatCurrency(row.realROB)}</td>
                    <td className="text-right px-4 py-2.5 tabular-nums text-muted-foreground">{formatCurrency(row.compROB)}</td>
                    <td className={`text-right px-4 py-2.5 tabular-nums font-medium ${getDeltaColorClass(row.delta)}`}>{formatPct(row.delta)}</td>
                    <td className="text-right px-4 py-2.5 tabular-nums text-foreground">{formatQty(row.realQty)}</td>
                    <td className={`text-right px-4 py-2.5 tabular-nums font-medium ${getDeltaColorClass(row.deltaQty)}`}>{formatPct(row.deltaQty)}</td>
                  </tr>
                  {expandedBU === row.bu && (
                    <DrillDown bu={row.bu} data={data} filters={filters} compLabel={compLabel} />
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function DrillDown({ bu, data, filters, compLabel }: { bu: string; data: any[]; filters: any; compLabel: string }) {
  const buData = data.filter((r) => r.bu === bu);
  const real26 = filterByBase(buData, 'Real 26');
  const comp = filterByBase(buData, filters.baseComparacao === 'orcamento' ? 'Orç 26' : 'Real 25');

  const gpReal = groupBy(real26, (r) => r.grupoProduto);
  const gpComp = groupBy(comp, (r) => r.grupoProduto);
  const groups = [...new Set([...Object.keys(gpReal), ...Object.keys(gpComp)])].filter(Boolean).sort();

  return (
    <tr key={`${bu}-drill`}>
      <td colSpan={6} className="px-8 py-3 bg-accent/10">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-muted-foreground/70">
              <th className="text-left py-1 font-medium">Grupo Produto</th>
              <th className="text-right py-1 font-medium">Real 26</th>
              <th className="text-right py-1 font-medium">{compLabel}</th>
              <th className="text-right py-1 font-medium">Δ%</th>
            </tr>
          </thead>
          <tbody>
            {groups.map((gp) => {
              const rAgg = aggregate(gpReal[gp] || []);
              const cAgg = aggregate(gpComp[gp] || []);
              const dp = deltaPercent(rAgg.receitaBrutaOperacional, cAgg.receitaBrutaOperacional);
              return (
                <tr key={gp} className="border-b border-border/20">
                  <td className="py-1.5 text-muted-foreground">{gp}</td>
                  <td className="text-right py-1.5 tabular-nums text-foreground">{formatCurrency(rAgg.receitaBrutaOperacional)}</td>
                  <td className="text-right py-1.5 tabular-nums text-muted-foreground">{formatCurrency(cAgg.receitaBrutaOperacional)}</td>
                  <td className={`text-right py-1.5 tabular-nums font-medium ${getDeltaColorClass(dp)}`}>{formatPct(dp)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </td>
    </tr>
  );
}
