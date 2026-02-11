import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface SocialProofLabelProps {
  postId: string;
  userId?: string;
}

/** Shows "חברים שלך אהבו את זה" if friends (people you follow) liked the post */
export const SocialProofLabel = ({ postId, userId }: SocialProofLabelProps) => {
  const [friendNames, setFriendNames] = useState<string[]>([]);

  useEffect(() => {
    if (!userId) return;

    const fetchFriendsWhoLiked = async () => {
      // Get IDs of people the user follows
      const { data: following } = await supabase
        .from("user_follows")
        .select("following_id")
        .eq("follower_id", userId);

      if (!following || following.length === 0) return;

      const followingIds = following.map((f) => f.following_id);

      // Get likes on this post from those people
      const { data: friendLikes } = await supabase
        .from("post_likes")
        .select("user_id")
        .eq("post_id", postId)
        .in("user_id", followingIds)
        .limit(3);

      if (!friendLikes || friendLikes.length === 0) return;

      const friendUserIds = friendLikes.map((l) => l.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("full_name")
        .in("id", friendUserIds);

      if (profiles) {
        setFriendNames(profiles.map((p) => p.full_name || "חבר").slice(0, 2));
      }
    };

    fetchFriendsWhoLiked();
  }, [postId, userId]);

  if (friendNames.length === 0) return null;

  const text =
    friendNames.length === 1
      ? `${friendNames[0]} אהב/ה את זה`
      : `${friendNames[0]} ו-${friendNames[1]} אהבו את זה`;

  return (
    <div
      className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium text-white"
      style={{
        background: "rgba(255,255,255,0.12)",
        backdropFilter: "blur(8px)",
      }}
    >
      <span>❤️</span>
      <span>{text}</span>
    </div>
  );
};
