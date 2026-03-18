import type { RawDataRow } from '@/types/data';

export interface AggregatedMetrics {
  quantidade: number;
  receitaBrutaProdutos: number;
  receitaBrutaOutrasReceitas: number;
  receitaBrutaOperacional: number;
  devolucao: number;
  impostosSemST: number;
  icms: number;
  icmsST: number;
  valorFrete: number;
  valorSeguro: number;
  outrasDespesas: number;
  valorDespesas: number;
}

export function aggregate(rows: RawDataRow[]): AggregatedMetrics {
  return rows.reduce(
    (acc, r) => ({
      quantidade: acc.quantidade + r.quantidade,
      receitaBrutaProdutos: acc.receitaBrutaProdutos + r.receitaBrutaProdutos,
      receitaBrutaOutrasReceitas: acc.receitaBrutaOutrasReceitas + r.receitaBrutaOutrasReceitas,
      receitaBrutaOperacional: acc.receitaBrutaOperacional + r.receitaBrutaOperacional,
      devolucao: acc.devolucao + r.devolucao,
      impostosSemST: acc.impostosSemST + r.impostosSemST,
      icms: acc.icms + r.icms,
      icmsST: acc.icmsST + r.icmsST,
      valorFrete: acc.valorFrete + r.valorFrete,
      valorSeguro: acc.valorSeguro + r.valorSeguro,
      outrasDespesas: acc.outrasDespesas + r.outrasDespesas,
      valorDespesas: acc.valorDespesas + r.valorDespesas,
    }),
    {
      quantidade: 0,
      receitaBrutaProdutos: 0,
      receitaBrutaOutrasReceitas: 0,
      receitaBrutaOperacional: 0,
      devolucao: 0,
      impostosSemST: 0,
      icms: 0,
      icmsST: 0,
      valorFrete: 0,
      valorSeguro: 0,
      outrasDespesas: 0,
      valorDespesas: 0,
    }
  );
}

export function receitaLiquida(m: AggregatedMetrics): number {
  return m.receitaBrutaOperacional - Math.abs(m.devolucao) - Math.abs(m.impostosSemST) - Math.abs(m.icms) - Math.abs(m.icmsST);
}

export function receitaLiquidaProdutos(m: AggregatedMetrics): number {
  return m.receitaBrutaProdutos - Math.abs(m.devolucao) - Math.abs(m.impostosSemST) - Math.abs(m.icms) - Math.abs(m.icmsST);
}

export function totalImpostos(m: AggregatedMetrics): number {
  return Math.abs(m.impostosSemST) + Math.abs(m.icms) + Math.abs(m.icmsST);
}

export function deltaPercent(real: number, base: number): number | null {
  if (base === 0) return null;
  return (real - base) / Math.abs(base);
}

export function filterByBase(data: RawDataRow[], base: string): RawDataRow[] {
  return data.filter((r) => r.base.toLowerCase().includes(base.toLowerCase()));
}

export function groupBy<T>(arr: T[], keyFn: (item: T) => string): Record<string, T[]> {
  const result: Record<string, T[]> = {};
  for (const item of arr) {
    const key = keyFn(item);
    if (!result[key]) result[key] = [];
    result[key].push(item);
  }
  return result;
}

/**
 * Retorna o conjunto de meses que têm dados reais (base contendo 'real' e '26').
 */
export function getMesesComDadosReais(data: RawDataRow[]): Set<number> {
  const real26 = data.filter(r =>
    r.base.toLowerCase().includes('real') && r.base.includes('26')
  );
  return new Set(real26.map(r => r.mes).filter(m => m > 0));
}

/**
 * Filtra dados para incluir APENAS os meses que existem no Real 26.
 */
export function filtrarPelosMesesDoReal(
  data: RawDataRow[],
  mesesDoReal: Set<number>
): RawDataRow[] {
  if (mesesDoReal.size === 0) return data;
  return data.filter(r => mesesDoReal.has(r.mes));
}
