import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useStore } from '@/store/useStore';
import type { RawDataRow, UploadMeta } from '@/types/data';

const CHUNK_SIZE = 1000;

export function useSupabaseData() {
  const setData = useStore((s) => s.setData);
  const setLoading = useStore((s) => s.setLoading);
  const data = useStore((s) => s.data);

  useEffect(() => {
    if (data.length > 0) return;

    (async () => {
      setLoading(true);
      try {
        const { data: allData, meta } = await loadLatestUploadFromSupabase();
        if (allData.length > 0 && meta) {
          setData(allData, meta);
        }
      } catch (e) {
        console.error('[OdontoBI] Erro ao carregar dados do banco:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);
}

export async function loadLatestUploadFromSupabase(): Promise<{
  data: RawDataRow[];
  meta: UploadMeta | null;
}> {
  // Pega o session_id mais recente
  const { data: latest, error: latestErr } = await supabase
    .from('uploads')
    .select('session_id, filename, row_count, sheet_name, uploaded_at')
    .order('uploaded_at', { ascending: false })
    .limit(1)
    .single();

  if (latestErr || !latest) return { data: [], meta: null };

  // Busca todos os chunks dessa sessão ordenados
  const { data: chunks, error } = await supabase
    .from('uploads')
    .select('chunk_index, data')
    .eq('session_id', (latest as any).session_id)
    .order('chunk_index', { ascending: true });

  if (error || !chunks) return { data: [], meta: null };

  const allData: RawDataRow[] = chunks.flatMap((c: any) => c.data as RawDataRow[]);

  const meta: UploadMeta = {
    fileName: (latest as any).filename,
    rowCount: (latest as any).row_count,
    sheetName: (latest as any).sheet_name ?? 'Base de Dados',
    uploadedAt: new Date((latest as any).uploaded_at),
  };

  return { data: allData, meta };
}

export async function saveUploadToSupabase(
  data: RawDataRow[],
  meta: UploadMeta,
  onProgress?: (percent: number) => void
): Promise<{ error: string | null }> {
  const sessionId = crypto.randomUUID();
  const chunks: RawDataRow[][] = [];

  for (let i = 0; i < data.length; i += CHUNK_SIZE) {
    chunks.push(data.slice(i, i + CHUNK_SIZE));
  }

  // Deleta sessões anteriores
  await supabase.from('uploads').delete().gte('chunk_index', 0);

  // Salva sequencialmente com progresso
  for (let i = 0; i < chunks.length; i++) {
    const { error } = await supabase.from('uploads').insert([{
      session_id: sessionId,
      chunk_index: i,
      total_chunks: chunks.length,
      filename: meta.fileName,
      row_count: meta.rowCount,
      sheet_name: meta.sheetName,
      data: chunks[i] as unknown as Record<string, unknown>[],
    }] as any);

    if (error) return { error: `Chunk ${i + 1}/${chunks.length}: ${error.message}` };

    onProgress?.(Math.round(((i + 1) / chunks.length) * 100));
  }

  return { error: null };
}

export async function clearSupabaseUploads(): Promise<void> {
  await supabase.from('uploads').delete().gte('chunk_index', 0);
}
