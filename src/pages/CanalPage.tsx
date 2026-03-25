import { useStore, useFilteredData } from '@/store/useStore';
import { aggregate, filterByBase, deltaPercent, groupBy, groupByNormalized, margemBrutaPercent, getMesesComDadosReais, filtrarPelosMesesDoReal } from '@/lib/aggregations';
import { formatCurrency, formatPct, getDeltaColorClass } from '@/lib/format';
import { GlobalFilters } from '@/components/GlobalFilters';
import { ChartTooltip } from '@/components/ChartTooltip';
import { Upload } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, Legend } from 'recharts';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

const COLORS = ['hsl(210,100%,56%)', 'hsl(165,100%,39%)', 'hsl(45,100%,60%)', 'hsl(280,80%,60%)', 'hsl(0,100%,63%)', 'hsl(190,80%,50%)', 'hsl(30,90%,55%)'];

export default function CanalPage() {
  const data = useFilteredData();
  const uploadMeta = useStore((s) => s.uploadMeta);
  const filters = useStore((s) => s.filters);
  const navigate = useNavigate();
  const [expandedSeg, setExpandedSeg] = useState<string | null>(null);

  if (!uploadMeta) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4 animate-fade-in">
        <Upload className="h-12 w-12 text-muted-foreground/30" strokeWidth={1.5} />
        <p className="text-muted-foreground text-sm">Nenhum dado carregado.</p>
        <button onClick={() => navigate('/upload')} className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors duration-150">Importar Planilha</button>
      </div>
    );
  }

  const mesesDoReal = getMesesComDadosReais(data);

  const real26 = filterByBase(data, 'Real 26');
  const compRaw = filterByBase(data, filters.baseComparacao === 'orcamento' ? 'Orç 26' : 'Real 25');
  const comp = filtrarPelosMesesDoReal(compRaw, mesesDoReal);
  const compLabel = filters.baseComparacao === 'orcamento' ? 'Orç 26' : 'Real 25';

  const segReal = groupByNormalized(real26, (r) => r.segmento);
  const segComp = groupByNormalized(comp, (r) => r.segmento);
  const segs = [...new Set([...Object.keys(segReal), ...Object.keys(segComp)])].filter(Boolean).sort();

  const totalReal = Object.values(segReal).reduce((s, g) => s + aggregate(g.items).receitaBrutaOperacional, 0);

  const tableData = segs.map((normKey) => {
    const rAgg = aggregate(segReal[normKey]?.items || []);
    const cAgg = aggregate(segComp[normKey]?.items || []);
    const label = segReal[normKey]?.label || segComp[normKey]?.label || normKey;
    const mb = margemBrutaPercent(rAgg);
    return {
      normKey,
      seg: label,
      real: rAgg.receitaBrutaOperacional,
      comp: cAgg.receitaBrutaOperacional,
      delta: deltaPercent(rAgg.receitaBrutaOperacional, cAgg.receitaBrutaOperacional),
      mix: totalReal ? rAgg.receitaBrutaOperacional / totalReal : 0,
      mb,
    };
  }).sort((a, b) => b.real - a.real);

  const pieData = tableData.filter((d) => d.real > 0).slice(0, 7).map((d) => ({ name: d.seg, value: d.real }));

  const barData = tableData.slice(0, 8).map((d) => ({
    name: d.seg.length > 15 ? d.seg.slice(0, 15) + '…' : d.seg,
    real: d.real,
    comp: d.comp,
  }));

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-xl font-semibold text-foreground tracking-tight">Visão por Canal / Segmento</h1>
      <GlobalFilters />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-xl bg-surface shadow-layered p-5">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Participação por Segmento</h2>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={2}>
                {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip content={<ChartTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-xl bg-surface shadow-layered p-5">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Real vs {compLabel}</h2>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={barData} margin={{ left: 10, right: 10 }}>
              <XAxis dataKey="name" stroke="hsl(215,15%,65%)" fontSize={9} angle={-30} textAnchor="end" height={60} />
              <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} stroke="hsl(215,15%,65%)" fontSize={10} />
              <Tooltip content={<ChartTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="real" name="Real 26" fill="hsl(210,100%,56%)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="comp" name={compLabel} fill="hsl(215,15%,35%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-xl bg-surface shadow-layered overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-xs text-muted-foreground">
                <th className="text-left px-5 py-3 font-medium">Segmento</th>
                <th className="text-right px-4 py-3 font-medium">Real 26</th>
                <th className="text-right px-4 py-3 font-medium">{compLabel}</th>
                <th className="text-right px-4 py-3 font-medium">Δ%</th>
                <th className="text-right px-4 py-3 font-medium">MB%</th>
                <th className="text-right px-4 py-3 font-medium">Mix%</th>
              </tr>
            </thead>
            <tbody>
              {tableData.map((row) => (
                <>
                  <tr
                    key={row.normKey}
                    className="border-b border-border/30 hover:bg-accent/20 transition-colors duration-150 cursor-pointer"
                    onClick={() => setExpandedSeg(expandedSeg === row.normKey ? null : row.normKey)}
                  >
                    <td className="px-5 py-2.5 font-medium text-foreground">{row.seg}</td>
                    <td className="text-right px-4 py-2.5 tabular-nums font-medium text-foreground">{formatCurrency(row.real)}</td>
                    <td className="text-right px-4 py-2.5 tabular-nums text-muted-foreground">{formatCurrency(row.comp)}</td>
                    <td className={`text-right px-4 py-2.5 tabular-nums font-medium ${getDeltaColorClass(row.delta)}`}>{formatPct(row.delta)}</td>
                    <td className={`text-right px-4 py-2.5 tabular-nums font-medium ${row.mb != null && row.mb > 0 ? 'text-success' : row.mb != null && row.mb < 0 ? 'text-destructive' : 'text-muted-foreground'}`}>{formatPct(row.mb)}</td>
                    <td className="text-right px-4 py-2.5 tabular-nums text-muted-foreground">{formatPct(row.mix)}</td>
                  </tr>
                  {expandedSeg === row.normKey && (
                    <SegDrillDown normKey={row.normKey} data={data} filters={filters} compLabel={compLabel} mesesDoReal={mesesDoReal} />
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

function SegDrillDown({ normKey, data, filters, compLabel, mesesDoReal }: { normKey: string; data: any[]; filters: any; compLabel: string; mesesDoReal: Set<number> }) {
  const segData = data.filter((r) => (r.segmento || '').trim().toUpperCase() === normKey);
  const real26 = filterByBase(segData, 'Real 26');
  const compRaw = filterByBase(segData, filters.baseComparacao === 'orcamento' ? 'Orç 26' : 'Real 25');
  const comp = filtrarPelosMesesDoReal(compRaw, mesesDoReal);

  return (
    <tr key={`${normKey}-drill`}>
      <td colSpan={6} className="px-8 py-3 bg-accent/10">
        <Tabs defaultValue="bu">
          <TabsList className="mb-3">
            <TabsTrigger value="bu">Por BU</TabsTrigger>
            <TabsTrigger value="familia">Por Família</TabsTrigger>
          </TabsList>
          <TabsContent value="bu">
            <SubTable real={real26} comp={comp} groupFn={(r) => r.bu} columnLabel="BU" compLabel={compLabel} />
          </TabsContent>
          <TabsContent value="familia">
            <SubTable real={real26} comp={comp} groupFn={(r) => r.familia} columnLabel="Família" compLabel={compLabel} />
          </TabsContent>
        </Tabs>
      </td>
    </tr>
  );
}

function SubTable({ real, comp, groupFn, columnLabel, compLabel }: { real: any[]; comp: any[]; groupFn: (r: any) => string; columnLabel: string; compLabel: string }) {
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
