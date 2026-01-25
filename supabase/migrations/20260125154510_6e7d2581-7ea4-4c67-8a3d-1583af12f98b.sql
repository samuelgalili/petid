-- Create pet_service_documents table for documents in each category
CREATE TABLE public.pet_service_documents (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    pet_id UUID REFERENCES public.pets(id) ON DELETE CASCADE,
    category TEXT NOT NULL CHECK (category IN ('insurance', 'training', 'grooming', 'boarding', 'food', 'health')),
    document_name TEXT NOT NULL,
    document_url TEXT NOT NULL,
    document_type TEXT, -- pdf, image, etc
    file_size INTEGER,
    notes TEXT,
    expiry_date DATE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pet_service_documents ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own documents" 
ON public.pet_service_documents 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own documents" 
ON public.pet_service_documents 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own documents" 
ON public.pet_service_documents 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own documents" 
ON public.pet_service_documents 
FOR DELETE 
USING (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_pet_service_documents_updated_at
    BEFORE UPDATE ON public.pet_service_documents
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();