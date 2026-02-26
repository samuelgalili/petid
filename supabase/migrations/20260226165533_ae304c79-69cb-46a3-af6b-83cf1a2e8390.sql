
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

-- Document chunks table for RAG
CREATE TABLE public.document_chunks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source_id UUID REFERENCES public.admin_data_sources(id) ON DELETE CASCADE,
  document_title TEXT NOT NULL,
  section_title TEXT,
  chunk_index INTEGER NOT NULL DEFAULT 0,
  content TEXT NOT NULL,
  token_count INTEGER,
  page_number INTEGER,
  keywords TEXT[] DEFAULT '{}',
  summary TEXT,
  detected_language TEXT DEFAULT 'he',
  embedding vector(768),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for vector similarity search
CREATE INDEX idx_document_chunks_embedding ON public.document_chunks 
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Index for filtering by source
CREATE INDEX idx_document_chunks_source_id ON public.document_chunks(source_id);

-- RPC function for semantic search
CREATE OR REPLACE FUNCTION public.match_documents(
  query_embedding vector(768),
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 10,
  filter_source_ids UUID[] DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  source_id UUID,
  document_title TEXT,
  section_title TEXT,
  content TEXT,
  summary TEXT,
  keywords TEXT[],
  similarity FLOAT,
  metadata JSONB
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    dc.id,
    dc.source_id,
    dc.document_title,
    dc.section_title,
    dc.content,
    dc.summary,
    dc.keywords,
    1 - (dc.embedding <=> query_embedding) AS similarity,
    dc.metadata
  FROM public.document_chunks dc
  WHERE 
    dc.embedding IS NOT NULL
    AND 1 - (dc.embedding <=> query_embedding) > match_threshold
    AND (filter_source_ids IS NULL OR dc.source_id = ANY(filter_source_ids))
  ORDER BY dc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Processing report table
CREATE TABLE public.document_processing_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source_id UUID REFERENCES public.admin_data_sources(id) ON DELETE CASCADE,
  total_pages INTEGER DEFAULT 0,
  total_chunks INTEGER DEFAULT 0,
  detected_language TEXT DEFAULT 'he',
  ocr_applied BOOLEAN DEFAULT false,
  processing_errors JSONB DEFAULT '[]',
  processing_duration_ms INTEGER,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS policies
ALTER TABLE public.document_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_processing_reports ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read chunks
CREATE POLICY "Authenticated users can read document chunks"
  ON public.document_chunks FOR SELECT
  TO authenticated
  USING (true);

-- Allow service role to manage chunks (via edge functions)
CREATE POLICY "Service role can manage document chunks"
  ON public.document_chunks FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can read processing reports"
  ON public.document_processing_reports FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Service role can manage processing reports"
  ON public.document_processing_reports FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
