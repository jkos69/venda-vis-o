-- Drop old table and recreate with chunked schema
DROP TABLE IF EXISTS public.uploads;

CREATE TABLE public.uploads (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id   uuid NOT NULL,
  chunk_index  int NOT NULL,
  total_chunks int NOT NULL,
  filename     text NOT NULL,
  row_count    int NOT NULL,
  sheet_name   text,
  uploaded_at  timestamptz NOT NULL DEFAULT now(),
  data         jsonb NOT NULL
);

CREATE INDEX uploads_session_idx ON public.uploads (session_id, chunk_index);
CREATE INDEX uploads_uploaded_at_idx ON public.uploads (uploaded_at DESC);

ALTER TABLE public.uploads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all select" ON public.uploads FOR SELECT USING (true);
CREATE POLICY "Allow all insert" ON public.uploads FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all delete" ON public.uploads FOR DELETE USING (true);