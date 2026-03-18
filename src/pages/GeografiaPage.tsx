import { useStore, useFilteredData } from '@/store/useStore';
import { aggregate, filterByBase, deltaPercent, groupBy, getMesesComDadosReais, filtrarPelosMesesDoReal } from '@/lib/aggregations';
import { formatCurrency, formatPct, getDeltaColorClass, formatQty } from '@/lib/format';
import { GlobalFilters } from '@/components/GlobalFilters';
import { Upload } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function GeografiaPage() {
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

  const paisReal = groupBy(real26, (r) => r.pais);
  const paisComp = groupBy(comp, (r) => r.pais);
  const paises = [...new Set([...Object.keys(paisReal), ...Object.keys(paisComp)])].filter(Boolean).sort();

  const mercReal = groupBy(real26, (r) => r.mercado);
  const mercComp = groupBy(comp, (r) => r.mercado);
  const mercados = [...new Set([...Object.keys(mercReal), ...Object.keys(mercComp)])].filter(Boolean).sort();

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-xl font-semibold text-foreground tracking-tight">Visão por Geografia</h1>
      <GlobalFilters />

      <div className="rounded-xl bg-surface shadow-layered overflow-hidden">
        <div className="px-5 py-3 border-b border-border">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Por Mercado</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-xs text-muted-foreground">
                <th className="text-left px-5 py-3 font-medium">Mercado</th>
                <th className="text-right px-4 py-3 font-medium">Receita Real 26</th>
                <th className="text-right px-4 py-3 font-medium">{compLabel}</th>
                <th className="text-right px-4 py-3 font-medium">Δ%</th>
                <th className="text-right px-4 py-3 font-medium">Qtd</th>
              </tr>
            </thead>
            <tbody>
              {mercados.map((m) => {
                const rAgg = aggregate(mercReal[m] || []);
                const cAgg = aggregate(mercComp[m] || []);
                const dp = deltaPercent(rAgg.receitaBrutaOperacional, cAgg.receitaBrutaOperacional);
                return (
                  <tr key={m} className="border-b border-border/30 hover:bg-accent/20 transition-colors duration-150">
                    <td className="px-5 py-2.5 font-medium text-foreground">{m}</td>
                    <td className="text-right px-4 py-2.5 tabular-nums font-medium text-foreground">{formatCurrency(rAgg.receitaBrutaOperacional)}</td>
                    <td className="text-right px-4 py-2.5 tabular-nums text-muted-foreground">{formatCurrency(cAgg.receitaBrutaOperacional)}</td>
                    <td className={`text-right px-4 py-2.5 tabular-nums font-medium ${getDeltaColorClass(dp)}`}>{formatPct(dp)}</td>
                    <td className="text-right px-4 py-2.5 tabular-nums text-foreground">{formatQty(rAgg.quantidade)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-xl bg-surface shadow-layered overflow-hidden">
        <div className="px-5 py-3 border-b border-border">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Por País / UF</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-xs text-muted-foreground">
                <th className="text-left px-5 py-3 font-medium">País</th>
                <th className="text-left px-4 py-3 font-medium">UF</th>
                <th className="text-right px-4 py-3 font-medium">Receita Real 26</th>
                <th className="text-right px-4 py-3 font-medium">{compLabel}</th>
                <th className="text-right px-4 py-3 font-medium">Δ%</th>
                <th className="text-right px-4 py-3 font-medium">Qtd</th>
              </tr>
            </thead>
            <tbody>
              {paises.map((pais) => {
                const paisR26 = paisReal[pais] || [];
                const paisC = paisComp[pais] || [];
                const ufReal = groupBy(paisR26, (r) => r.uf);
                const ufComp = groupBy(paisC, (r) => r.uf);
                const ufs = [...new Set([...Object.keys(ufReal), ...Object.keys(ufComp)])].filter(Boolean).sort();

                return ufs.map((uf, i) => {
                  const rAgg = aggregate(ufReal[uf] || []);
                  const cAgg = aggregate(ufComp[uf] || []);
                  const dp = deltaPercent(rAgg.receitaBrutaOperacional, cAgg.receitaBrutaOperacional);
                  return (
                    <tr key={`${pais}-${uf}`} className="border-b border-border/30 hover:bg-accent/20 transition-colors duration-150">
                      <td className="px-5 py-2.5 text-foreground">{i === 0 ? pais : ''}</td>
                      <td className="px-4 py-2.5 text-muted-foreground">{uf}</td>
                      <td className="text-right px-4 py-2.5 tabular-nums font-medium text-foreground">{formatCurrency(rAgg.receitaBrutaOperacional)}</td>
                      <td className="text-right px-4 py-2.5 tabular-nums text-muted-foreground">{formatCurrency(cAgg.receitaBrutaOperacional)}</td>
                      <td className={`text-right px-4 py-2.5 tabular-nums font-medium ${getDeltaColorClass(dp)}`}>{formatPct(dp)}</td>
                      <td className="text-right px-4 py-2.5 tabular-nums text-foreground">{formatQty(rAgg.quantidade)}</td>
                    </tr>
                  );
                });
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}