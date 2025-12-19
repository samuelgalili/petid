import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Heart, MessageCircle, UserPlus, Sparkles } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
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
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl overflow-hidden shadow-lg border border-gray-100 mx-4 mb-4"
    >
      {/* Suggested Label */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-gradient-to-r from-purple-50 to-pink-50">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-purple-500" />
          <span className="text-xs text-purple-600 font-semibold">מומלץ עבורך</span>
        </div>
      </div>

      {/* User Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <div 
          className="flex items-center gap-3 cursor-pointer"
          onClick={() => navigate(`/user/${post.user_id}`)}
        >
          <Avatar className="w-10 h-10 ring-2 ring-purple-100">
            <AvatarImage src={post.user.avatar_url} alt={post.user.full_name} />
            <AvatarFallback className="bg-gradient-to-br from-purple-400 to-pink-400 text-white">
              {post.user.full_name?.charAt(0) || "U"}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-semibold text-sm text-gray-900">{post.user.full_name}</p>
            <p className="text-xs text-gray-500">משתמש חדש</p>
          </div>
        </div>
        
        {!isFollowing && (
          <Button
            onClick={handleFollow}
            size="sm"
            className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white text-xs px-4 py-1.5 rounded-full"
          >
            <UserPlus className="w-3.5 h-3.5 ml-1" />
            עקוב
          </Button>
        )}
      </div>

      {/* Image */}
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

      {/* Actions */}
      <div className="px-4 py-3">
        <div className="flex items-center gap-4 mb-2">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={handleLike}
            className="flex items-center gap-1.5"
          >
            <Heart 
              className={`w-6 h-6 transition-colors ${isLiked ? 'fill-red-500 text-red-500' : 'text-gray-700'}`} 
            />
            <span className="text-sm font-medium">{likesCount}</span>
          </motion.button>
          <button 
            className="flex items-center gap-1.5"
            onClick={() => navigate(`/post/${post.id}`)}
          >
            <MessageCircle className="w-6 h-6 text-gray-700" />
            <span className="text-sm font-medium">{post.comments_count}</span>
          </button>
        </div>
        
        {post.caption && (
          <p className="text-sm text-gray-800 line-clamp-2">
            <span className="font-semibold">{post.user.full_name}</span>{" "}
            {post.caption}
          </p>
        )}
      </div>
    </motion.div>
  );
};
