-- Create park check-ins table
CREATE TABLE public.park_checkins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    park_id UUID NOT NULL REFERENCES public.dog_parks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    pet_id UUID REFERENCES public.pets(id) ON DELETE SET NULL,
    checked_in_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    checked_out_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.park_checkins ENABLE ROW LEVEL SECURITY;

-- Anyone can view active check-ins (public feature)
CREATE POLICY "Anyone can view active check-ins"
ON public.park_checkins
FOR SELECT
USING (true);

-- Users can create their own check-ins
CREATE POLICY "Users can create own check-ins"
ON public.park_checkins
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users can update their own check-ins (for checkout)
CREATE POLICY "Users can update own check-ins"
ON public.park_checkins
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Users can delete their own check-ins
CREATE POLICY "Users can delete own check-ins"
ON public.park_checkins
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX idx_park_checkins_park_id ON public.park_checkins(park_id);
CREATE INDEX idx_park_checkins_user_id ON public.park_checkins(user_id);
CREATE INDEX idx_park_checkins_active ON public.park_checkins(park_id, checked_out_at) WHERE checked_out_at IS NULL;

-- Enable realtime for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.park_checkins;