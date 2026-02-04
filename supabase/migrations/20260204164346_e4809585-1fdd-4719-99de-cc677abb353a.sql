-- Table to store extracted data from documents
CREATE TABLE public.pet_document_extracted_data (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    document_id UUID REFERENCES public.pet_service_documents(id) ON DELETE CASCADE NOT NULL,
    pet_id UUID REFERENCES public.pets(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    
    -- Health & Chip data
    chip_number TEXT,
    vaccination_type TEXT,
    vaccination_date DATE,
    vaccination_expiry DATE,
    vet_name TEXT,
    vet_clinic TEXT,
    treatment_type TEXT,
    treatment_date DATE,
    diagnosis TEXT,
    medications TEXT[],
    
    -- Financial data
    total_cost DECIMAL(10,2),
    currency TEXT DEFAULT 'ILS',
    payment_method TEXT,
    invoice_number TEXT,
    
    -- Provider info
    provider_name TEXT,
    provider_type TEXT, -- vet, municipality, groomer, trainer, etc.
    provider_phone TEXT,
    provider_address TEXT,
    
    -- Raw extraction
    raw_extracted_data JSONB,
    extraction_confidence DECIMAL(3,2), -- 0.00 to 1.00
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pet_document_extracted_data ENABLE ROW LEVEL SECURITY;

-- Policies - users can view their own data
CREATE POLICY "Users can view their own extracted data"
ON public.pet_document_extracted_data FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own extracted data"
ON public.pet_document_extracted_data FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own extracted data"
ON public.pet_document_extracted_data FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own extracted data"
ON public.pet_document_extracted_data FOR DELETE
USING (auth.uid() = user_id);

-- Admin policy using has_role function
CREATE POLICY "Admins can view all extracted data"
ON public.pet_document_extracted_data FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Trigger for updated_at
CREATE TRIGGER update_pet_document_extracted_data_updated_at
BEFORE UPDATE ON public.pet_document_extracted_data
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Index for faster lookups
CREATE INDEX idx_extracted_data_pet_id ON public.pet_document_extracted_data(pet_id);
CREATE INDEX idx_extracted_data_document_id ON public.pet_document_extracted_data(document_id);