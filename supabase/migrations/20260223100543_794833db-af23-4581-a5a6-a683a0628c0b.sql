
-- Walk sessions for tracking active walks and sharing location with friends
CREATE TABLE public.walk_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  pet_id UUID REFERENCES public.pets(id),
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ended_at TIMESTAMP WITH TIME ZONE,
  distance_meters NUMERIC DEFAULT 0,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  is_active BOOLEAN NOT NULL DEFAULT true,
  points_earned INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.walk_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own walks"
  ON public.walk_sessions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Friends can see active walks of users they follow
CREATE POLICY "Friends can see active walks"
  ON public.walk_sessions FOR SELECT
  USING (
    is_active = true
    AND EXISTS (
      SELECT 1 FROM public.close_friends
      WHERE close_friends.user_id = auth.uid()
      AND close_friends.friend_id = walk_sessions.user_id
    )
  );

-- Enable realtime for walk sessions
ALTER PUBLICATION supabase_realtime ADD TABLE public.walk_sessions;
