-- Step 1: Add new enum values only
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'moderator';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'business';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'org';