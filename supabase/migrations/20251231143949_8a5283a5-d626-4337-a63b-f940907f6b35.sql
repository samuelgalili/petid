-- Add activity status columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT false;

-- Create index for online status queries
CREATE INDEX IF NOT EXISTS idx_profiles_is_online ON public.profiles(is_online);

-- Create function to update last_seen_at
CREATE OR REPLACE FUNCTION public.update_user_activity()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.profiles 
  SET last_seen_at = now(), is_online = true
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;