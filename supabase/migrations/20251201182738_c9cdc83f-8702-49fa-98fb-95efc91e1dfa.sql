-- Enable pg_net extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Drop existing functions and triggers if they exist
DROP TRIGGER IF EXISTS post_like_notification ON public.post_likes;
DROP TRIGGER IF EXISTS post_comment_notification ON public.post_comments;
DROP FUNCTION IF EXISTS public.notify_post_like();
DROP FUNCTION IF EXISTS public.notify_post_comment();
DROP FUNCTION IF EXISTS public.send_post_notification(UUID, TEXT, TEXT, TEXT, TEXT);

-- Create improved function to send push notification
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
  v_request_id BIGINT;
BEGIN
  -- Get Supabase URL from environment
  -- Call the edge function using pg_net
  SELECT extensions.http_post(
    url := current_setting('app.supabase_url', true) || '/functions/v1/send-push-notification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.service_role_key', true)
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
  ) INTO v_request_id;
  
  RAISE LOG 'Queued push notification request: %', v_request_id;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't block the main operation
    RAISE WARNING 'Failed to queue push notification: %', SQLERRM;
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

-- Create triggers
CREATE TRIGGER post_like_notification
  AFTER INSERT ON public.post_likes
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_post_like();

CREATE TRIGGER post_comment_notification
  AFTER INSERT ON public.post_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_post_comment();