import { useStore, useFilteredData } from '@/store/useStore';
import { aggregate, filterByBase, deltaPercent, groupBy } from '@/lib/aggregations';
import { formatCurrency, formatPct, getDeltaColorClass, formatQty } from '@/lib/format';
import { GlobalFilters } from '@/components/GlobalFilters';
import { Upload, ChevronRight, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';

export default function ProdutoPage() {
  const data = useFilteredData();
  const uploadMeta = useStore((s) => s.uploadMeta);
  const filters = useStore((s) => s.filters);
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

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
  const comp = filterByBase(data, filters.baseComparacao === 'orcamento' ? 'Orç 26' : 'Real 25');
  const compLabel = filters.baseComparacao === 'orcamento' ? 'Orç 26' : 'Real 25';

  const totalReal = aggregate(real26).receitaBrutaOperacional;

  // Group by Familia
  const famReal = groupBy(real26, (r) => r.familia);
  const famComp = groupBy(comp, (r) => r.familia);
  const familias = [...new Set([...Object.keys(famReal), ...Object.keys(famComp)])].filter(Boolean).sort();

  const toggle = (key: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const famData = familias.map((fam) => {
    const rAgg = aggregate(famReal[fam] || []);
    const cAgg = aggregate(famComp[fam] || []);
    return {
      fam,
      real: rAgg.receitaBrutaOperacional,
      comp: cAgg.receitaBrutaOperacional,
      delta: deltaPercent(rAgg.receitaBrutaOperacional, cAgg.receitaBrutaOperacional),
      qty: rAgg.quantidade,
      mix: totalReal ? rAgg.receitaBrutaOperacional / totalReal : 0,
    };
  }).sort((a, b) => b.real - a.real);

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-xl font-semibold text-foreground tracking-tight">Visão por Produto / Família</h1>
      <GlobalFilters />

      <div className="rounded-xl bg-surface shadow-layered overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-xs text-muted-foreground">
                <th className="text-left px-5 py-3 font-medium">Família / Grupo / Produto</th>
                <th className="text-right px-4 py-3 font-medium">Qtd</th>
                <th className="text-right px-4 py-3 font-medium">Receita Bruta</th>
                <th className="text-right px-4 py-3 font-medium">Δ% {compLabel}</th>
                <th className="text-right px-4 py-3 font-medium">Mix%</th>
              </tr>
            </thead>
            <tbody>
              {famData.map((fam) => {
                const isExpanded = expanded.has(fam.fam);
                return (
                  <>
                    <tr
                      key={fam.fam}
                      className="border-b border-border/30 hover:bg-accent/20 transition-colors duration-150 cursor-pointer"
                      onClick={() => toggle(fam.fam)}
                    >
                      <td className="px-5 py-2.5 font-semibold text-foreground flex items-center gap-1">
                        {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                        {fam.fam}
                      </td>
                      <td className="text-right px-4 py-2.5 tabular-nums text-foreground">{formatQty(fam.qty)}</td>
                      <td className="text-right px-4 py-2.5 tabular-nums font-medium text-foreground">{formatCurrency(fam.real)}</td>
                      <td className={`text-right px-4 py-2.5 tabular-nums font-medium ${getDeltaColorClass(fam.delta)}`}>{formatPct(fam.delta)}</td>
                      <td className="text-right px-4 py-2.5 tabular-nums text-muted-foreground">{formatPct(fam.mix)}</td>
                    </tr>
                    {isExpanded && <GrupoRows fam={fam.fam} data={data} filters={filters} compLabel={compLabel} totalReal={totalReal} expanded={expanded} toggle={toggle} />}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function GrupoRows({ fam, data, filters, compLabel, totalReal, expanded, toggle }: any) {
  const famData = data.filter((r: any) => r.familia === fam);
  const real26 = filterByBase(famData, 'Real 26');
  const comp = filterByBase(famData, filters.baseComparacao === 'orcamento' ? 'Orç 26' : 'Real 25');

  const gpReal = groupBy(real26, (r: any) => r.grupoProduto);
  const gpComp = groupBy(comp, (r: any) => r.grupoProduto);
  const groups = [...new Set([...Object.keys(gpReal), ...Object.keys(gpComp)])].filter(Boolean).sort();

  return (
    <>
      {groups.map((gp) => {
        const rAgg = aggregate(gpReal[gp] || []);
        const cAgg = aggregate(gpComp[gp] || []);
        const dp = deltaPercent(rAgg.receitaBrutaOperacional, cAgg.receitaBrutaOperacional);
        const key = `${fam}|${gp}`;
        const isExpanded = expanded.has(key);

        return (
          <>
            <tr key={key} className="border-b border-border/20 hover:bg-accent/10 transition-colors duration-150 cursor-pointer" onClick={() => toggle(key)}>
              <td className="pl-10 pr-5 py-2 text-muted-foreground text-xs flex items-center gap-1">
                {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                {gp}
              </td>
              <td className="text-right px-4 py-2 tabular-nums text-xs text-foreground">{formatQty(rAgg.quantidade)}</td>
              <td className="text-right px-4 py-2 tabular-nums text-xs text-foreground">{formatCurrency(rAgg.receitaBrutaOperacional)}</td>
              <td className={`text-right px-4 py-2 tabular-nums text-xs font-medium ${getDeltaColorClass(dp)}`}>{formatPct(dp)}</td>
              <td className="text-right px-4 py-2 tabular-nums text-xs text-muted-foreground">{formatPct(totalReal ? rAgg.receitaBrutaOperacional / totalReal : 0)}</td>
            </tr>
            {isExpanded && <ProductRows gp={gp} fam={fam} data={data} filters={filters} totalReal={totalReal} />}
          </>
        );
      })}
    </>
  );
}

function ProductRows({ gp, fam, data, filters, totalReal }: any) {
  const gpData = data.filter((r: any) => r.familia === fam && r.grupoProduto === gp);
  const real26 = filterByBase(gpData, 'Real 26');
  const comp = filterByBase(gpData, filters.baseComparacao === 'orcamento' ? 'Orç 26' : 'Real 25');

  const pReal = groupBy(real26, (r: any) => r.descricaoProduto);
  const pComp = groupBy(comp, (r: any) => r.descricaoProduto);
  const prods = [...new Set([...Object.keys(pReal), ...Object.keys(pComp)])].filter(Boolean).sort();

  return (
    <>
      {prods.map((prod) => {
        const rAgg = aggregate(pReal[prod] || []);
        const cAgg = aggregate(pComp[prod] || []);
        const dp = deltaPercent(rAgg.receitaBrutaOperacional, cAgg.receitaBrutaOperacional);
        return (
          <tr key={`${fam}|${gp}|${prod}`} className="border-b border-border/10 hover:bg-accent/5 transition-colors duration-150">
            <td className="pl-16 pr-5 py-1.5 text-muted-foreground/80 text-[11px]">{prod}</td>
            <td className="text-right px-4 py-1.5 tabular-nums text-[11px] text-foreground/80">{formatQty(rAgg.quantidade)}</td>
            <td className="text-right px-4 py-1.5 tabular-nums text-[11px] text-foreground/80">{formatCurrency(rAgg.receitaBrutaOperacional)}</td>
            <td className={`text-right px-4 py-1.5 tabular-nums text-[11px] font-medium ${getDeltaColorClass(dp)}`}>{formatPct(dp)}</td>
            <td className="text-right px-4 py-1.5 tabular-nums text-[11px] text-muted-foreground">{formatPct(totalReal ? rAgg.receitaBrutaOperacional / totalReal : 0)}</td>
          </tr>
        );
      })}
    </>
  );
}
