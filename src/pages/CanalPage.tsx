import { useStore, useFilteredData } from '@/store/useStore';
import { aggregate, filterByBase, deltaPercent, groupBy, getMesesComDadosReais, filtrarPelosMesesDoReal } from '@/lib/aggregations';
import { formatCurrency, formatPct, getDeltaColorClass } from '@/lib/format';
import { GlobalFilters } from '@/components/GlobalFilters';
import { ChartTooltip } from '@/components/ChartTooltip';
import { Upload } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, Legend } from 'recharts';

const COLORS = ['hsl(210,100%,56%)', 'hsl(165,100%,39%)', 'hsl(45,100%,60%)', 'hsl(280,80%,60%)', 'hsl(0,100%,63%)', 'hsl(190,80%,50%)', 'hsl(30,90%,55%)'];

export default function CanalPage() {
  const data = useFilteredData();
  const uploadMeta = useStore((s) => s.uploadMeta);
  const filters = useStore((s) => s.filters);
  const navigate = useNavigate();

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

  const segReal = groupBy(real26, (r) => r.segmento);
  const segComp = groupBy(comp, (r) => r.segmento);
  const segs = [...new Set([...Object.keys(segReal), ...Object.keys(segComp)])].filter(Boolean).sort();

  const totalReal = aggregate(real26).receitaBrutaOperacional;

  const tableData = segs.map((seg) => {
    const rAgg = aggregate(segReal[seg] || []);
    const cAgg = aggregate(segComp[seg] || []);
    return {
      seg,
      real: rAgg.receitaBrutaOperacional,
      comp: cAgg.receitaBrutaOperacional,
      delta: deltaPercent(rAgg.receitaBrutaOperacional, cAgg.receitaBrutaOperacional),
      mix: totalReal ? rAgg.receitaBrutaOperacional / totalReal : 0,
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
              <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ backgroundColor: 'hsl(222,24%,7%)', border: '1px solid hsl(217,19%,14%)', borderRadius: 8, fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-xl bg-surface shadow-layered p-5">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Real vs {compLabel}</h2>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={barData} margin={{ left: 10, right: 10 }}>
              <XAxis dataKey="name" stroke="hsl(215,15%,65%)" fontSize={9} angle={-30} textAnchor="end" height={60} />
              <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} stroke="hsl(215,15%,65%)" fontSize={10} />
              <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ backgroundColor: 'hsl(222,24%,7%)', border: '1px solid hsl(217,19%,14%)', borderRadius: 8, fontSize: 12 }} />
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
                <th className="text-right px-4 py-3 font-medium">Mix%</th>
              </tr>
            </thead>
            <tbody>
              {tableData.map((row) => (
                <tr key={row.seg} className="border-b border-border/30 hover:bg-accent/20 transition-colors duration-150">
                  <td className="px-5 py-2.5 font-medium text-foreground">{row.seg}</td>
                  <td className="text-right px-4 py-2.5 tabular-nums font-medium text-foreground">{formatCurrency(row.real)}</td>
                  <td className="text-right px-4 py-2.5 tabular-nums text-muted-foreground">{formatCurrency(row.comp)}</td>
                  <td className={`text-right px-4 py-2.5 tabular-nums font-medium ${getDeltaColorClass(row.delta)}`}>{formatPct(row.delta)}</td>
                  <td className="text-right px-4 py-2.5 tabular-nums text-muted-foreground">{formatPct(row.mix)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
