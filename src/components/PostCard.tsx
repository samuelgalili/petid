import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, Share2, Bookmark, MoreVertical, Flag, ShoppingBag, Link2, EyeOff, Heart, Send } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useFollow } from "@/hooks/useFollow";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { ReportDialog } from "@/components/ReportDialog";
import { ProductTagOverlay } from "@/components/post/ProductTagOverlay";
import { HeartBurstAnimation } from "@/components/post/HeartBurstAnimation";
import { ImageCarousel } from "@/components/post/ImageCarousel";
import { CommentsPreview } from "@/components/post/CommentsPreview";
import { supabase } from "@/integrations/supabase/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";


interface ProductTag {
  id: string;
  product_id: string;
  position_x: number;
  position_y: number;
  product?: {
    id: string;
    name: string;
    price: number;
    image_url: string;
    business_id: string;
  };
}

interface PostCardProps {
  post: {
    id: string;
    user_id: string;
    image_url: string;
    media_urls?: string[];
    caption: string;
    created_at: string;
    user: {
      id: string;
      full_name: string;
      avatar_url: string;
    };
    likes_count: number;
    comments_count: number;
    is_liked: boolean;
    is_saved: boolean;
    product_tags?: ProductTag[];
  };
  currentUserId?: string;
  currentUserAvatar?: string;
  onLike: (postId: string) => void;
  onSave: (postId: string) => void;
  onDoubleTap: (postId: string) => void;
  onComment?: (postId: string, comment: string) => void;
  showDoubleTapAnimation: boolean;
  getTimeAgo: (dateString: string) => string;
}

export const PostCard = ({
  post,
  currentUserId,
  currentUserAvatar,
  onLike,
  onSave,
  onDoubleTap,
  onComment,
  showDoubleTapAnimation,
  getTimeAgo,
}: PostCardProps) => {
  const navigate = useNavigate();
  const { isFollowing, toggleFollow } = useFollow(post.user_id);
  const { checkAuth, isAuthenticated } = useRequireAuth();
  const [isLicking, setIsLicking] = useState(false);
  const [isSaveAnimating, setIsSaveAnimating] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [showProductTags, setShowProductTags] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [activeChallenge, setActiveChallenge] = useState<{
    id: string;
    title_he: string;
    hashtag: string;
    participant_count: number;
  } | null>(null);
  const [showChallengeCTA, setShowChallengeCTA] = useState(false);

  // Get all images (support both single and multi-image posts)
  const allImages = post.media_urls?.length 
    ? post.media_urls 
    : [post.image_url].filter(Boolean);

  // Check if post caption contains a challenge hashtag
  useEffect(() => {
    const checkForChallenge = async () => {
      if (!post.caption) return;
      
      const hashtagMatches = post.caption.match(/#[\u0590-\u05FFa-zA-Z0-9_]+/g);
      if (!hashtagMatches || hashtagMatches.length === 0) return;
      
      const hashtags = hashtagMatches.map(h => h.replace('#', ''));
      
      const { data: challenges } = await supabase
        .from("challenges")
        .select("id, title_he, hashtag, participant_count")
        .eq("is_active", true)
        .in("hashtag", hashtags)
        .limit(1);
      
      if (challenges && challenges.length > 0) {
        setActiveChallenge(challenges[0]);
        setShowChallengeCTA(true);
      }
    };
    
    checkForChallenge();
  }, [post.caption]);

  const handleComment = () => {
    if (!checkAuth("כדי להגיב על פוסטים, יש להתחבר")) return;
    if (commentText.trim() && onComment) {
      onComment(post.id, commentText.trim());
      setCommentText("");
    }
  };

  // Enhanced lick sound with better quality
  const playLickSound = () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      const oscillator1 = audioContext.createOscillator();
      const oscillator2 = audioContext.createOscillator();
      const oscillator3 = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      const filter = audioContext.createBiquadFilter();
      
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1000, audioContext.currentTime);
      filter.frequency.exponentialRampToValueAtTime(2500, audioContext.currentTime + 0.08);
      filter.frequency.exponentialRampToValueAtTime(500, audioContext.currentTime + 0.2);
      
      oscillator1.connect(filter);
      oscillator2.connect(filter);
      oscillator3.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator1.type = 'sine';
      oscillator1.frequency.setValueAtTime(400, audioContext.currentTime);
      oscillator1.frequency.exponentialRampToValueAtTime(800, audioContext.currentTime + 0.06);
      oscillator1.frequency.exponentialRampToValueAtTime(250, audioContext.currentTime + 0.15);
      
      oscillator2.type = 'triangle';
      oscillator2.frequency.setValueAtTime(200, audioContext.currentTime);
      oscillator2.frequency.exponentialRampToValueAtTime(500, audioContext.currentTime + 0.1);
      
      oscillator3.type = 'sawtooth';
      oscillator3.frequency.setValueAtTime(100, audioContext.currentTime);
      oscillator3.frequency.exponentialRampToValueAtTime(300, audioContext.currentTime + 0.05);
      
      gainNode.gain.setValueAtTime(0, audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.12, audioContext.currentTime + 0.02);
      gainNode.gain.linearRampToValueAtTime(0.08, audioContext.currentTime + 0.1);
      gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.2);
      
      oscillator1.start(audioContext.currentTime);
      oscillator2.start(audioContext.currentTime);
      oscillator3.start(audioContext.currentTime);
      oscillator1.stop(audioContext.currentTime + 0.2);
      oscillator2.stop(audioContext.currentTime + 0.2);
      oscillator3.stop(audioContext.currentTime + 0.2);
    } catch (error) {
      console.log('Could not play lick sound:', error);
    }
  };

  const handleLike = () => {
    if (!checkAuth("כדי לסמן לייק, יש להתחבר")) return;
    setIsLicking(true);
    if (!post.is_liked) playLickSound();
    onLike(post.id);
    setTimeout(() => setIsLicking(false), 600);
  };

  const handleDoubleTap = () => {
    if (!checkAuth("כדי לסמן לייק, יש להתחבר")) return;
    setIsLicking(true);
    if (!post.is_liked) playLickSound();
    onDoubleTap(post.id);
    setTimeout(() => setIsLicking(false), 600);
  };

  const handleSave = () => {
    if (!checkAuth("כדי לשמור פוסטים, יש להתחבר")) return;
    setIsSaveAnimating(true);
    onSave(post.id);
    setTimeout(() => setIsSaveAnimating(false), 600);
  };

  const handleFollow = () => {
    if (!checkAuth("כדי לעקוב אחרי משתמשים, יש להתחבר")) return;
    toggleFollow();
  };

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/post/${post.id}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'PetID Post',
          text: post.caption || 'צפה בפוסט הזה!',
          url: shareUrl,
        });
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          navigator.clipboard.writeText(shareUrl);
          toast.success("הקישור הועתק");
        }
      }
    } else {
      navigator.clipboard.writeText(shareUrl);
      toast.success("הקישור הועתק");
    }
  };

  return (
    <motion.div 
      className="bg-white border-b border-[#DBDBDB]"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Post Header - Instagram style */}
      <div className="flex items-center justify-between px-3 py-2">
        <div className="flex items-center gap-2.5">
          <motion.div 
            className="cursor-pointer"
            onClick={() => navigate(`/user/${post.user.id}`)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Avatar className="w-8 h-8 ring-2 ring-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 ring-offset-2">
              <AvatarImage src={post.user.avatar_url} />
              <AvatarFallback className="bg-gray-100 text-[#262626] text-xs">
                {post.user.full_name?.charAt(0) || "U"}
              </AvatarFallback>
            </Avatar>
          </motion.div>
          <div 
            className="cursor-pointer"
            onClick={() => navigate(`/user/${post.user.id}`)}
          >
            <p className="font-semibold text-[#262626] text-sm leading-tight hover:underline">{post.user.full_name || "משתמש"}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {currentUserId !== post.user_id && !isFollowing && (
            <motion.button
              className="text-sm font-semibold text-[#0095F6]"
              onClick={(e) => {
                e.stopPropagation();
                handleFollow();
              }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              עקוב
            </motion.button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="text-[#262626]">
                <MoreVertical className="w-5 h-5" strokeWidth={1.5} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-white z-50 border-[#DBDBDB]">
              <DropdownMenuItem
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/post/${post.id}`);
                  toast.success("הקישור הועתק");
                }}
                className="text-[#262626]"
              >
                <Link2 className="w-4 h-4 ml-2" />
                העתק קישור
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  toast.success("הפוסט הוסתר");
                }}
                className="text-[#262626]"
              >
                <EyeOff className="w-4 h-4 ml-2" />
                הסתר פוסט
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  if (checkAuth("כדי לדווח, יש להתחבר")) {
                    setShowReportDialog(true);
                  }
                }}
                className="text-[#ED4956] focus:text-[#ED4956]"
              >
                <Flag className="w-4 h-4 ml-2" />
                דווח
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Post Image with Carousel Support */}
      <ImageCarousel
        images={allImages}
        alt={post.caption || "פוסט"}
        onDoubleClick={handleDoubleTap}
      >
        {/* Heart Burst Animation */}
        <HeartBurstAnimation isVisible={showDoubleTapAnimation} />

        {/* Product Tags Overlay */}
        {post.product_tags && post.product_tags.length > 0 && (
          <ProductTagOverlay 
            tags={post.product_tags}
            showTags={showProductTags}
            onToggleTags={() => setShowProductTags(!showProductTags)}
          />
        )}
      </ImageCarousel>

      {/* Post Actions */}
      <div className="px-3 pt-2">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-4">
            <motion.button 
              onClick={handleLike}
              className="p-1"
              whileTap={{ scale: 0.8 }}
              animate={isLicking ? { scale: [1, 1.2, 1] } : {}}
              transition={{ duration: 0.3 }}
            >
              <Heart 
                className={`w-6 h-6 transition-colors duration-200 ${
                  post.is_liked 
                    ? 'text-[#ED4956] fill-[#ED4956]' 
                    : 'text-[#262626] hover:text-[#8E8E8E]'
                }`} 
                strokeWidth={1.5}
              />
            </motion.button>
            
            <motion.button 
              className="text-[#262626] p-1"
              onClick={() => navigate(`/post/${post.id}`)}
              whileTap={{ scale: 0.9 }}
            >
              <MessageCircle className="w-6 h-6 hover:text-[#8E8E8E] transition-colors" strokeWidth={1.5} />
            </motion.button>
            
            <motion.button 
              className="text-[#262626] p-1"
              onClick={handleShare}
              whileTap={{ scale: 0.9 }}
            >
              <Send className="w-6 h-6 hover:text-[#8E8E8E] transition-colors" strokeWidth={1.5} />
            </motion.button>
          </div>
          <motion.button 
            onClick={handleSave}
            className="text-[#262626] p-1 relative"
            whileTap={{ scale: 0.8 }}
            animate={isSaveAnimating ? { scale: [1, 1.3, 1] } : {}}
          >
            <Bookmark 
              className={`w-6 h-6 transition-all duration-200 ${
                post.is_saved 
                  ? 'fill-[#262626]' 
                  : 'hover:text-[#8E8E8E]'
              }`} 
              strokeWidth={1.5} 
            />
          </motion.button>
        </div>

        {/* Likes count with animation */}
        <AnimatePresence mode="wait">
          {post.likes_count > 0 && (
            <motion.p 
              key={post.likes_count}
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 5 }}
              className="text-sm text-[#262626] font-semibold mb-1"
            >
              {post.likes_count.toLocaleString()} לייקים
            </motion.p>
          )}
        </AnimatePresence>

        {/* Post Caption */}
        {post.caption && (
          <p className="text-[#262626] text-sm leading-[18px] mb-1">
            <span
              className="font-semibold cursor-pointer hover:underline"
              onClick={() => navigate(`/user/${post.user.id}`)}
            >
              {post.user.full_name || "משתמש"}
            </span>{" "}
            {post.caption}
          </p>
        )}

        {/* Comments Preview */}
        <CommentsPreview 
          postId={post.id} 
          totalComments={post.comments_count} 
        />

        {/* Time ago */}
        <p className="text-[#8E8E8E] text-[10px] uppercase mt-1.5 mb-2">
          {getTimeAgo(post.created_at)}
        </p>
      </div>

      {/* Add comment section */}
      <div className="flex items-center gap-3 px-3 py-2.5 border-t border-[#EFEFEF]">
        <Avatar className="w-6 h-6 flex-shrink-0">
          <AvatarImage src={currentUserAvatar} />
          <AvatarFallback className="bg-gray-100 text-[#262626] text-[10px]">
            U
          </AvatarFallback>
        </Avatar>
        <input
          type="text"
          placeholder="הוסף תגובה..."
          value={commentText}
          onChange={(e) => setCommentText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleComment()}
          onFocus={() => !isAuthenticated && checkAuth("כדי להגיב על פוסטים, יש להתחבר")}
          className="flex-1 bg-transparent text-sm text-[#262626] placeholder-[#8E8E8E] outline-none"
          readOnly={!isAuthenticated}
        />
        <AnimatePresence>
          {commentText.trim() && (
            <motion.button 
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              onClick={handleComment}
              className="text-[#0095F6] text-sm font-semibold"
            >
              פרסם
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* Report Dialog */}
      <ReportDialog
        open={showReportDialog}
        onOpenChange={setShowReportDialog}
        reportedUserId={post.user_id}
        reportedPostId={post.id}
      />
    </motion.div>
  );
};
