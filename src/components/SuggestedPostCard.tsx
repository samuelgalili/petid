import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Heart, MessageCircle, Send, Bookmark, MoreVertical } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface SuggestedPost {
  id: string;
  user_id: string;
  image_url: string;
  caption: string;
  created_at: string;
  user: {
    id: string;
    full_name: string;
    avatar_url: string;
  };
  likes_count: number;
  comments_count: number;
}

interface SuggestedPostCardProps {
  post: SuggestedPost;
  onFollow?: (userId: string) => void;
}

export const SuggestedPostCard = ({ post, onFollow }: SuggestedPostCardProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isFollowing, setIsFollowing] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [likesCount, setLikesCount] = useState(post.likes_count);

  const handleFollow = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      toast.error("יש להתחבר כדי לעקוב");
      return;
    }

    try {
      await supabase.from("user_follows").insert({
        follower_id: user.id,
        following_id: post.user_id,
      });
      setIsFollowing(true);
      onFollow?.(post.user_id);
      toast.success(`עכשיו אתה עוקב אחרי ${post.user.full_name}`);
    } catch (error) {
      console.error("Error following user:", error);
    }
  };

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      toast.error("יש להתחבר כדי לאהוב");
      return;
    }

    if (isLiked) {
      await supabase.from("post_likes").delete().eq("post_id", post.id).eq("user_id", user.id);
      setIsLiked(false);
      setLikesCount(prev => prev - 1);
    } else {
      await supabase.from("post_likes").insert({ post_id: post.id, user_id: user.id });
      setIsLiked(true);
      setLikesCount(prev => prev + 1);
    }
  };

  return (
    <article className="bg-white">
      {/* Header - Instagram style */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            className="cursor-pointer focus:outline-none"
            onClick={() => navigate(`/user/${post.user_id}`)}
          >
            <Avatar className="w-8 h-8 ring-[1.5px] ring-rose-500 ring-offset-[1.5px] ring-offset-white">
              <AvatarImage src={post.user.avatar_url} className="object-cover" />
              <AvatarFallback className="bg-neutral-100 text-neutral-800 text-xs font-medium">
                {post.user.full_name?.charAt(0) || "U"}
              </AvatarFallback>
            </Avatar>
          </button>
          <div>
            <div className="flex items-center gap-2">
              <button 
                className="font-semibold text-neutral-900 text-[14px] focus:outline-none"
                onClick={() => navigate(`/user/${post.user_id}`)}
              >
                {post.user.full_name}
              </button>
              {!isFollowing && (
                <button
                  onClick={handleFollow}
                  className="text-[13px] font-bold text-[#0095F6] active:opacity-60 transition-opacity"
                >
                  • עקוב
                </button>
              )}
            </div>
            <p className="text-[11px] text-neutral-400">מומלץ עבורך</p>
          </div>
        </div>
        <button className="text-neutral-900 p-1 -m-1 focus:outline-none">
          <MoreVertical className="w-6 h-6" strokeWidth={1.25} />
        </button>
      </div>

      {/* Image - Instagram style square */}
      <button 
        className="relative aspect-square w-full cursor-pointer focus:outline-none"
        onClick={() => navigate(`/post/${post.id}`)}
      >
        <img
          src={post.image_url}
          alt={post.caption}
          className="w-full h-full object-cover"
        />
      </button>

      {/* Actions - Instagram style */}
      <div className="px-4 pt-3">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-4">
            <button
              onClick={handleLike}
              className="p-0.5 active:opacity-50 transition-opacity focus:outline-none"
            >
              <Heart className={`w-7 h-7 ${isLiked ? 'fill-[#ED4956] text-[#ED4956]' : 'text-neutral-900'}`} strokeWidth={1.25} />
            </button>
            <button className="p-0.5 active:opacity-50 transition-opacity focus:outline-none" onClick={() => navigate(`/post/${post.id}`)}>
              <MessageCircle className="w-7 h-7 text-neutral-900" strokeWidth={1.25} />
            </button>
            <button className="p-0.5 active:opacity-50 transition-opacity focus:outline-none">
              <Send className="w-7 h-7 text-neutral-900" strokeWidth={1.25} />
            </button>
          </div>
          <button
            onClick={() => setIsSaved(!isSaved)}
            className="p-0.5 active:opacity-50 transition-opacity focus:outline-none"
          >
            <Bookmark className={`w-7 h-7 ${isSaved ? 'fill-neutral-900' : ''} text-neutral-900`} strokeWidth={1.25} />
          </button>
        </div>

        {/* Likes */}
        {likesCount > 0 && (
          <p className="text-[14px] text-neutral-900 font-semibold mb-1.5 tabular-nums">
            {likesCount.toLocaleString('he-IL')} לייקים
          </p>
        )}

        {/* Caption */}
        {post.caption && (
          <p className="text-neutral-900 text-[14px] leading-[1.35] mb-1.5">
            <button 
              className="font-bold cursor-pointer focus:outline-none ml-1"
              onClick={() => navigate(`/user/${post.user_id}`)}
            >
              {post.user.full_name}
            </button>
            {post.caption}
          </p>
        )}

        {/* Comments */}
        {post.comments_count > 0 && (
          <button 
            className="text-neutral-400 text-[14px] mb-2 focus:outline-none"
            onClick={() => navigate(`/post/${post.id}`)}
          >
            הצג את כל {post.comments_count} התגובות
          </button>
        )}
      </div>

      {/* Post Divider */}
      <div className="h-[1px] bg-neutral-100 mt-2" />
    </article>
  );
};
