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

  return data.filter((row) => {
    if (filters.mes !== 'acumulado' && row.mes !== filters.mes) return false;
    if (filters.bus.length && !filters.bus.includes(row.bu)) return false;
    if (filters.segmentos.length && !filters.segmentos.includes(row.segmento)) return false;
    if (filters.familias.length && !filters.familias.includes(row.familia)) return false;
    if (filters.paises.length && !filters.paises.includes(row.pais)) return false;
    if (filters.ufs.length && !filters.ufs.includes(row.uf)) return false;
    if (filters.mercados.length && !filters.mercados.includes(row.mercado)) return false;
    return true;
  });
}

export function useUniqueValues(field: keyof RawDataRow): string[] {
  const data = useStore((s) => s.data);
  const vals = new Set(data.map((r) => String(r[field])).filter(Boolean));
  return Array.from(vals).sort();
}
