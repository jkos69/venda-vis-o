import { useStore, useFilteredData } from '@/store/useStore';
import { aggregate, filterByBase, groupBy } from '@/lib/aggregations';
import { formatCurrency } from '@/lib/format';
import { GlobalFilters } from '@/components/GlobalFilters';
import { Upload } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid } from 'recharts';

type Indicator = 'receitaBrutaOperacional' | 'quantidade' | 'receitaLiquida';

export default function EvolucaoPage() {
  const data = useFilteredData();
  const uploadMeta = useStore((s) => s.uploadMeta);
  const navigate = useNavigate();
  const [indicator, setIndicator] = useState<Indicator>('receitaBrutaOperacional');

  if (!uploadMeta) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4 animate-fade-in">
        <Upload className="h-12 w-12 text-muted-foreground/30" strokeWidth={1.5} />
        <p className="text-muted-foreground text-sm">Nenhum dado carregado.</p>
        <button onClick={() => navigate('/upload')} className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors duration-150">Importar Planilha</button>
      </div>
    );
  }

  const real26 = filterByBase(data, 'Real 26');
  const orc26 = filterByBase(data, 'Orç 26');
  const real25 = filterByBase(data, 'Real 25');

  const byMonthR26 = groupBy(real26, (r) => String(r.mes));
  const byMonthO26 = groupBy(orc26, (r) => String(r.mes));
  const byMonthR25 = groupBy(real25, (r) => String(r.mes));

  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  const getValue = (rows: any[], ind: Indicator) => {
    const agg = aggregate(rows);
    if (ind === 'receitaBrutaOperacional') return agg.receitaBrutaOperacional;
    if (ind === 'quantidade') return agg.quantidade;
    // receitaLiquida
    return agg.receitaBrutaOperacional - Math.abs(agg.devolucao) - Math.abs(agg.impostosSemST) - Math.abs(agg.icms) - Math.abs(agg.icmsST);
  };

  const chartData = months.map((m) => ({
    mes: `M${String(m).padStart(2, '0')}`,
    'Real 26': getValue(byMonthR26[String(m)] || [], indicator),
    'Orç 26': getValue(byMonthO26[String(m)] || [], indicator),
    'Real 25': getValue(byMonthR25[String(m)] || [], indicator),
  }));

  const indicatorLabels: Record<Indicator, string> = {
    receitaBrutaOperacional: 'Receita Bruta Operacional',
    quantidade: 'Quantidade',
    receitaLiquida: 'Receita Líquida',
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-xl font-semibold text-foreground tracking-tight">Evolução Mensal</h1>
      <GlobalFilters />

      <div className="flex items-center gap-3">
        <select
          value={indicator}
          onChange={(e) => setIndicator(e.target.value as Indicator)}
          className="bg-surface text-foreground text-xs border border-border rounded-lg px-3 py-2 focus:ring-1 focus:ring-primary outline-none"
        >
          {Object.entries(indicatorLabels).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>

      <div className="rounded-xl bg-surface shadow-layered p-5">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
          {indicatorLabels[indicator]} — Comparativo Mensal
        </h2>
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={chartData} margin={{ left: 20, right: 20, top: 10, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(217,19%,14%)" />
            <XAxis dataKey="mes" stroke="hsl(215,15%,65%)" fontSize={11} />
            <YAxis
              tickFormatter={(v) => indicator === 'quantidade' ? `${(v / 1000).toFixed(0)}k` : `R$ ${(v / 1000000).toFixed(1)}M`}
              stroke="hsl(215,15%,65%)"
              fontSize={10}
            />
            <Tooltip
              formatter={(v: number) => indicator === 'quantidade' ? v.toLocaleString('pt-BR') : formatCurrency(v)}
              contentStyle={{ backgroundColor: 'hsl(222,24%,7%)', border: '1px solid hsl(217,19%,14%)', borderRadius: 8, fontSize: 12 }}
              labelStyle={{ color: 'hsl(210,40%,98%)' }}
              itemStyle={{ color: 'hsl(210,40%,98%)' }}
            />
            <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
            <Line
              type="monotone"
              dataKey="Real 26"
              stroke="hsl(210,100%,56%)"
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0 }}
            />
            <Line
              type="monotone"
              dataKey="Orç 26"
              stroke="hsl(215,15%,45%)"
              strokeWidth={2}
              strokeDasharray="6 3"
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0 }}
            />
            <Line
              type="monotone"
              dataKey="Real 25"
              stroke="hsl(165,100%,39%)"
              strokeWidth={2}
              strokeDasharray="3 3"
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
