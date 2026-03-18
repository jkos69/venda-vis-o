import { create } from 'zustand';
import type { RawDataRow, FilterState, UploadMeta } from '@/types/data';

interface AppState {
  data: RawDataRow[];
  uploadMeta: UploadMeta | null;
  filters: FilterState;
  setData: (data: RawDataRow[], meta: UploadMeta) => void;
  setFilter: <K extends keyof FilterState>(key: K, value: FilterState[K]) => void;
  resetFilters: () => void;
  // Derived unique values
  uniqueValues: (field: keyof RawDataRow) => string[];
  // Filtered data helper
  filteredData: () => RawDataRow[];
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

export const useStore = create<AppState>((set, get) => ({
  data: [],
  uploadMeta: null,
  filters: { ...defaultFilters },

  setData: (data, meta) => set({ data, uploadMeta: meta }),

  setFilter: (key, value) =>
    set((state) => ({ filters: { ...state.filters, [key]: value } })),

  resetFilters: () => set({ filters: { ...defaultFilters } }),

  uniqueValues: (field) => {
    const vals = new Set(get().data.map((r) => String(r[field])).filter(Boolean));
    return Array.from(vals).sort();
  },

  filteredData: () => {
    const { data, filters } = get();
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
  },
}));
