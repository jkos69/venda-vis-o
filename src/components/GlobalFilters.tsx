import { useStore } from '@/store/useStore';

export function GlobalFilters() {
  const filters = useStore((s) => s.filters);
  const setFilter = useStore((s) => s.setFilter);
  const uniqueValues = useStore((s) => s.uniqueValues);
  const data = useStore((s) => s.data);

  if (data.length === 0) return null;

  const bus = uniqueValues('bu');
  const segmentos = uniqueValues('segmento');
  const familias = uniqueValues('familia');
  const paises = uniqueValues('pais');
  const ufs = uniqueValues('uf');
  const mercados = uniqueValues('mercado');

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Mês */}
      <select
        value={String(filters.mes)}
        onChange={(e) => setFilter('mes', e.target.value === 'acumulado' ? 'acumulado' : Number(e.target.value))}
        className="bg-surface text-foreground text-xs border border-border rounded-lg px-3 py-2 focus:ring-1 focus:ring-primary outline-none"
      >
        <option value="acumulado">Acumulado</option>
        {Array.from({ length: 12 }, (_, i) => (
          <option key={i + 1} value={i + 1}>Mês {String(i + 1).padStart(2, '0')}</option>
        ))}
      </select>

      {/* Base Comparação */}
      <select
        value={filters.baseComparacao}
        onChange={(e) => setFilter('baseComparacao', e.target.value as any)}
        className="bg-surface text-foreground text-xs border border-border rounded-lg px-3 py-2 focus:ring-1 focus:ring-primary outline-none"
      >
        <option value="orcamento">Real vs Orçamento</option>
        <option value="anoAnterior">Real vs Ano Anterior</option>
      </select>

      {/* Multi-selects */}
      <MultiSelect label="BU" values={bus} selected={filters.bus} onChange={(v) => setFilter('bus', v)} />
      <MultiSelect label="Segmento" values={segmentos} selected={filters.segmentos} onChange={(v) => setFilter('segmentos', v)} />
      <MultiSelect label="Família" values={familias} selected={filters.familias} onChange={(v) => setFilter('familias', v)} />
      <MultiSelect label="País" values={paises} selected={filters.paises} onChange={(v) => setFilter('paises', v)} />
      <MultiSelect label="UF" values={ufs} selected={filters.ufs} onChange={(v) => setFilter('ufs', v)} />
      <MultiSelect label="Mercado" values={mercados} selected={filters.mercados} onChange={(v) => setFilter('mercados', v)} />
    </div>
  );
}

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
  if (values.length === 0) return null;

  return (
    <div className="relative group">
      <button className="bg-surface text-xs border border-border rounded-lg px-3 py-2 text-muted-foreground hover:text-foreground hover:border-muted-foreground/30 transition-colors duration-150 flex items-center gap-1">
        {label}
        {selected.length > 0 && (
          <span className="bg-primary text-primary-foreground text-[10px] font-semibold rounded-full px-1.5 min-w-[18px] text-center">
            {selected.length}
          </span>
        )}
      </button>
      <div className="absolute z-50 top-full left-0 mt-1 bg-surface border border-border rounded-lg shadow-lg py-1 hidden group-hover:block max-h-48 overflow-y-auto min-w-[180px]">
        {selected.length > 0 && (
          <button
            onClick={() => onChange([])}
            className="w-full text-left px-3 py-1.5 text-xs text-primary hover:bg-accent transition-colors duration-150"
          >
            Limpar filtro
          </button>
        )}
        {values.map((v) => (
          <label
            key={v}
            className="flex items-center gap-2 px-3 py-1.5 text-xs text-foreground hover:bg-accent cursor-pointer transition-colors duration-150"
          >
            <input
              type="checkbox"
              checked={selected.includes(v)}
              onChange={() => {
                onChange(
                  selected.includes(v) ? selected.filter((s) => s !== v) : [...selected, v]
                );
              }}
              className="rounded border-border"
            />
            <span className="truncate">{v}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
