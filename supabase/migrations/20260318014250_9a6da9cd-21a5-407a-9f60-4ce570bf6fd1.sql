-- Tabela de uploads para persistir dados da planilha
CREATE TABLE IF NOT EXISTS public.uploads (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at   timestamptz NOT NULL DEFAULT now(),
  filename     text NOT NULL,
  row_count    int NOT NULL,
  sheet_name   text,
  data         jsonb NOT NULL
);

-- Índice para busca rápida pelo upload mais recente
CREATE INDEX IF NOT EXISTS uploads_created_at_idx ON public.uploads (created_at DESC);

-- RLS: permite acesso público (uso interno da empresa, sem autenticação)
ALTER TABLE public.uploads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all select" ON public.uploads FOR SELECT USING (true);
CREATE POLICY "Allow all insert" ON public.uploads FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all delete" ON public.uploads FOR DELETE USING (true);