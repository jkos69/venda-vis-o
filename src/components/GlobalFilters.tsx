import { useState, useRef, useEffect, useMemo } from 'react';
import { useStore, useUniqueValues } from '@/store/useStore';

const NOMES_MESES = ['','Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

export function GlobalFilters() {
  const filters = useStore((s) => s.filters);
  const setFilter = useStore((s) => s.setFilter);
  const resetFilters = useStore((s) => s.resetFilters);
  const data = useStore((s) => s.data);

  const bus = useUniqueValues('bu');
  const segmentos = useUniqueValues('segmento');
  const familias = useUniqueValues('familia');
  const paises = useUniqueValues('pais');
  const ufs = useUniqueValues('uf');
  const mercados = useUniqueValues('mercado');

  const mesesDisponiveis = useMemo(() => {
    const real26 = data.filter(r =>
      r.base.toLowerCase().includes('real') && r.base.includes('26')
    );
    return Array.from(new Set(real26.map(r => r.mes)))
      .filter(m => m > 0)
      .sort((a, b) => a - b);
  }, [data]);

  const activeFilterCount = [
    filters.bus, filters.segmentos, filters.familias,
    filters.paises, filters.ufs, filters.mercados,
  ].reduce((acc, arr) => acc + (arr.length > 0 ? 1 : 0), 0)
    + (filters.mes !== 'acumulado' ? 1 : 0);

  if (data.length === 0) return null;

  const mesOptions = [
    { value: 'acumulado', label: 'Acumulado' },
    ...mesesDisponiveis.map(m => ({ value: String(m), label: `${NOMES_MESES[m]}/26` })),
  ];

  const baseOptions = [
    { value: 'orcamento', label: 'Real vs Orçamento' },
    { value: 'anoAnterior', label: 'Real vs Ano Anterior' },
  ];

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {/* Base Comparação — Toggle Buttons */}
        <div className="flex items-center rounded-lg border border-border overflow-hidden">
          {baseOptions.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setFilter('baseComparacao', opt.value as any)}
              className={`px-3 py-2 text-xs font-medium transition-colors duration-150 ${
                filters.baseComparacao === opt.value
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-surface text-muted-foreground hover:text-foreground hover:bg-accent/30'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className="w-px h-6 bg-border mx-1" />

        {/* Mês */}
        <SingleSelect
          label="Período"
          options={mesOptions}
          value={String(filters.mes)}
          onChange={(v) => setFilter('mes', v === 'acumulado' ? 'acumulado' : Number(v))}
        />

        <div className="w-px h-6 bg-border mx-1" />

        {/* Multi-selects */}
        <MultiSelect label="BU" values={bus} selected={filters.bus} onChange={(v) => setFilter('bus', v)} />
        <MultiSelect label="Segmento" values={segmentos} selected={filters.segmentos} onChange={(v) => setFilter('segmentos', v)} />
        <MultiSelect label="Família" values={familias} selected={filters.familias} onChange={(v) => setFilter('familias', v)} />
        <MultiSelect label="País" values={paises} selected={filters.paises} onChange={(v) => setFilter('paises', v)} />
        <MultiSelect label="UF" values={ufs} selected={filters.ufs} onChange={(v) => setFilter('ufs', v)} />
        <MultiSelect label="Mercado" values={mercados} selected={filters.mercados} onChange={(v) => setFilter('mercados', v)} />

        {activeFilterCount > 0 && (
          <button
            onClick={resetFilters}
            className="text-[11px] text-muted-foreground hover:text-destructive transition-colors duration-150 ml-1 flex items-center gap-1"
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
            {activeFilterCount} filtro{activeFilterCount > 1 ? 's' : ''} ativo{activeFilterCount > 1 ? 's' : ''}
          </button>
        )}
      </div>
    </div>
  );
}

/* ── SingleSelect ───────────────────────────────────────── */

function SingleSelect({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const escHandler = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', handler);
    document.addEventListener('keydown', escHandler);
    return () => { document.removeEventListener('mousedown', handler); document.removeEventListener('keydown', escHandler); };
  }, [open]);

  const current = options.find(o => o.value === value);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`bg-surface text-xs border rounded-lg px-3 py-2 flex items-center gap-1.5 transition-colors duration-150 ${
          open ? 'border-primary text-foreground' : 'border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground/50'
        }`}
      >
        <span className="text-muted-foreground/70">{label}:</span>
        <span className="font-medium text-foreground">{current?.label ?? value}</span>
        <Chevron open={open} />
      </button>
      {open && (
        <div className="absolute z-[100] top-full left-0 mt-1 bg-popover border border-border rounded-lg shadow-xl py-1 min-w-[180px]">
          {options.map(o => (
            <button
              key={o.value}
              type="button"
              onClick={() => { onChange(o.value); setOpen(false); }}
              className={`w-full text-left px-3 py-2 text-xs transition-colors duration-100 ${
                o.value === value ? 'bg-accent text-foreground font-medium' : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── MultiSelect ────────────────────────────────────────── */

function MultiSelect({
  label,
  values,
  selected,
  onChange,
}: {
  label: string;
  values: string[];
  selected: string[];
  onChange: (v: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const escHandler = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', handler);
    document.addEventListener('keydown', escHandler);
    return () => { document.removeEventListener('mousedown', handler); document.removeEventListener('keydown', escHandler); };
  }, [open]);

  if (values.length === 0) return null;

  const allSelected = selected.length === values.length;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`bg-surface text-xs border rounded-lg px-3 py-2 flex items-center gap-1.5 transition-colors duration-150 ${
          open ? 'border-primary text-foreground' : 'border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground/50'
        }`}
      >
        <span>{label}</span>
        {selected.length > 0 && (
          <span className="bg-primary text-primary-foreground text-[10px] font-semibold rounded-full px-1.5 min-w-[18px] text-center leading-5">
            {selected.length}
          </span>
        )}
        <Chevron open={open} />
      </button>
      {open && (
        <div className="absolute z-[100] top-full left-0 mt-1 bg-popover border border-border rounded-lg shadow-xl py-1 min-w-[200px] max-h-64 overflow-y-auto">
          <div className="flex justify-between px-3 py-1.5 border-b border-border mb-1">
            <button
              type="button"
              onClick={() => onChange(allSelected ? [] : [...values])}
              className="text-[10px] text-primary hover:underline"
            >
              {allSelected ? 'Desmarcar todos' : 'Selecionar todos'}
            </button>
            {selected.length > 0 && (
              <button
                type="button"
                onClick={() => onChange([])}
                className="text-[10px] text-muted-foreground hover:text-destructive hover:underline"
              >
                Limpar
              </button>
            )}
          </div>
          {values.map((v) => {
            const checked = selected.includes(v);
            return (
              <label
                key={v}
                className="flex items-center gap-2.5 px-3 py-2 text-xs cursor-pointer hover:bg-accent transition-colors duration-100"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => onChange(checked ? selected.filter(s => s !== v) : [...selected, v])}
                  className="rounded border-border accent-primary w-3.5 h-3.5 flex-shrink-0"
                />
                <span className="truncate text-foreground">{v}</span>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ── Chevron icon ───────────────────────────────────────── */

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      className={`w-3 h-3 transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
      fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  );
}