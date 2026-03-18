import { useStore, useFilteredData } from '@/store/useStore';
import { aggregate, filterByBase, deltaPercent, groupBy, getMesesComDadosReais, filtrarPelosMesesDoReal } from '@/lib/aggregations';
import { formatCurrency, formatPct, getDeltaColorClass, formatQty } from '@/lib/format';
import { GlobalFilters } from '@/components/GlobalFilters';
import { Upload, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function ClientePage() {
  const data = useFilteredData();
  const uploadMeta = useStore((s) => s.uploadMeta);
  const filters = useStore((s) => s.filters);
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [limit, setLimit] = useState<number>(20);
  const [expandedClient, setExpandedClient] = useState<string | null>(null);

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

  const cliReal = groupBy(real26, (r) => r.cliente);
  const cliComp = groupBy(comp, (r) => r.cliente);
  const totalReal = aggregate(real26).receitaBrutaOperacional;

  const allClients = [...new Set([...Object.keys(cliReal), ...Object.keys(cliComp)])].filter(Boolean);

  let tableData = allClients.map((cli) => {
    const rAgg = aggregate(cliReal[cli] || []);
    const cAgg = aggregate(cliComp[cli] || []);
    const grupo = (cliReal[cli]?.[0] || cliComp[cli]?.[0])?.grupoClientes || '';
    return {
      cli, grupo,
      real: rAgg.receitaBrutaOperacional,
      comp: cAgg.receitaBrutaOperacional,
      delta: deltaPercent(rAgg.receitaBrutaOperacional, cAgg.receitaBrutaOperacional),
      qty: rAgg.quantidade,
      mix: totalReal ? rAgg.receitaBrutaOperacional / totalReal : 0,
    };
  }).sort((a, b) => b.real - a.real);

  if (search) {
    tableData = tableData.filter((d) => d.cli.toLowerCase().includes(search.toLowerCase()));
  }

  const displayed = limit === 0 ? tableData : tableData.slice(0, limit);

  const chartData = tableData.slice(0, 15).map((d) => ({
    name: d.cli.length > 18 ? d.cli.slice(0, 18) + '…' : d.cli,
    value: d.real,
  }));

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-xl font-semibold text-foreground tracking-tight">Visão por Cliente</h1>
      <GlobalFilters />

      <div className="rounded-xl bg-surface shadow-layered p-5">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Top 15 Clientes — Receita Bruta</h2>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={chartData} layout="vertical" margin={{ left: 140, right: 20 }}>
            <XAxis type="number" tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`} stroke="hsl(215,15%,65%)" fontSize={10} />
            <YAxis type="category" dataKey="name" stroke="hsl(215,15%,65%)" fontSize={10} width={130} />
            <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ backgroundColor: 'hsl(222,24%,7%)', border: '1px solid hsl(217,19%,14%)', borderRadius: 8, fontSize: 12 }} />
            <Bar dataKey="value" fill="hsl(210,100%,56%)" radius={[0, 4, 4, 0]} fillOpacity={0.8} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input type="text" placeholder="Buscar cliente..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full bg-surface text-foreground text-xs border border-border rounded-lg pl-8 pr-3 py-2 focus:ring-1 focus:ring-primary outline-none" />
        </div>
        <select value={limit} onChange={(e) => setLimit(Number(e.target.value))} className="bg-surface text-foreground text-xs border border-border rounded-lg px-3 py-2 focus:ring-1 focus:ring-primary outline-none">
          <option value={10}>Top 10</option>
          <option value={20}>Top 20</option>
          <option value={0}>Todos</option>
        </select>
      </div>

      <div className="rounded-xl bg-surface shadow-layered overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-xs text-muted-foreground">
                <th className="text-left px-5 py-3 font-medium w-8">#</th>
                <th className="text-left px-4 py-3 font-medium">Cliente</th>
                <th className="text-left px-4 py-3 font-medium">Grupo</th>
                <th className="text-right px-4 py-3 font-medium">Receita Bruta</th>
                <th className="text-right px-4 py-3 font-medium">Qtd</th>
                <th className="text-right px-4 py-3 font-medium">Δ%</th>
                <th className="text-right px-4 py-3 font-medium">Mix%</th>
              </tr>
            </thead>
            <tbody>
              {displayed.map((row, i) => (
                <>
                  <tr key={row.cli} className="border-b border-border/30 hover:bg-accent/20 transition-colors duration-150 cursor-pointer" onClick={() => setExpandedClient(expandedClient === row.cli ? null : row.cli)}>
                    <td className="px-5 py-2.5 text-muted-foreground tabular-nums">{i + 1}</td>
                    <td className="px-4 py-2.5 font-medium text-foreground">{row.cli}</td>
                    <td className="px-4 py-2.5 text-muted-foreground text-xs">{row.grupo}</td>
                    <td className="text-right px-4 py-2.5 tabular-nums font-medium text-foreground">{formatCurrency(row.real)}</td>
                    <td className="text-right px-4 py-2.5 tabular-nums text-foreground">{formatQty(row.qty)}</td>
                    <td className={`text-right px-4 py-2.5 tabular-nums font-medium ${getDeltaColorClass(row.delta)}`}>{formatPct(row.delta)}</td>
                    <td className="text-right px-4 py-2.5 tabular-nums text-muted-foreground">{formatPct(row.mix)}</td>
                  </tr>
                  {expandedClient === row.cli && <ClientDrillDown cli={row.cli} data={data} />}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function ClientDrillDown({ cli, data }: { cli: string; data: any[] }) {
  const cliData = data.filter((r) => r.cliente === cli);
  const byMonth = groupBy(filterByBase(cliData, 'Real 26'), (r) => String(r.mes));
  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  const monthData = months.map((m) => ({
    mes: `M${String(m).padStart(2, '0')}`,
    value: aggregate(byMonth[String(m)] || []).receitaBrutaOperacional,
  }));

  return (
    <tr key={`${cli}-drill`}>
      <td colSpan={7} className="px-8 py-4 bg-accent/10">
        <p className="text-xs font-medium text-muted-foreground mb-3">Histórico Mensal — {cli}</p>
        <ResponsiveContainer width="100%" height={150}>
          <BarChart data={monthData}>
            <XAxis dataKey="mes" stroke="hsl(215,15%,65%)" fontSize={9} />
            <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} stroke="hsl(215,15%,65%)" fontSize={9} />
            <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ backgroundColor: 'hsl(222,24%,7%)', border: '1px solid hsl(217,19%,14%)', borderRadius: 8, fontSize: 11 }} />
            <Bar dataKey="value" fill="hsl(210,100%,56%)" radius={[3, 3, 0, 0]} fillOpacity={0.7} />
          </BarChart>
        </ResponsiveContainer>
      </td>
    </tr>
  );
}