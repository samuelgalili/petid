-- Add bio field to profiles table for Instagram-like biography
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bio TEXT;