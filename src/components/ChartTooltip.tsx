import { formatCurrency } from '@/lib/format';

interface TooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
  valueFormatter?: (value: number, name: string) => string;
}

export function ChartTooltip({ active, payload, label, valueFormatter }: TooltipProps) {
  if (!active || !payload?.length) return null;

  const fmt = valueFormatter ?? ((v: number) => formatCurrency(v));

  return (
    <div className="bg-popover border border-border rounded-lg shadow-xl p-3 text-xs space-y-1.5">
      {label && <p className="font-semibold text-foreground">{label}</p>}
      {payload.map((entry: any, i: number) => (
        <div key={i} className="flex items-center gap-2">
          <span
            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: entry.color || entry.fill }}
          />
          <span className="text-muted-foreground">{entry.name}</span>
          <span className="font-medium text-foreground ml-auto tabular-nums">
            {typeof entry.value === 'number' ? fmt(entry.value, entry.name) : entry.value}
          </span>
        </div>
      ))}
    </div>
  );
}
