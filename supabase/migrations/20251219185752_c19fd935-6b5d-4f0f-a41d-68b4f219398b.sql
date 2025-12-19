-- Add 'shelter' to the business_type enum
ALTER TYPE public.business_type ADD VALUE IF NOT EXISTS 'shelter';