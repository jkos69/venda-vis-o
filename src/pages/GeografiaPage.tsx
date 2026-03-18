import { useState, useMemo } from 'react';
import { useStore, useFilteredData } from '@/store/useStore';
import { aggregate, filterByBase, deltaPercent, groupBy, getMesesComDadosReais, filtrarPelosMesesDoReal } from '@/lib/aggregations';
import { formatCurrency, formatPct, getDeltaColorClass, formatQty } from '@/lib/format';
import { GlobalFilters } from '@/components/GlobalFilters';
import { Upload, ChevronRight, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

const BRASIL_KEY = 'Brasil';

function isBrasil(pais: string) {
  return pais.toLowerCase() === 'brasil';
}

export default function GeografiaPage() {
  const data = useFilteredData();
  const uploadMeta = useStore((s) => s.uploadMeta);
  const filters = useStore((s) => s.filters);
  const navigate = useNavigate();

  const [hideZero, setHideZero] = useState(true);
  const [brasilExpanded, setBrasilExpanded] = useState(false);

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

  // --- Mercado table data ---
  const mercReal = groupBy(real26, (r) => r.mercado);
  const mercComp = groupBy(comp, (r) => r.mercado);
  const mercados = [...new Set([...Object.keys(mercReal), ...Object.keys(mercComp)])].filter(Boolean).sort();

  // --- País/UF table data ---
  const paisReal = groupBy(real26, (r) => r.pais);
  const paisComp = groupBy(comp, (r) => r.pais);
  const paises = [...new Set([...Object.keys(paisReal), ...Object.keys(paisComp)])].filter(Boolean).sort();

  // Build structured rows for País/UF table
  type UfRow = { pais: string; uf: string; rAgg: ReturnType<typeof aggregate>; cAgg: ReturnType<typeof aggregate>; dp: number | null };

  const allUfRows: UfRow[] = [];
  for (const pais of paises) {
    const paisR26 = paisReal[pais] || [];
    const paisC = paisComp[pais] || [];
    const ufReal = groupBy(paisR26, (r) => r.uf);
    const ufComp = groupBy(paisC, (r) => r.uf);
    const ufs = [...new Set([...Object.keys(ufReal), ...Object.keys(ufComp)])].filter(Boolean).sort();
    for (const uf of ufs) {
      const rAgg = aggregate(ufReal[uf] || []);
      const cAgg = aggregate(ufComp[uf] || []);
      const dp = deltaPercent(rAgg.receitaBrutaOperacional, cAgg.receitaBrutaOperacional);
      allUfRows.push({ pais, uf, rAgg, cAgg, dp });
    }
  }

  // Filter zero rows
  const isRowZero = (r: UfRow) =>
    r.rAgg.receitaBrutaOperacional === 0 && r.cAgg.receitaBrutaOperacional === 0 && r.rAgg.quantidade === 0;

  const visibleUfRows = hideZero ? allUfRows.filter((r) => !isRowZero(r)) : allUfRows;
  const hiddenCount = allUfRows.length - visibleUfRows.length;

  // Split into Brasil vs others
  const brasilRows = visibleUfRows.filter((r) => isBrasil(r.pais));
  const otherRows = visibleUfRows.filter((r) => !isBrasil(r.pais));

  // Brasil totals
  const brasilTotalReal = brasilRows.reduce((s, r) => s + r.rAgg.receitaBrutaOperacional, 0);
  const brasilTotalComp = brasilRows.reduce((s, r) => s + r.cAgg.receitaBrutaOperacional, 0);
  const brasilTotalQtd = brasilRows.reduce((s, r) => s + r.rAgg.quantidade, 0);
  const brasilDp = deltaPercent(brasilTotalReal, brasilTotalComp);

  // Group other countries
  const otherByPais = groupBy(otherRows, (r) => r.pais);
  const otherPaises = Object.keys(otherByPais).sort();

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-xl font-semibold text-foreground tracking-tight">Visão por Geografia</h1>
      <GlobalFilters />

      {/* Mercado table */}
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

      {/* País / UF table */}
      <div className="rounded-xl bg-surface shadow-layered overflow-hidden">
        <div className="px-5 py-3 border-b border-border flex items-center justify-between gap-4 flex-wrap">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Por País / UF</h2>
          <div className="flex items-center gap-3">
            {hiddenCount > 0 && (
              <span className="text-[11px] text-muted-foreground">({hiddenCount} linhas ocultadas)</span>
            )}
            <div className="flex items-center gap-2">
              <Switch id="hide-zero" checked={hideZero} onCheckedChange={setHideZero} />
              <Label htmlFor="hide-zero" className="text-xs text-muted-foreground cursor-pointer select-none">
                Ocultar linhas sem receita
              </Label>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-xs text-muted-foreground">
                <th className="text-left px-5 py-3 font-medium w-[200px]">País / UF</th>
                <th className="text-right px-4 py-3 font-medium">Receita Real 26</th>
                <th className="text-right px-4 py-3 font-medium">{compLabel}</th>
                <th className="text-right px-4 py-3 font-medium">Δ%</th>
                <th className="text-right px-4 py-3 font-medium">Qtd</th>
              </tr>
            </thead>
            <tbody>
              {/* BRASIL collapsible row */}
              {brasilRows.length > 0 && (
                <>
                  <tr
                    className="border-b border-border/30 bg-accent/30 hover:bg-accent/50 cursor-pointer transition-colors duration-150"
                    onClick={() => setBrasilExpanded((v) => !v)}
                  >
                    <td className="px-5 py-2.5 font-semibold text-foreground">
                      <span className="inline-flex items-center gap-1.5">
                        {brasilExpanded
                          ? <ChevronDown className="w-4 h-4 text-muted-foreground" />
                          : <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        }
                        Brasil
                        <span className="text-[10px] font-normal text-muted-foreground ml-1">({brasilRows.length} UFs)</span>
                      </span>
                    </td>
                    <td className="text-right px-4 py-2.5 tabular-nums font-semibold text-foreground">{formatCurrency(brasilTotalReal)}</td>
                    <td className="text-right px-4 py-2.5 tabular-nums text-muted-foreground font-medium">{formatCurrency(brasilTotalComp)}</td>
                    <td className={`text-right px-4 py-2.5 tabular-nums font-semibold ${getDeltaColorClass(brasilDp)}`}>{formatPct(brasilDp)}</td>
                    <td className="text-right px-4 py-2.5 tabular-nums font-semibold text-foreground">{formatQty(brasilTotalQtd)}</td>
                  </tr>
                  {/* Expanded UF rows with animation */}
                  <tr className="border-0">
                    <td colSpan={5} className="p-0">
                      <div
                        className="overflow-hidden transition-all duration-300 ease-in-out"
                        style={{
                          maxHeight: brasilExpanded ? `${brasilRows.length * 44}px` : '0px',
                          opacity: brasilExpanded ? 1 : 0,
                        }}
                      >
                        <table className="w-full text-sm">
                          <tbody>
                            {brasilRows.map((r) => (
                              <tr key={`br-${r.uf}`} className="border-b border-border/20 hover:bg-accent/20 transition-colors duration-150">
                                <td className="py-2 font-normal text-muted-foreground w-[200px]" style={{ paddingLeft: '3.25rem' }}>{r.uf}</td>
                                <td className="text-right px-4 py-2 tabular-nums font-medium text-foreground">{formatCurrency(r.rAgg.receitaBrutaOperacional)}</td>
                                <td className="text-right px-4 py-2 tabular-nums text-muted-foreground">{formatCurrency(r.cAgg.receitaBrutaOperacional)}</td>
                                <td className={`text-right px-4 py-2 tabular-nums font-medium ${getDeltaColorClass(r.dp)}`}>{formatPct(r.dp)}</td>
                                <td className="text-right px-4 py-2 tabular-nums text-foreground">{formatQty(r.rAgg.quantidade)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </td>
                  </tr>
                </>
              )}

              {/* Other countries (flat rows) */}
              {otherPaises.map((pais) => {
                const rows = otherByPais[pais];
                return rows.map((r, i) => (
                  <tr key={`${pais}-${r.uf}`} className="border-b border-border/30 hover:bg-accent/20 transition-colors duration-150">
                    <td className="px-5 py-2.5 text-foreground">
                      {i === 0 ? (
                        <span className="font-medium">{pais}</span>
                      ) : (
                        <span className="text-muted-foreground" style={{ paddingLeft: '1.25rem' }}>{r.uf}</span>
                      )}
                      {i === 0 && rows.length === 1 && r.uf && (
                        <span className="text-muted-foreground ml-2 text-xs">({r.uf})</span>
                      )}
                    </td>
                    <td className="text-right px-4 py-2.5 tabular-nums font-medium text-foreground">{formatCurrency(r.rAgg.receitaBrutaOperacional)}</td>
                    <td className="text-right px-4 py-2.5 tabular-nums text-muted-foreground">{formatCurrency(r.cAgg.receitaBrutaOperacional)}</td>
                    <td className={`text-right px-4 py-2.5 tabular-nums font-medium ${getDeltaColorClass(r.dp)}`}>{formatPct(r.dp)}</td>
                    <td className="text-right px-4 py-2.5 tabular-nums text-foreground">{formatQty(r.rAgg.quantidade)}</td>
                  </tr>
                ));
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
