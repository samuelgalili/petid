import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Heart, MessageCircle, Share2, User } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { haptic } from "@/lib/haptics";

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

const formatCount = (count: number): string => {
  if (!count) return '0';
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}k`;
  return count.toString();
};

const sidebarStagger = {
  hidden: { opacity: 0, x: 20 },
  visible: (i: number) => ({
    opacity: 1, x: 0,
    transition: { delay: 0.2 + i * 0.07, duration: 0.3, ease: [0.25, 0.1, 0.25, 1] as const },
  }),
};

export const SuggestedPostCard = ({ post, onFollow }: SuggestedPostCardProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isFollowing, setIsFollowing] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(post.likes_count);

  const handleFollow = async () => {
    if (!user) { toast.error("יש להתחבר כדי לעקוב"); return; }
    try {
      await supabase.from("user_follows").insert({ follower_id: user.id, following_id: post.user_id });
      setIsFollowing(true);
      onFollow?.(post.user_id);
      toast.success(`עכשיו אתה עוקב אחרי ${post.user.full_name}`);
    } catch (error) { console.error("Error following user:", error); }
  };

  const handleLike = async () => {
    if (!user) { toast.error("יש להתחבר כדי לאהוב"); return; }
    haptic("light");
    if (isLiked) {
      await supabase.from("post_likes").delete().eq("post_id", post.id).eq("user_id", user.id);
      setIsLiked(false); setLikesCount(prev => prev - 1);
    } else {
      await supabase.from("post_likes").insert({ post_id: post.id, user_id: user.id });
      setIsLiked(true); setLikesCount(prev => prev + 1);
    }
  };

  const handleShare = async () => {
    haptic("light");
    const url = `${window.location.origin}/post/${post.id}`;
    if (navigator.share) {
      try { await navigator.share({ title: post.caption, url }); } catch { /* cancelled */ }
    } else { navigator.clipboard.writeText(url); toast.success("הקישור הועתק"); }
  };

  return (
    <article className="relative w-full aspect-[9/16] max-w-[calc((100vh-180px)*9/16)] mx-auto rounded-2xl overflow-hidden my-1">
      {/* Full-bleed image */}
      <div className="absolute inset-0 bg-black">
        <img src={post.image_url} alt={post.caption} className="w-full h-full object-cover" />
      </div>

      {/* Gradients */}
      <div className="absolute inset-x-0 bottom-0 h-[45%] bg-gradient-to-t from-black/70 via-black/30 to-transparent pointer-events-none z-[5]" />
      <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-black/30 to-transparent pointer-events-none z-[5]" />

      {/* "Suggested" badge top-left */}
      <div className="absolute top-3 left-3 z-10">
        <span className="bg-white/20 backdrop-blur-md rounded-full px-3 py-1 text-white text-[12px] font-medium">מומלץ עבורך</span>
      </div>

      {/* RIGHT SIDEBAR — Vertically centered */}
      <motion.div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col items-center gap-6 z-10" initial="hidden" animate="visible">
        {/* Profile Avatar */}
        <motion.button custom={0} variants={sidebarStagger} whileTap={{ scale: 0.9 }} onClick={() => navigate(`/user/${post.user_id}`)} className="relative mb-1">
          <div className="w-12 h-12 rounded-full border-2 border-white overflow-hidden shadow-lg">
            {post.user.avatar_url ? (
              <img src={post.user.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-neutral-700"><User className="w-5 h-5 text-white/70" /></div>
            )}
          </div>
          {!isFollowing && (
            <button onClick={(e) => { e.stopPropagation(); handleFollow(); }} className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full flex items-center justify-center text-white text-[10px] font-bold shadow-lg" style={{ backgroundColor: '#FF8C42' }}>+</button>
          )}
        </motion.button>

        {/* Like */}
        <motion.button custom={1} variants={sidebarStagger} whileTap={{ scale: 0.8 }} onClick={handleLike} className="flex flex-col items-center gap-1">
          <Heart className={`w-8 h-8 drop-shadow-lg ${isLiked ? 'fill-rose-500 text-rose-500' : 'text-white'}`} strokeWidth={1.5} />
          <span className="text-white text-[14px] font-semibold drop-shadow-md tabular-nums">{formatCount(likesCount)}</span>
        </motion.button>

        {/* Comment */}
        <motion.button custom={2} variants={sidebarStagger} whileTap={{ scale: 0.8 }} onClick={() => navigate(`/post/${post.id}`)} className="flex flex-col items-center gap-1">
          <MessageCircle className="w-8 h-8 text-white drop-shadow-lg" strokeWidth={1.5} />
          <span className="text-white text-[14px] font-semibold drop-shadow-md tabular-nums">{formatCount(post.comments_count)}</span>
        </motion.button>

        {/* Share */}
        <motion.button custom={3} variants={sidebarStagger} whileTap={{ scale: 0.8 }} onClick={handleShare} className="flex flex-col items-center gap-1">
          <Share2 className="w-8 h-8 text-white drop-shadow-lg" strokeWidth={1.5} />
          <span className="text-white text-[14px] font-semibold drop-shadow-md">שתף</span>
        </motion.button>

        {/* CTA */}
        <motion.button custom={4} variants={sidebarStagger} whileTap={{ scale: 0.9 }} onClick={() => navigate(`/post/${post.id}`)} className="relative rounded-xl w-16 h-11 flex items-center justify-center shadow-xl" style={{ backgroundColor: '#FF8C42' }}>
          <motion.div className="absolute inset-0 rounded-xl" style={{ backgroundColor: '#FF8C42' }} animate={{ scale: [1, 1.15, 1], opacity: [0.6, 0, 0.6] }} transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }} />
          <span className="text-white text-[11px] font-bold relative z-10">פרטים</span>
        </motion.button>
      </motion.div>

      {/* BOTTOM-LEFT INFO */}
      <div className="absolute bottom-7 left-4 right-20 z-10 text-white" dir="rtl">
        <p className="font-semibold text-[18px] drop-shadow-md mb-1">@{post.user.full_name}</p>
        {post.caption && <p className="text-[16px] leading-snug line-clamp-2 drop-shadow-sm">{post.caption}</p>}
      </div>
    </article>
  );
};
