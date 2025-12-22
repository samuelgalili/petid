import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, Share2, Bookmark, MoreVertical, Smile, Flag, ShoppingBag, Trophy, Sparkles, Link2, EyeOff, MinusCircle, Heart } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
import { OptimizedImage } from "@/components/OptimizedImage";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useFollow } from "@/hooks/useFollow";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { ReportDialog } from "@/components/ReportDialog";
import { ProductTagOverlay } from "@/components/post/ProductTagOverlay";
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

  // Check if post caption contains a challenge hashtag
  useEffect(() => {
    const checkForChallenge = async () => {
      if (!post.caption) return;
      
      // Extract hashtags from caption
      const hashtagMatches = post.caption.match(/#[\u0590-\u05FFa-zA-Z0-9_]+/g);
      if (!hashtagMatches || hashtagMatches.length === 0) return;
      
      const hashtags = hashtagMatches.map(h => h.replace('#', ''));
      
      // Check if any hashtag matches an active challenge
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

  // Play lick sound using Web Audio API
  const playLickSound = () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Create a "slurp/lick" sound with multiple oscillators
      const oscillator1 = audioContext.createOscillator();
      const oscillator2 = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      const filter = audioContext.createBiquadFilter();
      
      // Setup filter for wet sound
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(800, audioContext.currentTime);
      filter.frequency.exponentialRampToValueAtTime(2000, audioContext.currentTime + 0.1);
      filter.frequency.exponentialRampToValueAtTime(400, audioContext.currentTime + 0.2);
      
      oscillator1.connect(filter);
      oscillator2.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      // Sweeping frequency for lick effect
      oscillator1.type = 'sine';
      oscillator1.frequency.setValueAtTime(300, audioContext.currentTime);
      oscillator1.frequency.exponentialRampToValueAtTime(600, audioContext.currentTime + 0.08);
      oscillator1.frequency.exponentialRampToValueAtTime(200, audioContext.currentTime + 0.15);
      
      oscillator2.type = 'triangle';
      oscillator2.frequency.setValueAtTime(150, audioContext.currentTime);
      oscillator2.frequency.exponentialRampToValueAtTime(400, audioContext.currentTime + 0.1);
      
      // Volume envelope
      gainNode.gain.setValueAtTime(0, audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.15, audioContext.currentTime + 0.02);
      gainNode.gain.linearRampToValueAtTime(0.1, audioContext.currentTime + 0.1);
      gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.2);
      
      oscillator1.start(audioContext.currentTime);
      oscillator2.start(audioContext.currentTime);
      oscillator1.stop(audioContext.currentTime + 0.2);
      oscillator2.stop(audioContext.currentTime + 0.2);
    } catch (error) {
      console.log('Could not play lick sound:', error);
    }
  };

  const handleLike = () => {
    if (!checkAuth("כדי לסמן לייק, יש להתחבר")) return;
    setIsLicking(true);
    playLickSound();
    onLike(post.id);
    setTimeout(() => setIsLicking(false), 500);
  };

  const handleDoubleTap = () => {
    if (!checkAuth("כדי לסמן לייק, יש להתחבר")) return;
    setIsLicking(true);
    playLickSound();
    onDoubleTap(post.id);
    setTimeout(() => setIsLicking(false), 500);
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

  return (
    <div className="bg-white border-b border-[#DBDBDB]">
      {/* Post Header - Instagram style */}
      <div className="flex items-center justify-between px-3 py-2">
        <div className="flex items-center gap-2.5">
          <div 
            className="cursor-pointer"
            onClick={() => navigate(`/user/${post.user.id}`)}
          >
            <Avatar className="w-8 h-8 ring-1 ring-[#DBDBDB]">
              <AvatarImage src={post.user.avatar_url} />
              <AvatarFallback className="bg-gray-100 text-[#262626] text-xs">
                {post.user.full_name?.charAt(0) || "U"}
              </AvatarFallback>
            </Avatar>
          </div>
          <div 
            className="cursor-pointer"
            onClick={() => navigate(`/user/${post.user.id}`)}
          >
            <p className="font-semibold text-[#262626] text-sm leading-tight">{post.user.full_name || "משתמש"}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {currentUserId !== post.user_id && !isFollowing && (
            <button
              className="text-sm font-semibold text-[#0095F6]"
              onClick={(e) => {
                e.stopPropagation();
                handleFollow();
              }}
            >
              עקוב
            </button>
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

      {/* Post Image */}
      <div 
        className="relative cursor-pointer"
        onDoubleClick={handleDoubleTap}
      >
        <OptimizedImage
          src={post.image_url}
          alt={post.caption || "פוסט"}
          className="w-full aspect-square"
          objectFit="cover"
          sizes="(max-width: 768px) 100vw, 672px"
        />
        
        {/* Double Tap Heart Animation */}
        <AnimatePresence>
          {showDoubleTapAnimation && (
            <motion.div
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0 }}
              className="absolute inset-0 flex items-center justify-center pointer-events-none"
            >
              <Heart className="w-24 h-24 text-white fill-white drop-shadow-lg" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Product Tags Overlay */}
        {post.product_tags && post.product_tags.length > 0 && (
          <ProductTagOverlay 
            tags={post.product_tags}
            showTags={showProductTags}
            onToggleTags={() => setShowProductTags(!showProductTags)}
          />
        )}
      </div>

      {/* Post Actions */}
      <div className="px-3 pt-2">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-4">
            <button 
              onClick={handleLike}
              className="p-1"
            >
              <Heart 
                className={`w-6 h-6 ${post.is_liked ? 'text-[#ED4956] fill-[#ED4956]' : 'text-[#262626]'}`} 
                strokeWidth={1.5}
              />
            </button>
            
            <button 
              className="text-[#262626] p-1"
              onClick={() => navigate(`/post/${post.id}`)}
            >
              <MessageCircle className="w-6 h-6" strokeWidth={1.5} />
            </button>
            
            <button className="text-[#262626] p-1">
              <Share2 className="w-6 h-6" strokeWidth={1.5} />
            </button>
          </div>
          <button 
            onClick={handleSave}
            className="text-[#262626] p-1 relative"
          >
            <Bookmark 
              className={`w-6 h-6 ${post.is_saved ? 'fill-[#262626]' : ''}`} 
              strokeWidth={1.5} 
            />
          </button>
        </div>

        {/* Likes count */}
        {post.likes_count > 0 && (
          <p className="text-sm text-[#262626] font-semibold mb-1">
            {post.likes_count.toLocaleString()} לייקים
          </p>
        )}

        {/* Post Caption */}
        {post.caption && (
          <p className="text-[#262626] text-sm leading-[18px] mb-1">
            <span
              className="font-semibold cursor-pointer"
              onClick={() => navigate(`/user/${post.user.id}`)}
            >
              {post.user.full_name || "משתמש"}
            </span>{" "}
            {post.caption}
          </p>
        )}

        {/* View Comments */}
        {post.comments_count > 0 && (
          <button 
            className="text-[#8E8E8E] text-sm"
            onClick={() => navigate(`/post/${post.id}`)}
          >
            הצג את כל {post.comments_count} התגובות
          </button>
        )}

        {/* Time ago */}
        <p className="text-[#8E8E8E] text-[10px] uppercase mt-1 mb-2">
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
        {commentText.trim() && (
          <button 
            onClick={handleComment}
            className="text-[#0095F6] text-sm font-semibold"
          >
            פרסם
          </button>
        )}
      </div>

      {/* Report Dialog */}
      <ReportDialog
        open={showReportDialog}
        onOpenChange={setShowReportDialog}
        reportedUserId={post.user_id}
        reportedPostId={post.id}
      />
    </div>
  );
};
