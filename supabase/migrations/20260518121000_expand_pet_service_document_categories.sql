-- The pet vault UI stores these categories directly.
ALTER TABLE public.pet_service_documents
DROP CONSTRAINT IF EXISTS pet_service_documents_category_check;

ALTER TABLE public.pet_service_documents
ADD CONSTRAINT pet_service_documents_category_check
CHECK (
  category IN (
    'insurance',
    'training',
    'grooming',
    'boarding',
    'food',
    'health',
    'medical',
    'vaccination',
    'invoice',
    'general'
  )
);
