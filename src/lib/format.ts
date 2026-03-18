const currencyFmt = new Intl.NumberFormat('pt-BR', {
  style: 'decimal',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const currencyFmtFull = new Intl.NumberFormat('pt-BR', {
  style: 'decimal',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const pctFmt = new Intl.NumberFormat('pt-BR', {
  style: 'decimal',
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const qtyFmt = new Intl.NumberFormat('pt-BR', {
  style: 'decimal',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export function formatCurrency(value: number, full = false): string {
  if (value < 0) {
    return `(R$ ${full ? currencyFmtFull.format(Math.abs(value)) : currencyFmt.format(Math.abs(value))})`;
  }
  return `R$ ${full ? currencyFmtFull.format(value) : currencyFmt.format(value)}`;
}

export function formatPct(value: number | null | undefined): string {
  if (value == null || !isFinite(value)) return '—';
  const sign = value > 0 ? '+' : '';
  return `${sign}${pctFmt.format(value * 100)}%`;
}

export function formatQty(value: number): string {
  return qtyFmt.format(value);
}

export function formatDeltaCurrency(value: number): string {
  if (value < 0) {
    return `(R$ ${currencyFmt.format(Math.abs(value))})`;
  }
  return `R$ ${currencyFmt.format(value)}`;
}

export type DeltaColor = 'success' | 'destructive' | 'muted';

// For revenue: positive = good. For costs/returns: positive = bad
export function getDeltaColor(value: number | null | undefined, invert = false): DeltaColor {
  if (value == null || !isFinite(value) || value === 0) return 'muted';
  const isPositive = value > 0;
  if (invert) return isPositive ? 'destructive' : 'success';
  return isPositive ? 'success' : 'destructive';
}

export function getDeltaColorClass(value: number | null | undefined, invert = false): string {
  const color = getDeltaColor(value, invert);
  if (color === 'success') return 'text-success';
  if (color === 'destructive') return 'text-destructive';
  return 'text-muted-foreground';
}
