-- Fix function search_path for security
CREATE OR REPLACE FUNCTION public.update_stream_viewer_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.live_streams 
    SET viewer_count = (
      SELECT COUNT(*) FROM public.live_stream_viewers 
      WHERE stream_id = NEW.stream_id AND is_active = true
    ),
    peak_viewers = GREATEST(
      peak_viewers,
      (SELECT COUNT(*) FROM public.live_stream_viewers 
       WHERE stream_id = NEW.stream_id AND is_active = true)
    )
    WHERE id = NEW.stream_id;
  ELSIF TG_OP = 'UPDATE' THEN
    UPDATE public.live_streams 
    SET viewer_count = (
      SELECT COUNT(*) FROM public.live_stream_viewers 
      WHERE stream_id = NEW.stream_id AND is_active = true
    )
    WHERE id = NEW.stream_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;