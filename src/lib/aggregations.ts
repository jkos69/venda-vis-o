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
