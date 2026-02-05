-- Create enum for data types
DO $$ BEGIN
    CREATE TYPE admin_data_type AS ENUM ('breeds', 'insurance', 'dog_parks', 'research');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create admin_data_sources table
CREATE TABLE IF NOT EXISTS public.admin_data_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    data_type admin_data_type NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    file_url TEXT,
    file_name TEXT,
    file_size INTEGER,
    file_type TEXT,
    extracted_data JSONB DEFAULT '{}',
    is_processed BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.admin_data_sources ENABLE ROW LEVEL SECURITY;

-- Admin can do everything
CREATE POLICY "Admins can manage data sources"
ON public.admin_data_sources
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Authenticated users can read active processed data
CREATE POLICY "Users can read active data"
ON public.admin_data_sources
FOR SELECT
TO authenticated
USING (is_active = true AND is_processed = true);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION public.update_admin_data_sources_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_admin_data_sources_updated_at
    BEFORE UPDATE ON public.admin_data_sources
    FOR EACH ROW
    EXECUTE FUNCTION public.update_admin_data_sources_updated_at();

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_admin_data_sources_type ON public.admin_data_sources(data_type);
CREATE INDEX IF NOT EXISTS idx_admin_data_sources_active ON public.admin_data_sources(is_active, is_processed);