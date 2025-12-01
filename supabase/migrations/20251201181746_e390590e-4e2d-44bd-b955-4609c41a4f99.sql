-- Create function to send push notification via edge function
CREATE OR REPLACE FUNCTION public.send_post_notification(
  p_user_id UUID,
  p_title TEXT,
  p_body TEXT,
  p_post_id TEXT,
  p_icon TEXT DEFAULT '/pwa-192x192.png'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_service_role_key TEXT;
  v_supabase_url TEXT;
BEGIN
  -- Get Supabase URL and service role key from vault or config
  v_supabase_url := current_setting('app.settings.supabase_url', true);
  v_service_role_key := current_setting('app.settings.service_role_key', true);
  
  -- Call the edge function using pg_net
  PERFORM net.http_post(
    url := v_supabase_url || '/functions/v1/send-push-notification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_service_role_key
    ),
    body := jsonb_build_object(
      'user_id', p_user_id,
      'notification', jsonb_build_object(
        'title', p_title,
        'body', p_body,
        'icon', p_icon,
        'badge', '/pwa-192x192.png',
        'data', jsonb_build_object(
          'url', '/post/' || p_post_id,
          'type', 'post_activity'
        ),
        'tag', 'post-' || p_post_id,
        'requireInteraction', false
      )
    )
  );
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't block the main operation
    RAISE WARNING 'Failed to send push notification: %', SQLERRM;
END;
$$;

-- Create trigger function for new likes
CREATE OR REPLACE FUNCTION public.notify_post_like()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_post_owner_id UUID;
  v_liker_name TEXT;
  v_post_id TEXT;
BEGIN
  -- Get post owner and liker info
  SELECT p.user_id, prof.full_name, p.id::text
  INTO v_post_owner_id, v_liker_name, v_post_id
  FROM posts p
  LEFT JOIN profiles prof ON prof.id = NEW.user_id
  WHERE p.id = NEW.post_id;
  
  -- Don't notify if user liked their own post
  IF v_post_owner_id = NEW.user_id THEN
    RETURN NEW;
  END IF;
  
  -- Send notification to post owner
  IF v_post_owner_id IS NOT NULL THEN
    PERFORM public.send_post_notification(
      v_post_owner_id,
      '❤️ לייק חדש!',
      COALESCE(v_liker_name, 'מישהו') || ' אהב/ה את הפוסט שלך',
      v_post_id
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger function for new comments
CREATE OR REPLACE FUNCTION public.notify_post_comment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_post_owner_id UUID;
  v_commenter_name TEXT;
  v_post_id TEXT;
  v_comment_preview TEXT;
BEGIN
  -- Get post owner and commenter info
  SELECT p.user_id, prof.full_name, p.id::text
  INTO v_post_owner_id, v_commenter_name, v_post_id
  FROM posts p
  LEFT JOIN profiles prof ON prof.id = NEW.user_id
  WHERE p.id = NEW.post_id;
  
  -- Don't notify if user commented on their own post
  IF v_post_owner_id = NEW.user_id THEN
    RETURN NEW;
  END IF;
  
  -- Create comment preview (first 50 chars)
  v_comment_preview := LEFT(NEW.comment_text, 50);
  IF LENGTH(NEW.comment_text) > 50 THEN
    v_comment_preview := v_comment_preview || '...';
  END IF;
  
  -- Send notification to post owner
  IF v_post_owner_id IS NOT NULL THEN
    PERFORM public.send_post_notification(
      v_post_owner_id,
      '💬 תגובה חדשה!',
      COALESCE(v_commenter_name, 'מישהו') || ': ' || v_comment_preview,
      v_post_id
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for likes
DROP TRIGGER IF EXISTS post_like_notification ON public.post_likes;
CREATE TRIGGER post_like_notification
  AFTER INSERT ON public.post_likes
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_post_like();

-- Create trigger for comments
DROP TRIGGER IF EXISTS post_comment_notification ON public.post_comments;
CREATE TRIGGER post_comment_notification
  AFTER INSERT ON public.post_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_post_comment();