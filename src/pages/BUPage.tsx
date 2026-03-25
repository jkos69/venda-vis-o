import { useStore, useFilteredData } from '@/store/useStore';
import { aggregate, filterByBase, deltaPercent, groupByNormalized, margemBrutaPercent, getMesesComDadosReais, filtrarPelosMesesDoReal } from '@/lib/aggregations';
import { formatCurrency, formatPct, getDeltaColorClass, formatQty } from '@/lib/format';
import { GlobalFilters } from '@/components/GlobalFilters';
import { ChartTooltip } from '@/components/ChartTooltip';
import { Upload } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

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

  const mesesDoReal = getMesesComDadosReais(data);

  const real26 = filterByBase(data, 'Real 26');
  const compRaw = filterByBase(data, filters.baseComparacao === 'orcamento' ? 'Orç 26' : 'Real 25');
  const comp = filtrarPelosMesesDoReal(compRaw, mesesDoReal);
  const compLabel = filters.baseComparacao === 'orcamento' ? 'Orç 26' : 'Real 25';

  const buGroupsReal = groupByNormalized(real26, (r) => r.bu);
  const buGroupsComp = groupByNormalized(comp, (r) => r.bu);

  const allNormKeys = [...new Set([...Object.keys(buGroupsReal), ...Object.keys(buGroupsComp)])].filter(Boolean).sort();

  const tableData = allNormKeys.map((normKey) => {
    const realEntry = buGroupsReal[normKey];
    const compEntry = buGroupsComp[normKey];
    const rAgg = aggregate(realEntry?.items || []);
    const cAgg = aggregate(compEntry?.items || []);
    const label = realEntry?.label || compEntry?.label || normKey;
    const mb = margemBrutaPercent(rAgg);
    return {
      normKey,
      bu: label,
      realROB: rAgg.receitaBrutaOperacional,
      compROB: cAgg.receitaBrutaOperacional,
      delta: deltaPercent(rAgg.receitaBrutaOperacional, cAgg.receitaBrutaOperacional),
      realQty: rAgg.quantidade,
      compQty: cAgg.quantidade,
      deltaQty: deltaPercent(rAgg.quantidade, cAgg.quantidade),
      mb,
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

      <div className="rounded-xl bg-surface shadow-layered p-5">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
          Top 10 BUs — Receita Bruta Operacional
        </h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData} layout="vertical" margin={{ left: 120, right: 20, top: 5, bottom: 5 }}>
            <XAxis type="number" tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`} stroke="hsl(215,15%,65%)" fontSize={10} />
            <YAxis type="category" dataKey="name" stroke="hsl(215,15%,65%)" fontSize={10} width={110} />
            <Tooltip content={<ChartTooltip />} />
            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
              {chartData.map((entry, i) => (
                <Cell key={i} fill={entry.delta != null && entry.delta >= 0 ? 'hsl(165,100%,39%)' : 'hsl(0,100%,63%)'} fillOpacity={0.8} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="rounded-xl bg-surface shadow-layered overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-xs text-muted-foreground">
                <th className="text-left px-5 py-3 font-medium">Business Unit</th>
                <th className="text-right px-4 py-3 font-medium">Real 26</th>
                <th className="text-right px-4 py-3 font-medium">{compLabel}</th>
                <th className="text-right px-4 py-3 font-medium">Δ%</th>
                <th className="text-right px-4 py-3 font-medium">MB%</th>
                <th className="text-right px-4 py-3 font-medium">Qtd Real</th>
                <th className="text-right px-4 py-3 font-medium">Δ% Qtd</th>
              </tr>
            </thead>
            <tbody>
              {tableData.map((row) => (
                <>
                  <tr
                    key={row.normKey}
                    className="border-b border-border/30 hover:bg-accent/20 transition-colors duration-150 cursor-pointer"
                    onClick={() => setExpandedBU(expandedBU === row.normKey ? null : row.normKey)}
                  >
                    <td className="px-5 py-2.5 font-medium text-foreground">{row.bu}</td>
                    <td className="text-right px-4 py-2.5 tabular-nums font-medium text-foreground">{formatCurrency(row.realROB)}</td>
                    <td className="text-right px-4 py-2.5 tabular-nums text-muted-foreground">{formatCurrency(row.compROB)}</td>
                    <td className={`text-right px-4 py-2.5 tabular-nums font-medium ${getDeltaColorClass(row.delta)}`}>{formatPct(row.delta)}</td>
                    <td className={`text-right px-4 py-2.5 tabular-nums font-medium ${row.mb != null && row.mb > 0 ? 'text-success' : row.mb != null && row.mb < 0 ? 'text-destructive' : 'text-muted-foreground'}`}>{formatPct(row.mb)}</td>
                    <td className="text-right px-4 py-2.5 tabular-nums text-foreground">{formatQty(row.realQty)}</td>
                    <td className={`text-right px-4 py-2.5 tabular-nums font-medium ${getDeltaColorClass(row.deltaQty)}`}>{formatPct(row.deltaQty)}</td>
                  </tr>
                  {expandedBU === row.normKey && (
                    <DrillDown normKey={row.normKey} data={data} filters={filters} compLabel={compLabel} mesesDoReal={mesesDoReal} />
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

function DrillDown({ normKey, data, filters, compLabel, mesesDoReal }: { normKey: string; data: any[]; filters: any; compLabel: string; mesesDoReal: Set<number> }) {
  const buData = data.filter((r) => (r.bu || '').trim().toUpperCase() === normKey);
  const real26 = filterByBase(buData, 'Real 26');
  const compRaw = filterByBase(buData, filters.baseComparacao === 'orcamento' ? 'Orç 26' : 'Real 25');
  const comp = filtrarPelosMesesDoReal(compRaw, mesesDoReal);

  return (
    <tr key={`${normKey}-drill`}>
      <td colSpan={7} className="px-8 py-3 bg-accent/10">
        <Tabs defaultValue="grupoProduto">
          <TabsList className="mb-3">
            <TabsTrigger value="grupoProduto">Grupo Produto</TabsTrigger>
            <TabsTrigger value="familia">Família</TabsTrigger>
          </TabsList>
          <TabsContent value="grupoProduto">
            <DrillDownTable real={real26} comp={comp} groupFn={(r) => r.grupoProduto} columnLabel="Grupo Produto" compLabel={compLabel} />
          </TabsContent>
          <TabsContent value="familia">
            <DrillDownTable real={real26} comp={comp} groupFn={(r) => r.familia} columnLabel="Família" compLabel={compLabel} />
          </TabsContent>
        </Tabs>
      </td>
    </tr>
  );
}

function DrillDownTable({ real, comp, groupFn, columnLabel, compLabel }: { real: any[]; comp: any[]; groupFn: (r: any) => string; columnLabel: string; compLabel: string }) {
  const gpReal = groupByNormalized(real, groupFn);
  const gpComp = groupByNormalized(comp, groupFn);
  const groups = [...new Set([...Object.keys(gpReal), ...Object.keys(gpComp)])].filter(Boolean).sort();

  return (
    <table className="w-full text-xs">
      <thead>
        <tr className="text-muted-foreground/70">
          <th className="text-left py-1 font-medium">{columnLabel}</th>
          <th className="text-right py-1 font-medium">Real 26</th>
          <th className="text-right py-1 font-medium">{compLabel}</th>
          <th className="text-right py-1 font-medium">Δ%</th>
          <th className="text-right py-1 font-medium">MB%</th>
        </tr>
      </thead>
      <tbody>
        {groups.map((gpKey) => {
          const rAgg = aggregate(gpReal[gpKey]?.items || []);
          const cAgg = aggregate(gpComp[gpKey]?.items || []);
          const dp = deltaPercent(rAgg.receitaBrutaOperacional, cAgg.receitaBrutaOperacional);
          const mb = margemBrutaPercent(rAgg);
          const label = gpReal[gpKey]?.label || gpComp[gpKey]?.label || gpKey;
          return (
            <tr key={gpKey} className="border-b border-border/20">
              <td className="py-1.5 text-muted-foreground">{label}</td>
              <td className="text-right py-1.5 tabular-nums text-foreground">{formatCurrency(rAgg.receitaBrutaOperacional)}</td>
              <td className="text-right py-1.5 tabular-nums text-muted-foreground">{formatCurrency(cAgg.receitaBrutaOperacional)}</td>
              <td className={`text-right py-1.5 tabular-nums font-medium ${getDeltaColorClass(dp)}`}>{formatPct(dp)}</td>
              <td className={`text-right py-1.5 tabular-nums font-medium ${mb != null && mb > 0 ? 'text-success' : mb != null && mb < 0 ? 'text-destructive' : 'text-muted-foreground'}`}>{formatPct(mb)}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
