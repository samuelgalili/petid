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
    <motion.article
      className="bg-white border-b border-[#DBDBDB]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header - Instagram style */}
      <div className="flex items-center justify-between px-3 py-2">
        <div className="flex items-center gap-2.5">
          <div
            className="cursor-pointer"
            onClick={() => navigate(`/user/${post.user_id}`)}
          >
            <Avatar className="w-8 h-8 ring-2 ring-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 ring-offset-2">
              <AvatarImage src={post.user.avatar_url} />
              <AvatarFallback className="bg-gray-100 text-[#262626] text-xs">
                {post.user.full_name?.charAt(0) || "U"}
              </AvatarFallback>
            </Avatar>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p 
                className="font-semibold text-[#262626] text-sm cursor-pointer hover:underline"
                onClick={() => navigate(`/user/${post.user_id}`)}
              >
                {post.user.full_name}
              </p>
              {!isFollowing && (
                <button
                  onClick={handleFollow}
                  className="text-sm font-semibold text-[#0095F6]"
                >
                  • עקוב
                </button>
              )}
            </div>
            <p className="text-[11px] text-[#8E8E8E]">מומלץ עבורך</p>
          </div>
        </div>
        <button className="text-[#262626]">
          <MoreVertical className="w-5 h-5" strokeWidth={1.5} />
        </button>
      </div>

      {/* Image - Instagram style square */}
      <div 
        className="relative aspect-square cursor-pointer"
        onClick={() => navigate(`/post/${post.id}`)}
      >
        <img
          src={post.image_url}
          alt={post.caption}
          className="w-full h-full object-cover"
        />
      </div>

      {/* Actions - Instagram style */}
      <div className="px-3 pt-2">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <motion.button
              onClick={handleLike}
              whileTap={{ scale: 0.8 }}
              className="p-1"
            >
              <Heart className={`w-6 h-6 ${isLiked ? 'fill-[#ED4956] text-[#ED4956]' : 'text-[#262626]'}`} strokeWidth={1.5} />
            </motion.button>
            <button className="p-1" onClick={() => navigate(`/post/${post.id}`)}>
              <MessageCircle className="w-6 h-6 text-[#262626]" strokeWidth={1.5} />
            </button>
            <button className="p-1">
              <Send className="w-6 h-6 text-[#262626]" strokeWidth={1.5} />
            </button>
          </div>
          <motion.button
            onClick={() => setIsSaved(!isSaved)}
            whileTap={{ scale: 0.8 }}
            className="p-1"
          >
            <Bookmark className={`w-6 h-6 ${isSaved ? 'fill-[#262626]' : ''} text-[#262626]`} strokeWidth={1.5} />
          </motion.button>
        </div>

        {/* Likes */}
        {likesCount > 0 && (
          <p className="text-sm text-[#262626] font-semibold mb-1">
            {likesCount.toLocaleString()} לייקים
          </p>
        )}

        {/* Caption */}
        {post.caption && (
          <p className="text-[#262626] text-sm mb-1">
            <span 
              className="font-semibold cursor-pointer hover:underline"
              onClick={() => navigate(`/user/${post.user_id}`)}
            >
              {post.user.full_name}
            </span>{" "}
            {post.caption}
          </p>
        )}

        {/* Comments */}
        {post.comments_count > 0 && (
          <button 
            className="text-[#8E8E8E] text-sm mb-1"
            onClick={() => navigate(`/post/${post.id}`)}
          >
            הצג את כל {post.comments_count} התגובות
          </button>
        )}
      </div>
    </motion.article>
  );
};
