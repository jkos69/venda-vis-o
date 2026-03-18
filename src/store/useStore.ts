import { create } from 'zustand';
import type { RawDataRow, FilterState, UploadMeta } from '@/types/data';

interface AppState {
  data: RawDataRow[];
  uploadMeta: UploadMeta | null;
  isLoading: boolean;
  filters: FilterState;
  setData: (data: RawDataRow[], meta: UploadMeta) => void;
  clearData: () => void;
  setLoading: (v: boolean) => void;
  setFilter: <K extends keyof FilterState>(key: K, value: FilterState[K]) => void;
  resetFilters: () => void;
}

const defaultFilters: FilterState = {
  mes: 'acumulado',
  baseComparacao: 'orcamento',
  bus: [],
  segmentos: [],
  familias: [],
  paises: [],
  ufs: [],
  mercados: [],
};

export const useStore = create<AppState>((set) => ({
  data: [],
  uploadMeta: null,
  isLoading: false,
  filters: { ...defaultFilters },

  setData: (data, meta) => set({ data, uploadMeta: meta }),

  clearData: () => set({ data: [], uploadMeta: null, filters: { ...defaultFilters } }),

  setLoading: (isLoading) => set({ isLoading }),

  setFilter: (key, value) =>
    set((state) => ({ filters: { ...state.filters, [key]: value } })),

  resetFilters: () => set({ filters: { ...defaultFilters } }),
}));

// Derived selectors
export function useFilteredData(): RawDataRow[] {
  const data = useStore((s) => s.data);
  const filters = useStore((s) => s.filters);

  const norm = (s: string) => s?.toLowerCase().trim() ?? '';

  return data.filter((row) => {
    if (filters.mes !== 'acumulado' && row.mes !== filters.mes) return false;
    if (filters.bus.length && !filters.bus.some(f => norm(f) === norm(row.bu))) return false;
    if (filters.segmentos.length && !filters.segmentos.some(f => norm(f) === norm(row.segmento))) return false;
    if (filters.familias.length && !filters.familias.some(f => norm(f) === norm(row.familia))) return false;
    if (filters.paises.length && !filters.paises.some(f => norm(f) === norm(row.pais))) return false;
    if (filters.ufs.length && !filters.ufs.some(f => norm(f) === norm(row.uf))) return false;
    if (filters.mercados.length && !filters.mercados.some(f => norm(f) === norm(row.mercado))) return false;
    return true;
  });
}

function toTitleCase(str: string): string {
  if (!str || str.trim() === '') return str;
  return str.toLowerCase().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

export function useUniqueValues(field: keyof RawDataRow): string[] {
  const data = useStore((s) => s.data);

  const normalize = (v: string) => {
    if (!v || v.trim() === '') return '';
    if (field === 'uf') return v.trim().toUpperCase();
    if (field === 'pais' || field === 'base' || field === 'codCliente') return v.trim();
    return toTitleCase(v.trim());
  };

  const seen = new Set<string>();
  const result: string[] = [];
  for (const r of data) {
    const raw = String(r[field] ?? '');
    if (!raw || raw === 'undefined') continue;
    const key = normalize(raw);
    if (key && !seen.has(key)) { seen.add(key); result.push(key); }
  }
  return result.sort();
}
