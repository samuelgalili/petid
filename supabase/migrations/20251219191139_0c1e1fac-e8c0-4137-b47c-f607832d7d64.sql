-- Add privacy settings columns to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS location_blur_enabled boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS profile_visibility text DEFAULT 'public' CHECK (profile_visibility IN ('public', 'followers', 'private')),
ADD COLUMN IF NOT EXISTS show_location boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS show_email boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS allow_messages_from text DEFAULT 'followers' CHECK (allow_messages_from IN ('everyone', 'followers', 'nobody'));

-- Add favorite_breeds column to profiles for onboarding
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS favorite_breeds text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS interests text[] DEFAULT '{}';