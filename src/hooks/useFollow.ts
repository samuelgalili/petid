import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export const useFollow = (targetUserId: string) => {
  const { user } = useAuth();
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !targetUserId || user.id === targetUserId) {
      setLoading(false);
      return;
    }

    checkFollowStatus();
  }, [user, targetUserId]);

  const checkFollowStatus = async () => {
    if (!user) return;

    try {
      const { data } = await supabase
        .from("user_follows")
        .select("id")
        .eq("follower_id", user.id)
        .eq("following_id", targetUserId)
        .maybeSingle();

      setIsFollowing(!!data);
    } catch (error) {
      console.error("Error checking follow status:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleFollow = async () => {
    if (!user) {
      toast.error("יש להתחבר כדי לעקוב אחרי משתמשים");
      return;
    }

    if (user.id === targetUserId) {
      return;
    }

    try {
      if (isFollowing) {
        // Unfollow
        await supabase
          .from("user_follows")
          .delete()
          .eq("follower_id", user.id)
          .eq("following_id", targetUserId);

        setIsFollowing(false);
        toast.success("הפסקת לעקוב");
      } else {
        // Follow
        await supabase
          .from("user_follows")
          .insert({
            follower_id: user.id,
            following_id: targetUserId,
          });

        setIsFollowing(true);
        toast.success("עכשיו אתה עוקב");
      }
    } catch (error: any) {
      console.error("Error toggling follow:", error);
      toast.error("שגיאה בעדכון המעקב");
    }
  };

  return {
    isFollowing,
    loading,
    toggleFollow,
  };
};
