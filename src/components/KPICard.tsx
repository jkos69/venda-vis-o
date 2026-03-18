import { formatPct, getDeltaColorClass, formatDeltaCurrency } from '@/lib/format';

interface KPICardProps {
  title: string;
  value: string;
  compValue: string;
  compLabel: string;
  delta: number | null;
  deltaR?: number;
  invert?: boolean;
}

export function KPICard({ title, value, compValue, compLabel, delta, deltaR, invert = false }: KPICardProps) {
  return (
    <div className="bg-surface p-5 rounded-xl shadow-layered">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
        {title}
      </p>
      <div className="flex items-baseline gap-2 mt-2">
        <h2 className="text-2xl font-semibold tabular-nums text-foreground tracking-tight">
          {value}
        </h2>
        <span className={`text-sm font-semibold tabular-nums ${getDeltaColorClass(delta, invert)}`}>
          {formatPct(delta)}
        </span>
      </div>
      <div className="flex items-center gap-2 mt-1">
        <p className="text-xs text-muted-foreground/60">
          {compLabel}: {compValue}
        </p>
        {deltaR != null && (
          <span className={`text-xs tabular-nums ${getDeltaColorClass(deltaR, invert)}`}>
            {formatDeltaCurrency(deltaR)}
          </span>
        )}
      </div>
    </div>
  );
}
