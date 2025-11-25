-- Add points column to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS points INTEGER NOT NULL DEFAULT 0;