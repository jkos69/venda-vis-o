import { useStore, useFilteredData } from '@/store/useStore';
import { formatCurrency, formatPct, formatQty, getDeltaColorClass, formatDeltaCurrency } from '@/lib/format';
import { aggregate, receitaLiquida, receitaLiquidaProdutos, totalImpostos, deltaPercent, filterByBase } from '@/lib/aggregations';
import { GlobalFilters } from '@/components/GlobalFilters';
import { KPICard } from '@/components/KPICard';
import { useNavigate } from 'react-router-dom';
import { Upload } from 'lucide-react';

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

  const real26 = aggregate(filterByBase(data, 'Real 26'));
  const orc26 = aggregate(filterByBase(data, 'Orç 26'));
  const real25 = aggregate(filterByBase(data, 'Real 25'));

  const compBase = filters.baseComparacao === 'orcamento' ? orc26 : real25;
  const compLabel = filters.baseComparacao === 'orcamento' ? 'Orç 26' : 'Real 25';

  const rlReal = receitaLiquida(real26);
  const rlComp = receitaLiquida(compBase);

  // P&L Rows
  const plRows = [
    {
      label: 'Quantidade',
      real: real26.quantidade,
      comp: compBase.quantidade,
      real25v: real25.quantidade,
      format: 'qty' as const,
      invert: false,
      isBold: false,
    },
    {
      label: 'Receita Bruta Operacional',
      real: real26.receitaBrutaOperacional,
      comp: compBase.receitaBrutaOperacional,
      real25v: real25.receitaBrutaOperacional,
      format: 'currency' as const,
      invert: false,
      isBold: true,
    },
    {
      label: '  Receita Bruta com Produtos',
      real: real26.receitaBrutaProdutos,
      comp: compBase.receitaBrutaProdutos,
      real25v: real25.receitaBrutaProdutos,
      format: 'currency' as const,
      invert: false,
      isBold: false,
    },
    {
      label: '  Outras Receitas',
      real: real26.receitaBrutaOutrasReceitas,
      comp: compBase.receitaBrutaOutrasReceitas,
      real25v: real25.receitaBrutaOutrasReceitas,
      format: 'currency' as const,
      invert: false,
      isBold: false,
    },
    {
      label: '(-) Devoluções de Vendas',
      real: -Math.abs(real26.devolucao),
      comp: -Math.abs(compBase.devolucao),
      real25v: -Math.abs(real25.devolucao),
      format: 'currency' as const,
      invert: true,
      isBold: false,
    },
    {
      label: '(-) Impostos',
      real: -totalImpostos(real26),
      comp: -totalImpostos(compBase),
      real25v: -totalImpostos(real25),
      format: 'currency' as const,
      invert: true,
      isBold: false,
    },
    {
      label: 'Receita Operacional Líquida',
      real: rlReal,
      comp: rlComp,
      real25v: receitaLiquida(real25),
      format: 'currency' as const,
      invert: false,
      isBold: true,
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground tracking-tight">
          Performance Comercial — Consolidado 2026
        </h1>
      </div>

      <GlobalFilters />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KPICard
          title="Receita Bruta Operacional"
          value={formatCurrency(real26.receitaBrutaOperacional)}
          compValue={formatCurrency(compBase.receitaBrutaOperacional)}
          compLabel={compLabel}
          delta={deltaPercent(real26.receitaBrutaOperacional, compBase.receitaBrutaOperacional)}
          deltaR={real26.receitaBrutaOperacional - compBase.receitaBrutaOperacional}
        />
        <KPICard
          title="Quantidade"
          value={formatQty(real26.quantidade)}
          compValue={formatQty(compBase.quantidade)}
          compLabel={compLabel}
          delta={deltaPercent(real26.quantidade, compBase.quantidade)}
        />
        <KPICard
          title="Receita Líquida"
          value={formatCurrency(rlReal)}
          compValue={formatCurrency(rlComp)}
          compLabel={compLabel}
          delta={deltaPercent(rlReal, rlComp)}
          deltaR={rlReal - rlComp}
        />
        <KPICard
          title="Devoluções"
          value={formatCurrency(Math.abs(real26.devolucao))}
          compValue={formatCurrency(Math.abs(compBase.devolucao))}
          compLabel={compLabel}
          delta={deltaPercent(Math.abs(real26.devolucao), Math.abs(compBase.devolucao))}
          invert
        />
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
                      {row.format === 'qty' ? formatQty(row.real) : formatCurrency(row.real)}
                    </td>
                    <td className="text-right px-4 py-2.5 tabular-nums text-muted-foreground">
                      {row.format === 'qty' ? formatQty(row.comp) : formatCurrency(row.comp)}
                    </td>
                    <td className={`text-right px-4 py-2.5 tabular-nums font-medium ${getDeltaColorClass(dp, row.invert)}`}>
                      {formatPct(dp)}
                    </td>
                    <td className={`text-right px-4 py-2.5 tabular-nums ${getDeltaColorClass(dr, row.invert)}`}>
                      {row.format === 'qty' ? formatQty(dr) : formatDeltaCurrency(dr)}
                    </td>
                    {filters.baseComparacao === 'orcamento' && (
                      <>
                        <td className="text-right px-4 py-2.5 tabular-nums text-muted-foreground">
                          {row.format === 'qty' ? formatQty(row.real25v) : formatCurrency(row.real25v)}
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
      </div>
    </div>
  );
}
