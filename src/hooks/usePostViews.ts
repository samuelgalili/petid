import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export const usePostViews = (postId: string | undefined) => {
  const { user } = useAuth();

  useEffect(() => {
    if (!postId) return;

    const trackView = async () => {
      try {
        await supabase.rpc('increment_post_views', {
          post_id_param: postId,
          viewer_id_param: user?.id || null
        });
      } catch (error) {
        // Silently fail - views tracking shouldn't block UX
        console.log("View tracking skipped");
      }
    };

    // Track view after a short delay to ensure real viewing
    const timer = setTimeout(trackView, 2000);
    return () => clearTimeout(timer);
  }, [postId, user?.id]);
};
