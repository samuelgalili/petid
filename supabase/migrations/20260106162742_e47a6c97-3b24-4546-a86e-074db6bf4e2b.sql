-- Add birthdate column to profiles table for age verification
ALTER TABLE public.profiles ADD COLUMN birthdate DATE;

-- Add comment explaining the purpose
COMMENT ON COLUMN public.profiles.birthdate IS 'User birthdate for age verification - must be 13+ to use app, 18+ to purchase';