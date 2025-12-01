-- Create function to notify story owner when someone views their story
CREATE OR REPLACE FUNCTION notify_story_view()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  story_owner_id UUID;
  viewer_name TEXT;
BEGIN
  -- Get the story owner's ID
  SELECT user_id INTO story_owner_id
  FROM stories
  WHERE id = NEW.story_id;

  -- Don't notify if the owner is viewing their own story
  IF story_owner_id = NEW.viewer_id THEN
    RETURN NEW;
  END IF;

  -- Get the viewer's name
  SELECT full_name INTO viewer_name
  FROM profiles
  WHERE id = NEW.viewer_id;

  -- Create notification for story owner
  INSERT INTO notifications (
    user_id,
    title,
    message,
    type
  ) VALUES (
    story_owner_id,
    'צפייה בסטורי',
    viewer_name || ' צפה בסטורי שלך',
    'story_view'
  );

  RETURN NEW;
END;
$$;

-- Create trigger for story views
DROP TRIGGER IF EXISTS on_story_view_created ON story_views;

CREATE TRIGGER on_story_view_created
  AFTER INSERT ON story_views
  FOR EACH ROW
  EXECUTE FUNCTION notify_story_view();

-- Enable realtime for notifications table
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;