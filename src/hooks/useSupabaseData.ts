import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useStore } from '@/store/useStore';
import type { RawDataRow, UploadMeta } from '@/types/data';

export function useSupabaseData() {
  const setData = useStore((s) => s.setData);
  const setLoading = useStore((s) => s.setLoading);
  const data = useStore((s) => s.data);

  // Ao montar o app, carrega o upload mais recente do banco
  useEffect(() => {
    // Se já tem dados em memória, não recarrega
    if (data.length > 0) return;

    (async () => {
      setLoading(true);
      try {
        const { data: rows, error } = await supabase
          .from('uploads')
          .select('id, filename, row_count, sheet_name, data, created_at')
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (error || !rows) return;

        const meta: UploadMeta = {
          fileName: rows.filename,
          rowCount: rows.row_count,
          sheetName: rows.sheet_name ?? 'Base de Dados',
          uploadedAt: new Date(rows.created_at),
        };
        setData(rows.data as unknown as RawDataRow[], meta);
      } catch (e) {
        console.error('[OdontoBI] Erro ao carregar dados do banco:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);
}

export async function saveUploadToSupabase(
  data: RawDataRow[],
  meta: UploadMeta
): Promise<{ error: string | null }> {
  const { error } = await supabase.from('uploads').insert([{
    filename: meta.fileName,
    row_count: meta.rowCount,
    sheet_name: meta.sheetName,
    data: data as unknown as Record<string, unknown>[],
  }] as any);

  return { error: error ? error.message : null };
}

export async function clearSupabaseUploads(): Promise<void> {
  await supabase.from('uploads').delete().neq('id', '00000000-0000-0000-0000-000000000000');
}
